// TRANSPORT: client-query — POST /assistant/replies (cloud route) and the public search reads;
// on the device route, Chrome's built-in model and no network at all.
"use client";

// THE CONVERSATION, AND WHICH MODEL HOLDS IT.
//
// Mounted by the panel, so nothing here runs (and Chrome is not even asked about its model) until
// the viewer opens the assistant. It owns three things:
//  - what Chrome says about its on-device model, read once on open and polled only while a
//    download that Chrome started elsewhere is still running;
//  - the on-device SESSION, created lazily on the first question, recreated when the viewer's
//    saved notes change or its context window fills, and destroyed on unmount;
//  - the message list, whose assistant entries are a discriminated union rather than a bag of
//    `isStreaming`/`error?`/`reply?` fields (AGENTS.md Pattern 1).
//
// NOTHING IS OPTIMISTIC AND NOTHING IS AUTOMATIC. A reply's destination renders as a link, its
// search runs one public read and says so, and its note is an offer the viewer must accept.

import { useEffect, useRef, useState } from "react";

import {
  selectAssistantBrainState,
  selectAssistantChatRoute,
  type AssistantBrainState,
  type CloudRefusal,
  type OnDeviceModelStatus,
} from "@/components/assistant/assistant-brain-state";
import {
  buildAssistantSystemText,
  buildOnDeviceQuestionText,
} from "@/lib/assistant/assistant-prompt";
import {
  ASSISTANT_HISTORY_TURN_LIMIT,
  ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH,
  type AssistantConversationTurn,
  type AssistantReply,
  type AssistantSearchScope,
} from "@/lib/assistant/assistant-reply.schemas";
import { runAssistantSearch, type AssistantSearchResult } from "@/lib/assistant/assistant-search";
import { requestCloudReply } from "@/lib/assistant/cloud-brain.api";
import type { MascotExpression } from "@/lib/assistant/mascot-expressions";
import {
  createOnDeviceSession,
  promptOnDeviceStreaming,
  readOnDeviceAvailability,
  type OnDeviceSession,
} from "@/lib/assistant/on-device-model";
import { useSession } from "@/lib/auth-client";
import type { ActionResponse } from "@/lib/http";

export type AssistantSearchState =
  | { readonly status: "none" }
  | { readonly status: "loading"; readonly scope: AssistantSearchScope; readonly query: string }
  | {
      readonly status: "done";
      readonly scope: AssistantSearchScope;
      readonly query: string;
      readonly results: readonly AssistantSearchResult[];
    }
  | { readonly status: "failed"; readonly scope: AssistantSearchScope; readonly query: string };

export type AssistantMessage =
  | { readonly messageId: number; readonly role: "user"; readonly text: string }
  | {
      readonly messageId: number;
      readonly role: "assistant";
      readonly status: "pending";
      readonly partialText: string;
    }
  | {
      readonly messageId: number;
      readonly role: "assistant";
      readonly status: "answered";
      readonly reply: AssistantReply;
      readonly answeredBy: "on_device" | "cloud";
      readonly search: AssistantSearchState;
    }
  | {
      readonly messageId: number;
      readonly role: "assistant";
      readonly status: "failed";
      readonly message: string;
    };

const DOWNLOAD_POLL_INTERVAL_MS = 5_000;
/** Long enough to cover a slow cloud answer; a reply's own mood replaces it the moment it lands. */
const THINKING_MOOD_HOLD_MS = 20_000;
const REPLY_MOOD_HOLD_MS = 4_000;
const FAILURE_MOOD_HOLD_MS = 3_000;
/** How many recent turns are replayed into a fresh on-device session after its context fills. */
const ON_DEVICE_REPLAY_TURN_COUNT = 4;

/** The conversation as both brains receive it: answered turns only, newest last, each capped. */
function buildConversationTurns(
  messages: readonly AssistantMessage[],
): AssistantConversationTurn[] {
  const conversationTurns: AssistantConversationTurn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      conversationTurns.push({ role: "user", text: message.text });
    } else if (message.status === "answered") {
      conversationTurns.push({ role: "assistant", text: message.reply.reply });
    }
  }
  return conversationTurns.map((conversationTurn) => ({
    role: conversationTurn.role,
    text: conversationTurn.text.slice(0, ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH),
  }));
}

function describeCloudFailure(errorCode: string): string {
  switch (errorCode) {
    case "429":
      return "You have asked a lot of questions in a short time. Try again in a little while.";
    case "503":
    case "502":
      return "The assistant is unavailable right now. Try again in a minute.";
    case "422":
      return "The assistant could not answer that one. Try asking it another way.";
    case "NETWORK":
      return "Could not reach Qatoto. Check your connection and try again.";
    default:
      return "Something went wrong getting an answer. Try again.";
  }
}

