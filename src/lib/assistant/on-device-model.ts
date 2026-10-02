// TRANSPORT: props-only — talks to Chrome's built-in model in this browser. No network call of its
// own (Chrome downloads the model itself, on a click), no React.
//
// CHROME'S PROMPT API, READ AS UNTRUSTED.
//
// `LanguageModel` is a Chrome global (shipped for web pages in Chrome 138) that runs Gemini Nano on
// the device. Nothing typed it in this repo and it changes between versions — the availability
// strings were renamed once, the usage properties twice — so it is read the way AGENTS.md reads a
// network payload: as `unknown`, narrowed by runtime checks, never cast.
//
// DESKTOP CHROME ONLY (Windows 10+, macOS 13+, Linux, ChromeOS), with about 22 GB free disk and a
// capable GPU or 16 GB of RAM. Everything else — Android, iOS, Safari, Firefox, a laptop that does
// not qualify — reports `unavailable` and the assistant uses the cloud route instead.
//
// THE DOWNLOAD NEEDS A CLICK. `create()` on a `downloadable` model starts a multi-gigabyte download,
// and Chrome requires a user gesture for it. This module never calls `create()` on its own; the
// panel's "Download" button does. Turning AI Assist on downloads nothing.

import { z } from "zod";

import {
  ASSISTANT_REPLY_JSON_SCHEMA,
  AssistantReplySchema,
  type AssistantConversationTurn,
  type AssistantReply,
} from "@/lib/assistant/assistant-reply.schemas";
import type { ActionResponse } from "@/lib/http";

interface LanguageModelApi {
  readonly availability: (options: object) => Promise<unknown>;
  readonly create: (options: object) => Promise<unknown>;
}

export interface OnDeviceSession {
  readonly promptStreaming: (input: string, options: object) => unknown;
  readonly destroy: () => void;
}

function isObjectLike(candidate: unknown): candidate is object {
  return (typeof candidate === "object" && candidate !== null) || typeof candidate === "function";
}

function isLanguageModelApi(candidate: unknown): candidate is LanguageModelApi {
  return (
    isObjectLike(candidate) &&
    "availability" in candidate &&
    typeof candidate.availability === "function" &&
    "create" in candidate &&
    typeof candidate.create === "function"
  );
}

function isOnDeviceSession(candidate: unknown): candidate is OnDeviceSession {
  return (
    isObjectLike(candidate) &&
    "promptStreaming" in candidate &&
    typeof candidate.promptStreaming === "function" &&
    "destroy" in candidate &&
    typeof candidate.destroy === "function"
  );
}

function readLanguageModelApi(): LanguageModelApi | null {
  if (typeof globalThis === "undefined") return null;
  const candidate: unknown = Reflect.get(globalThis, "LanguageModel");
  return isLanguageModelApi(candidate) ? candidate : null;
}

/** English in, English out. Declaring it keeps Chrome from warning and picks the right model. */
const LANGUAGE_OPTIONS = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

/** Both vocabularies Chrome has used, current first. */
const AvailabilitySchema = z.enum([
  "available",
  "downloadable",
  "downloading",
  "unavailable",
  "readily",
  "after-download",
  "no",
]);

export type OnDeviceAvailability = "ready" | "downloadable" | "downloading" | "unavailable";

export async function readOnDeviceAvailability(): Promise<OnDeviceAvailability> {
  const languageModelApi = readLanguageModelApi();
  if (languageModelApi === null) return "unavailable";
  try {
    const rawAvailability: unknown = await languageModelApi.availability(LANGUAGE_OPTIONS);
    const parsedAvailability = AvailabilitySchema.safeParse(rawAvailability);
    if (!parsedAvailability.success) return "unavailable";
    const availability = parsedAvailability.data;
    switch (availability) {
      case "available":
      case "readily":
        return "ready";
      case "downloadable":
      case "after-download":
        return "downloadable";
      case "downloading":
        return "downloading";
      case "unavailable":
      case "no":
        return "unavailable";
      default: {
        const exhaustiveCheck: never = availability;
        return exhaustiveCheck;
      }
    }
  } catch {
    return "unavailable";
  }
}

/**
 * Creates a session primed with the system text. On a `downloadable` model this IS the download,
 * so it must only ever run from a click. `onDownloadProgress` receives 0..1. `priorTurns` replays
 * recent conversation into a fresh session, which is how a full context window is recovered from.
 */