export function useAssistantBrain({
  pathname,
  memoryNotes,
  onMood,
}: {
  readonly pathname: string;
  readonly memoryNotes: readonly string[];
  readonly onMood: (expression: MascotExpression, holdMs: number) => void;
}) {
  const { data: authSession, isPending: isSessionPending } = useSession();
  const isSignedIn = authSession !== null && authSession !== undefined;

  const [onDeviceModelStatus, setOnDeviceModelStatus] = useState<OnDeviceModelStatus>({
    status: "checking",
  });
  // Keyed by the account it was given to, so signing in as someone else clears it by derivation
  // rather than by an effect that resets state.
  const [cloudRefusalRecord, setCloudRefusalRecord] = useState<{
    readonly userId: string | null;
    readonly refusal: CloudRefusal;
  }>({ userId: null, refusal: null });
  const [messages, setMessages] = useState<readonly AssistantMessage[]>([]);
  const [isAwaitingReply, setIsAwaitingReply] = useState(false);

  const sessionRef = useRef<OnDeviceSession | null>(null);
  const sessionNotesKeyRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController>(new AbortController());
  const nextMessageIdRef = useRef(1);

  const signedInUserId = authSession?.user.id ?? null;
  const cloudRefusal =
    cloudRefusalRecord.userId === signedInUserId ? cloudRefusalRecord.refusal : null;
  const brainState: AssistantBrainState = selectAssistantBrainState({
    onDeviceModelStatus,
    isSessionPending,
    isSignedIn,
    cloudRefusal,
  });

  // Ask Chrome once, when the panel opens.
  useEffect(() => {
    let isCancelled = false;
    const readAvailability = async () => {
      const availability = await readOnDeviceAvailability();
      if (isCancelled) return;
      setOnDeviceModelStatus(
        availability === "downloading"
          ? { status: "downloading", progressPercent: null }
          : { status: availability },
      );
    };
    void readAvailability();
    return () => {
      isCancelled = true;
    };
  }, []);

  // A download Chrome is running without our monitor reports no progress; poll until it lands.
  const isDownloadingWithoutProgress =
    onDeviceModelStatus.status === "downloading" && onDeviceModelStatus.progressPercent === null;
  useEffect(() => {
    if (!isDownloadingWithoutProgress) return undefined;
    const pollAvailability = async () => {
      const availability = await readOnDeviceAvailability();
      if (availability === "ready") setOnDeviceModelStatus({ status: "ready" });
    };
    const pollInterval = window.setInterval(() => {
      void pollAvailability();
    }, DOWNLOAD_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(pollInterval);
    };
  }, [isDownloadingWithoutProgress]);

  useEffect(() => {
    const abortController = abortControllerRef.current;
    return () => {
      abortController.abort();
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  /**
   * NO `await` MAY COME BEFORE `createOnDeviceSession`. Chrome only starts the download inside the
   * click that asked for it, and an async function runs synchronously up to its first `await` —
   * so the call below still happens inside the click. An `await` above it would spend that
   * user activation and the download would be refused.
   */
  const downloadOnDeviceModel = async () => {
    setOnDeviceModelStatus({ status: "downloading", progressPercent: 0 });
    const notesKey = memoryNotes.join("\n");
    const sessionResult = await createOnDeviceSession({
      systemText: buildAssistantSystemText({ memoryNotes }),
      priorTurns: [],
      onDownloadProgress: (loadedFraction) => {
        setOnDeviceModelStatus({
          status: "downloading",
          progressPercent: Math.round(Math.min(1, Math.max(0, loadedFraction)) * 100),
        });
      },
      signal: abortControllerRef.current.signal,
    });
    if (!sessionResult.success) {
      setOnDeviceModelStatus({ status: "downloadable" });
      return;
    }
    sessionRef.current?.destroy();
    sessionRef.current = sessionResult.data;
    sessionNotesKeyRef.current = notesKey;
    setOnDeviceModelStatus({ status: "ready" });
  };

  const startOnDeviceDownload = () => {
    void downloadOnDeviceModel();
  };

  const replaceAssistantMessage = (messageId: number, nextMessage: AssistantMessage) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) => (message.messageId === messageId ? nextMessage : message)),
    );
  };

  /** The session for this question: reused, or recreated when the notes changed or it filled up. */
  const ensureOnDeviceSession = async (
    priorTurns: readonly AssistantConversationTurn[],
  ): Promise<ActionResponse<OnDeviceSession>> => {
    const notesKey = memoryNotes.join("\n");
    if (sessionRef.current !== null && sessionNotesKeyRef.current === notesKey) {
      return { success: true, data: sessionRef.current };
    }
    sessionRef.current?.destroy();
    sessionRef.current = null;
    const sessionResult = await createOnDeviceSession({
      systemText: buildAssistantSystemText({ memoryNotes }),
      priorTurns,
      onDownloadProgress: () => {},
      signal: abortControllerRef.current.signal,
    });
    if (sessionResult.success) {
      sessionRef.current = sessionResult.data;
      sessionNotesKeyRef.current = notesKey;
    }
    return sessionResult;
  };

  const askOnDevice = async (
    questionText: string,
    priorTurns: readonly AssistantConversationTurn[],
    pendingMessageId: number,
  ): Promise<ActionResponse<AssistantReply>> => {
    const onPartialReplyText = (partialReplyText: string) => {
      replaceAssistantMessage(pendingMessageId, {
        messageId: pendingMessageId,
        role: "assistant",
        status: "pending",
        partialText: partialReplyText,
      });
    };
    const fullQuestionText = buildOnDeviceQuestionText({ pathname, questionText });

    const sessionResult = await ensureOnDeviceSession(
      priorTurns.slice(-ON_DEVICE_REPLAY_TURN_COUNT),
    );
    if (!sessionResult.success) return sessionResult;
    const firstAttempt = await promptOnDeviceStreaming({
      session: sessionResult.data,
      questionText: fullQuestionText,
      onPartialReplyText,
      signal: abortControllerRef.current.signal,
    });
    if (firstAttempt.success || firstAttempt.error.code !== "context_overflow") return firstAttempt;

    // The context window filled: start over with the instructions and the last few turns.
    sessionRef.current?.destroy();
    sessionRef.current = null;
    const freshSessionResult = await ensureOnDeviceSession(
      priorTurns.slice(-ON_DEVICE_REPLAY_TURN_COUNT),
    );
    if (!freshSessionResult.success) return freshSessionResult;
    return promptOnDeviceStreaming({
      session: freshSessionResult.data,
      questionText: fullQuestionText,
      onPartialReplyText,
      signal: abortControllerRef.current.signal,
    });
  };

  const runReplySearch = async (messageId: number, answeredMessage: AssistantMessage) => {
    if (answeredMessage.role !== "assistant" || answeredMessage.status !== "answered") return;
    const replySearch = answeredMessage.reply.search;
    if (replySearch === null) return;
    const searchResult = await runAssistantSearch(replySearch.scope, replySearch.query);
    replaceAssistantMessage(messageId, {
      ...answeredMessage,
      search: searchResult.success
        ? {
            status: "done",
            scope: replySearch.scope,
            query: replySearch.query,
            results: searchResult.data,
          }
        : { status: "failed", scope: replySearch.scope, query: replySearch.query },
    });
  };

  const sendMessage = async (rawQuestionText: string) => {
    const questionText = rawQuestionText.trim().slice(0, ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH);
    const chatRoute = selectAssistantChatRoute(brainState);
    if (questionText.length === 0 || isAwaitingReply || chatRoute === "none") return;

    const userMessageId = nextMessageIdRef.current;
    const pendingMessageId = userMessageId + 1;
    nextMessageIdRef.current += 2;
    const priorTurns = buildConversationTurns(messages);
    const questionTurn: AssistantConversationTurn = { role: "user", text: questionText };
    setMessages((currentMessages) => [
      ...currentMessages,
      { messageId: userMessageId, role: "user", text: questionText },
      { messageId: pendingMessageId, role: "assistant", status: "pending", partialText: "" },
    ]);
    setIsAwaitingReply(true);
    onMood("thinking", THINKING_MOOD_HOLD_MS);

    const replyResult =
      chatRoute === "on_device"
        ? await askOnDevice(questionText, priorTurns, pendingMessageId)
        : await requestCloudReply({
            messages: [...priorTurns, questionTurn].slice(-ASSISTANT_HISTORY_TURN_LIMIT),
            pathname,
            memoryNotes,
          });

    setIsAwaitingReply(false);
    if (!replyResult.success) {
      if (replyResult.error.code === "aborted") return;
      if (chatRoute === "cloud" && replyResult.error.code === "401") {
        setCloudRefusalRecord({ userId: signedInUserId, refusal: "sign_in_required" });
      }
      if (chatRoute === "cloud" && replyResult.error.code === "403") {
        setCloudRefusalRecord({ userId: signedInUserId, refusal: "finish_sign_up" });
      }
      replaceAssistantMessage(pendingMessageId, {
        messageId: pendingMessageId,
        role: "assistant",
        status: "failed",
        message:
          chatRoute === "cloud"
            ? describeCloudFailure(replyResult.error.code)
            : "The built-in model could not answer that. Try asking again.",
      });
      onMood("embarrassed", FAILURE_MOOD_HOLD_MS);
      return;
    }

    const answeredMessage: AssistantMessage = {
      messageId: pendingMessageId,
      role: "assistant",
      status: "answered",
      reply: replyResult.data,
      answeredBy: chatRoute,
      search:
        replyResult.data.search === null
          ? { status: "none" }
          : {
              status: "loading",
              scope: replyResult.data.search.scope,
              query: replyResult.data.search.query,
            },
    };
    replaceAssistantMessage(pendingMessageId, answeredMessage);
    onMood(replyResult.data.expression, REPLY_MOOD_HOLD_MS);
    await runReplySearch(pendingMessageId, answeredMessage);
  };

  return {
    brainState,
    messages,
    isAwaitingReply,
    sendMessage,
    startOnDeviceDownload,
  };
}