export async function createOnDeviceSession({
  systemText,
  priorTurns,
  onDownloadProgress,
  signal,
}: {
  readonly systemText: string;
  readonly priorTurns: readonly AssistantConversationTurn[];
  readonly onDownloadProgress: (loadedFraction: number) => void;
  readonly signal: AbortSignal;
}): Promise<ActionResponse<OnDeviceSession>> {
  const languageModelApi = readLanguageModelApi();
  if (languageModelApi === null) {
    return {
      success: false,
      error: { code: "unavailable", message: "This browser has no built-in model." },
    };
  }
  try {
    const session: unknown = await languageModelApi.create({
      ...LANGUAGE_OPTIONS,
      initialPrompts: [
        { role: "system", content: systemText },
        ...priorTurns.map((priorTurn) => ({ role: priorTurn.role, content: priorTurn.text })),
      ],
      signal,
      monitor: (downloadMonitor: unknown) => {
        if (!(downloadMonitor instanceof EventTarget)) return;
        downloadMonitor.addEventListener("downloadprogress", (progressEvent) => {
          const loadedFraction: unknown = Reflect.get(progressEvent, "loaded");
          if (typeof loadedFraction === "number") onDownloadProgress(loadedFraction);
        });
      },
    });
    if (!isOnDeviceSession(session)) {
      return {
        success: false,
        error: {
          code: "unavailable",
          message: "The built-in model answered in a shape we do not know.",
        },
      };
    }
    return { success: true, data: session };
  } catch (createError) {
    return {
      success: false,
      error: {
        code:
          createError instanceof DOMException && createError.name === "AbortError"
            ? "aborted"
            : "unavailable",
        message: "The built-in model could not start.",
      },
    };
  }
}

/**
 * The text of the `reply` field so far, from a JSON object that is still streaming in.
 *
 * Constrained decoding writes `reply` last (see `assistant-reply.schemas.ts`), so by the time it
 * starts every other field is complete. This decodes the string's escapes as far as they have
 * arrived and stops at a half-received one, rather than showing a stray backslash.
 */
export function extractStreamingReplyText(partialJson: string): string | null {
  const replyKeyMatch = /"reply"\s*:\s*"/.exec(partialJson);
  if (replyKeyMatch === null) return null;
  let decodedText = "";
  let characterIndex = replyKeyMatch.index + replyKeyMatch[0].length;
  while (characterIndex < partialJson.length) {
    const character = partialJson[characterIndex];
    if (character === '"') break;
    if (character !== "\\") {
      decodedText += character;
      characterIndex += 1;
      continue;
    }
    const escapeCode = partialJson[characterIndex + 1];
    if (escapeCode === undefined) break;
    if (escapeCode === "u") {
      const hexDigits = partialJson.slice(characterIndex + 2, characterIndex + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(hexDigits)) break;
      decodedText += String.fromCharCode(Number.parseInt(hexDigits, 16));
      characterIndex += 6;
      continue;
    }
    const simpleEscapes: Record<string, string> = { n: "\n", t: "\t", r: "", b: "", f: "" };
    decodedText += simpleEscapes[escapeCode] ?? escapeCode;
    characterIndex += 2;
  }
  return decodedText;
}

/**
 * Asks the session one question and streams the reply text as it arrives.
 *
 * Chrome has emitted both cumulative chunks (each one the whole answer so far) and delta chunks
 * (only the new text) across versions; a chunk that starts with everything received so far is read
 * as cumulative, anything else as a delta.
 */
export async function promptOnDeviceStreaming({
  session,
  questionText,
  onPartialReplyText,
  signal,
}: {
  readonly session: OnDeviceSession;
  readonly questionText: string;
  readonly onPartialReplyText: (partialReplyText: string) => void;
  readonly signal: AbortSignal;
}): Promise<ActionResponse<AssistantReply>> {
  let receivedJson = "";
  try {
    const replyStream: unknown = session.promptStreaming(questionText, {
      responseConstraint: ASSISTANT_REPLY_JSON_SCHEMA,
      signal,
    });
    if (!(replyStream instanceof ReadableStream)) {
      return {
        success: false,
        error: { code: "PARSE", message: "The built-in model did not stream a reply." },
      };
    }
    const replyReader = replyStream.getReader();
    for (;;) {
      const readResult = await replyReader.read();
      if (readResult.done) break;
      const chunk: unknown = readResult.value;
      if (typeof chunk !== "string") continue;
      receivedJson = chunk.startsWith(receivedJson) ? chunk : receivedJson + chunk;
      const partialReplyText = extractStreamingReplyText(receivedJson);
      if (partialReplyText !== null) onPartialReplyText(partialReplyText);
    }
  } catch (promptError) {
    const errorName = promptError instanceof DOMException ? promptError.name : "";
    return {
      success: false,
      error: {
        code:
          errorName === "QuotaExceededError"
            ? "context_overflow"
            : errorName === "AbortError"
              ? "aborted"
              : "unavailable",
        message: "The built-in model stopped before it finished answering.",
      },
    };
  }

  let rawReply: unknown;
  try {
    rawReply = JSON.parse(receivedJson);
  } catch {
    return {
      success: false,
      error: { code: "PARSE", message: "The built-in model's answer was not readable." },
    };
  }
  const parsedReply = AssistantReplySchema.safeParse(rawReply);
  if (!parsedReply.success) {
    return {
      success: false,
      error: { code: "PARSE", message: "The built-in model's answer was not readable." },
    };
  }
  return { success: true, data: parsedReply.data };
}
