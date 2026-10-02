// TRANSPORT: client-query — POST /assistant/replies (cloud route) and the public search reads;
// on the device route, Chrome's built-in model and no network at all.
"use client";

// THE ACTIVE CHAT, AND WHICH MODEL HOLDS IT.
//
// Mounted by the panel, so nothing here runs (and Chrome is not even asked about its model) until
// the viewer opens the assistant. It owns:
//  - what Chrome says about its on-device model, read once on open and polled only while a
//    download that Chrome started elsewhere is still running;
//  - the on-device SESSION, one at a time, created lazily on a question and keyed by the chat and
//    the saved notes, so switching chats or editing a note starts a fresh one primed with that
//    chat's last few turns;
//  - the turns that are NOT saved: a question waiting for its answer, a failed one, and an answer
//    this browser refused to store. Saved turns come in as props, from the browser-preferences blob.
//
// A TURN IS SAVED ONLY ONCE IT IS ANSWERED. The question and its answer are written together, as
// one pair, through `onAnsweredPair`; until then they exist only here. That is why a reload can
// never restore a "Thinking…" that nothing will finish.
//
// SEARCHES ARE NOT SAVED; THEY RE-RUN. A saved answer keeps the search it asked for, never the
// results, and the results are fetched again the first time that chat is shown in this panel. Only
// the ACTIVE chat's searches run, so opening the panel with ten saved chats costs at most one
// chat's worth of public reads.
//
// THE ROUTER ANSWERS FIRST. `routeAssistantRequest` (`assistant-router.ts`) is tried before any
// model, synchronously and without the network: "go to my orders" and "find solar pumps" become a
// card at once, are saved at once, and lock no model. Only what it does not understand reaches the
// chat's model, and with no model the viewer is told places and searches still work. That is why
// the composer renders even when no model can answer.
//
// NOTHING IS OPTIMISTIC AND NOTHING IS AUTOMATIC. A reply's destination renders as a link, its
// search runs one public read and says so, and its note is an offer the viewer must accept.

import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  describeRouterOnlyFallback,
  readModelAvailability,
  selectConversationChatState,
  type AssistantModelAvailability,
  type ConversationChatState,
  type NoChatReason,
  type OnDeviceModelStatus,
  type ViewerCloudAccess,
} from "@/components/assistant/assistant-brain-state";
import {
  buildAssistantSystemText,
  buildOnDeviceQuestionText,
} from "@/lib/assistant/assistant-prompt";
import {
  isConversationFull,
  type AssistantConversation,
  type AssistantModelRoute,
  type AssistantPairAnswer,
  type SavedRouterMatch,
} from "@/lib/assistant/assistant-conversation.schemas";
import type { AssistantDestinationKey } from "@/lib/assistant/assistant-destinations";
import {
  ASSISTANT_HISTORY_TURN_LIMIT,
  ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH,
  type AssistantConversationTurn,
  type AssistantReply,
  type AssistantSearchScope,
} from "@/lib/assistant/assistant-reply.schemas";
import { describeRouterMatchForHistory, routeAssistantRequest } from "@/lib/assistant/assistant-router";
import {
  ASSISTANT_SEARCH_SCOPE_LABELS,
  runAssistantSearch,
  type AssistantSearchResult,
} from "@/lib/assistant/assistant-search";
import {
  getAssistantCloudAccess,
  isPremiumRequiredError,
  requestCloudReply,
} from "@/lib/assistant/cloud-brain.api";
import type { MascotExpression } from "@/lib/assistant/mascot-expressions";
import {
  createOnDeviceSession,
  promptOnDeviceStreaming,
  readOnDeviceAvailability,
  type OnDeviceSession,
} from "@/lib/assistant/on-device-model";
import { useSession } from "@/lib/auth-client";
import type { ActionResponse, ApiError } from "@/lib/http";

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

/**
 * Why an answer the viewer can see was not kept. `storage_refused` is the browser's quota or a
 * blocked storage; the other three are another tab having changed the list in the meantime.
 *
 * `storage_refused` IS SHOWN ONCE PER CHAT, NOT PER ANSWER. A refused write still lands in this
 * page's in-memory preferences (`writeStoredBrowserPreferences`), so the pair renders from there
 * like any saved one and only the warning is extra; keeping an unsaved copy too would show the
 * answer twice. The other three wrote nothing, so their answer stays an unsaved entry.
 */
export type AssistantSaveProblem =
  | "storage_refused"
  | "list_full"
  | "conversation_full"
  | "model_mismatch";

/** What `onAnsweredPair` reports back: saved, or the one reason it was not. */
export type AssistantPairSaveStatus = "saved" | AssistantSaveProblem;

export type AssistantMessage =
  | { readonly messageKey: string; readonly role: "user"; readonly text: string }
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "pending";
      readonly partialText: string;
    }
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "answered";
      readonly reply: AssistantReply;
      readonly answeredBy: AssistantModelRoute;
      readonly search: AssistantSearchState;
      /** `null` for a saved answer. */
      readonly saveProblem: AssistantSaveProblem | null;
    }
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "failed";
      readonly message: string;
    }
  /** The router understood it: a place, a search or a choice, with no model involved. */
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "routed";
      readonly routerMatch: SavedRouterMatch;
      /** `null` for a saved answer. */
      readonly saveProblem: AssistantSaveProblem | null;
    }
  /** The router did not understand it and no model can answer here. Never saved. */
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "unrouted";
      readonly message: string;
      readonly nearbyDestinationKeys: readonly AssistantDestinationKey[];
    };

/** A turn held only in this panel. Its search lives in the same keyed map a saved answer's does. */
type UnsavedEntry =
  | { readonly messageKey: string; readonly role: "user"; readonly text: string }
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "pending";
      readonly partialText: string;
    }
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "answered";
      readonly reply: AssistantReply;
      readonly answeredBy: AssistantModelRoute;
      readonly saveProblem: Exclude<AssistantSaveProblem, "storage_refused">;
    }
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "failed";
      readonly message: string;
    }
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "routed";
      readonly routerMatch: SavedRouterMatch;
      readonly saveProblem: Exclude<AssistantSaveProblem, "storage_refused">;
    }
  | {
      readonly messageKey: string;
      readonly role: "assistant";
      readonly status: "unrouted";
      readonly message: string;
      readonly nearbyDestinationKeys: readonly AssistantDestinationKey[];
    };

/** The chat on screen: its id, and its saved form, or `null` while it has no answer yet. */
export interface ActiveAssistantConversation {
  readonly conversationId: string;
  readonly savedConversation: AssistantConversation | null;
}

const DOWNLOAD_POLL_INTERVAL_MS = 5_000;
/** Long enough to cover a slow cloud answer; a reply's own mood replaces it the moment it lands. */
const THINKING_MOOD_HOLD_MS = 20_000;
const REPLY_MOOD_HOLD_MS = 4_000;
const FAILURE_MOOD_HOLD_MS = 3_000;
/** How many recent turns are replayed into a fresh on-device session (a new chat, or a full one). */
const ON_DEVICE_REPLAY_TURN_COUNT = 4;

function buildSavedMessageKey(conversationId: string, messageIndex: number): string {
  return `${conversationId}:saved:${messageIndex}`;
}

/** The conversation as both brains receive it: questions and answered turns, newest last, capped. */
function buildConversationTurns(
  messages: readonly AssistantMessage[],
): AssistantConversationTurn[] {
  const conversationTurns: AssistantConversationTurn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      conversationTurns.push({ role: "user", text: message.text });
    } else if (message.status === "answered") {
      conversationTurns.push({ role: "assistant", text: message.reply.reply });
    } else if (message.status === "routed") {
      // A routed turn is in the history as what it offered, so the model does not see a question
      // with no answer after it.
      conversationTurns.push({
        role: "assistant",
        text: describeRouterMatchForHistory(message.routerMatch, ASSISTANT_SEARCH_SCOPE_LABELS),
      });
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

/** The cloud route's refusals that end chat for this account, until it signs in again. */
function readCloudRefusal(error: ApiError): NoChatReason | null {
  if (error.code === "401") return "signed_out";
  if (isPremiumRequiredError(error)) return "not_premium";
  if (error.code === "403") return "anonymous";
  return null;
}

function selectViewerCloudAccess({
  isSessionPending,
  signedInUserId,
  cloudAccessRead,
  cloudRefusalRecord,
}: {
  readonly isSessionPending: boolean;
  readonly signedInUserId: string | null;
  readonly cloudAccessRead: {
    readonly userId: string;
    readonly result: "premium" | "not_premium" | "signed_out";
  } | null;
  readonly cloudRefusalRecord: { readonly userId: string; readonly refusal: NoChatReason } | null;
}): ViewerCloudAccess {
  if (isSessionPending) return { status: "checking" };
  if (signedInUserId === null) return { status: "signed_out" };
  if (cloudRefusalRecord !== null && cloudRefusalRecord.userId === signedInUserId) {
    return { status: cloudRefusalRecord.refusal };
  }
  if (cloudAccessRead === null || cloudAccessRead.userId !== signedInUserId) {
    return { status: "checking" };
  }
  return { status: cloudAccessRead.result === "premium" ? "premium" : cloudAccessRead.result };
}

export function useAssistantBrain({
  pathname,
  memoryNotes,
  activeConversation,
  isConversationListFull,
  preferredModel,
  onAnsweredPair,
  onMood,
  onDestinationOffered,
}: {
  readonly pathname: string;
  readonly memoryNotes: readonly string[];
  readonly activeConversation: ActiveAssistantConversation;
  readonly isConversationListFull: boolean;
  readonly preferredModel: AssistantModelRoute | null;
  /** Saves one answered question into its chat, against a fresh read of storage. */
  readonly onAnsweredPair: (answeredPair: {
    readonly conversationId: string;
    readonly questionText: string;
    readonly answer: AssistantPairAnswer;
    readonly answeredAtMs: number;
  }) => AssistantPairSaveStatus;
  readonly onMood: (expression: MascotExpression, holdMs: number) => void;
  /** A reply carried a link: the mascot points at the panel it is in. */
  readonly onDestinationOffered: () => void;
}) {
  const { data: authSession, isPending: isSessionPending } = useSession();
  const isSignedIn = authSession !== null && authSession !== undefined;

  const [onDeviceModelStatus, setOnDeviceModelStatus] = useState<OnDeviceModelStatus>({
    status: "checking",
  });
  // Both keyed by the account they were read for, so signing in as someone else discards them by
  // derivation rather than by an effect that resets state.
  const [cloudAccessRead, setCloudAccessRead] = useState<{
    readonly userId: string;
    readonly result: "premium" | "not_premium" | "signed_out";
  } | null>(null);
  const [cloudRefusalRecord, setCloudRefusalRecord] = useState<{
    readonly userId: string;
    readonly refusal: NoChatReason;
  } | null>(null);
  const [unsavedEntriesByConversationId, setUnsavedEntriesByConversationId] = useState<
    Readonly<Record<string, readonly UnsavedEntry[]>>
  >({});
  const [searchStateByMessageKey, setSearchStateByMessageKey] = useState<
    Readonly<Record<string, AssistantSearchState>>
  >({});
  const [storageRefusedConversationIds, setStorageRefusedConversationIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const [isAwaitingReply, setIsAwaitingReply] = useState(false);

  const sessionRef = useRef<OnDeviceSession | null>(null);
  /** Which chat and which notes the live session was primed with. */
  const sessionKeyRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController>(new AbortController());
  const nextUnsavedEntryIdRef = useRef(1);
  /** Message keys whose search has been started in this panel, so each runs once per mount. */
  const startedSearchKeysRef = useRef<Set<string>>(new Set());

  const signedInUserId = authSession?.user.id ?? null;
  const viewerCloudAccess = selectViewerCloudAccess({
    isSessionPending,
    signedInUserId: isSignedIn ? signedInUserId : null,
    cloudAccessRead,
    cloudRefusalRecord,
  });
  const modelAvailability: AssistantModelAvailability = readModelAvailability({
    onDeviceModelStatus,
    viewerCloudAccess,
  });

  const { conversationId: activeConversationId, savedConversation } = activeConversation;
  const chatState: ConversationChatState = selectConversationChatState({
    savedConversation:
      savedConversation === null
        ? null
        : {
            lockedModel: savedConversation.lockedModel,
            isFull: isConversationFull(savedConversation),
          },
    isConversationListFull,
    preferredModel,
    modelAvailability,
  });
  // THE COMPOSER TAKES TEXT IN EVERY STATE THE ROUTER CAN ANSWER IN, model or not. Only a full chat
  // and a full list refuse it, because nothing asked there could be saved.
  const canTakeQuestion = chatState.status !== "full" && chatState.status !== "list_full";

  const readSearchState = (messageKey: string, reply: AssistantReply): AssistantSearchState => {
    if (reply.search === null) return { status: "none" };
    return (
      searchStateByMessageKey[messageKey] ?? {
        status: "loading",
        scope: reply.search.scope,
        query: reply.search.query,
      }
    );
  };

  const savedMessages: AssistantMessage[] = (savedConversation?.messages ?? []).map(
    (savedMessage, messageIndex): AssistantMessage => {
      const messageKey = buildSavedMessageKey(activeConversationId, messageIndex);
      if (savedMessage.role === "user") {
        return { messageKey, role: "user", text: savedMessage.text };
      }
      if (savedMessage.answeredBy === "router") {
        return {
          messageKey,
          role: "assistant",
          status: "routed",
          routerMatch: savedMessage.routerMatch,
          saveProblem: null,
        };
      }
      return {
        messageKey,
        role: "assistant",
        status: "answered",
        reply: savedMessage.reply,
        answeredBy: savedMessage.answeredBy,
        search: readSearchState(messageKey, savedMessage.reply),
        saveProblem: null,
      };
    },
  );
  const unsavedMessages: AssistantMessage[] = (
    unsavedEntriesByConversationId[activeConversationId] ?? []
  ).map((unsavedEntry): AssistantMessage =>
    unsavedEntry.role === "assistant" && unsavedEntry.status === "answered"
      ? { ...unsavedEntry, search: readSearchState(unsavedEntry.messageKey, unsavedEntry.reply) }
      : unsavedEntry,
  );
  const messages: readonly AssistantMessage[] = [...savedMessages, ...unsavedMessages];

  // A signed-in viewer's Premium AI, read once per account while the panel is open. Signed out,
  // nothing is asked: the cloud route is not theirs whatever the answer would be.
  useEffect(() => {
    if (signedInUserId === null) return undefined;
    let isCancelled = false;
    const readCloudAccess = async () => {
      const cloudAccessResult = await getAssistantCloudAccess();
      if (isCancelled) return;
      setCloudAccessRead({
        userId: signedInUserId,
        result: cloudAccessResult.success
          ? cloudAccessResult.data.hasCloudAccess
            ? "premium"
            : "not_premium"
          : cloudAccessResult.error.code === "401"
            ? "signed_out"
            : // Unreachable or unreadable: the safe answer is "no cloud", never a guess of yes.
              "not_premium",
      });
    };
    void readCloudAccess();
    return () => {
      isCancelled = true;
    };
  }, [signedInUserId]);

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

  // A FRESH controller per mount. Strict Mode mounts, cleans up and mounts again in development;
  // reusing the ref's first controller handed every later call a signal that was already aborted,
  // so `create()` rejected in 0 ms and the question sat on "Thinking…" forever.
  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    return () => {
      abortController.abort();
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  const runSearchForMessage = async (
    messageKey: string,
    search: { readonly scope: AssistantSearchScope; readonly query: string },
  ) => {
    if (startedSearchKeysRef.current.has(messageKey)) return;
    startedSearchKeysRef.current.add(messageKey);
    const searchResult = await runAssistantSearch(search.scope, search.query);
    const nextSearchState: AssistantSearchState = searchResult.success
      ? { status: "done", scope: search.scope, query: search.query, results: searchResult.data }
      : { status: "failed", scope: search.scope, query: search.query };
    setSearchStateByMessageKey((currentSearchStates) => ({
      ...currentSearchStates,
      [messageKey]: nextSearchState,
    }));
  };

  // The ACTIVE chat's saved searches, once each per panel mount. A chat that is never shown never
  // searches, and a newly saved answer is picked up here the moment it lands in storage. The chat's
  // saved form is the one input; the search itself is guarded by the started-keys ref.
  const runSavedSearch = useEffectEvent(
    (
      messageKey: string,
      search: { readonly scope: AssistantSearchScope; readonly query: string },
    ) => {
      void runSearchForMessage(messageKey, search);
    },
  );
  useEffect(() => {
    if (savedConversation === null) return;
    savedConversation.messages.forEach((savedMessage, messageIndex) => {
      if (savedMessage.role !== "assistant" || savedMessage.answeredBy === "router") return;
      if (savedMessage.reply.search === null) return;
      runSavedSearch(
        buildSavedMessageKey(savedConversation.conversationId, messageIndex),
        savedMessage.reply.search,
      );
    });
  }, [savedConversation]);

  /**
   * NO `await` MAY COME BEFORE `createOnDeviceSession`. Chrome only starts the download inside the
   * click that asked for it, and an async function runs synchronously up to its first `await` —
   * so the call below still happens inside the click. An `await` above it would spend that
   * user activation and the download would be refused.
   */
  const downloadOnDeviceModel = async () => {
    setOnDeviceModelStatus({ status: "downloading", progressPercent: 0 });
    const notesKey = memoryNotes.join("\n");
    const conversationIdAtClick = activeConversationId;
    const hasPriorTurns = messages.length > 0;
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
    // The session the download made knows no turns, so it is kept only for a chat that has none;
    // a chat with history gets a fresh one, primed with its turns, on its next question.
    if (hasPriorTurns) {
      sessionResult.data.destroy();
      sessionRef.current = null;
      sessionKeyRef.current = "";
    } else {
      sessionRef.current = sessionResult.data;
      sessionKeyRef.current = `${conversationIdAtClick}\n${notesKey}`;
    }
    setOnDeviceModelStatus({ status: "ready" });
  };

  const startOnDeviceDownload = () => {
    void downloadOnDeviceModel();
  };

  const updateUnsavedEntries = (
    conversationId: string,
    updateEntries: (currentEntries: readonly UnsavedEntry[]) => readonly UnsavedEntry[],
  ) => {
    setUnsavedEntriesByConversationId((currentEntriesByConversationId) => ({
      ...currentEntriesByConversationId,
      [conversationId]: updateEntries(currentEntriesByConversationId[conversationId] ?? []),
    }));
  };

  const replaceUnsavedEntry = (
    conversationId: string,
    messageKey: string,
    nextEntry: UnsavedEntry,
  ) => {
    updateUnsavedEntries(conversationId, (currentEntries) =>
      currentEntries.map((unsavedEntry) =>
        unsavedEntry.messageKey === messageKey ? nextEntry : unsavedEntry,
      ),
    );
  };

  /** The session for this question: reused, or recreated for another chat, new notes or a full one. */
  const ensureOnDeviceSession = async (
    conversationId: string,
    priorTurns: readonly AssistantConversationTurn[],
  ): Promise<ActionResponse<OnDeviceSession>> => {
    const sessionKey = `${conversationId}\n${memoryNotes.join("\n")}`;
    if (sessionRef.current !== null && sessionKeyRef.current === sessionKey) {
      return { success: true, data: sessionRef.current };
    }
    sessionRef.current?.destroy();
    sessionRef.current = null;
    const sessionResult = await createOnDeviceSession({
      systemText: buildAssistantSystemText({ memoryNotes }),
      priorTurns: priorTurns.slice(-ON_DEVICE_REPLAY_TURN_COUNT),
      onDownloadProgress: () => {},
      signal: abortControllerRef.current.signal,
    });
    if (sessionResult.success) {
      sessionRef.current = sessionResult.data;
      sessionKeyRef.current = sessionKey;
    }
    return sessionResult;
  };

  const askOnDevice = async (
    conversationId: string,
    questionText: string,
    priorTurns: readonly AssistantConversationTurn[],
    pendingMessageKey: string,
  ): Promise<ActionResponse<AssistantReply>> => {
    const onPartialReplyText = (partialReplyText: string) => {
      replaceUnsavedEntry(conversationId, pendingMessageKey, {
        messageKey: pendingMessageKey,
        role: "assistant",
        status: "pending",
        partialText: partialReplyText,
      });
    };
    const fullQuestionText = buildOnDeviceQuestionText({ pathname, questionText });

    const sessionResult = await ensureOnDeviceSession(conversationId, priorTurns);
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
    const freshSessionResult = await ensureOnDeviceSession(conversationId, priorTurns);
    if (!freshSessionResult.success) return freshSessionResult;
    return promptOnDeviceStreaming({
      session: freshSessionResult.data,
      questionText: fullQuestionText,
      onPartialReplyText,
      signal: abortControllerRef.current.signal,
    });
  };

  /**
   * The pair is in the preferences now (in storage, or only in this page's memory when storage
   * refused it) and renders from there, so this chat's unsaved turns go. Any earlier failure goes
   * with them: it was never saved, and left behind it would now sit after the answer it came before.
   */
  const settleSavedPair = (
    conversationId: string,
    saveStatus: "saved" | "storage_refused",
  ) => {
    updateUnsavedEntries(conversationId, () => []);
    if (saveStatus === "storage_refused") {
      setStorageRefusedConversationIds(
        (currentConversationIds) => new Set([...currentConversationIds, conversationId]),
      );
    }
  };

  const sendMessage = async (rawQuestionText: string) => {
    const questionText = rawQuestionText.trim().slice(0, ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH);
    if (questionText.length === 0 || isAwaitingReply || !canTakeQuestion) return;
    // Captured now: the viewer may switch chats while this one is answering, and the answer still
    // belongs to the chat it was asked in.
    const conversationId = activeConversationId;

    const unsavedEntryId = nextUnsavedEntryIdRef.current;
    nextUnsavedEntryIdRef.current += 1;
    const userMessageKey = `${conversationId}:unsaved:${unsavedEntryId}:question`;
    const pendingMessageKey = `${conversationId}:unsaved:${unsavedEntryId}:answer`;

    // THE ROUTER FIRST: synchronous, no network, no model. A match is saved and shown at once.
    const routerMatch = routeAssistantRequest(questionText);
    if (routerMatch.kind !== "none") {
      const savedRouterMatch: SavedRouterMatch =
        routerMatch.kind === "choices"
          ? { kind: "choices", destinationKeys: [...routerMatch.destinationKeys] }
          : routerMatch;
      const routerSaveStatus = onAnsweredPair({
        conversationId,
        questionText,
        answer: { kind: "router", routerMatch: savedRouterMatch },
        answeredAtMs: Date.now(),
      });
      if (routerSaveStatus === "saved" || routerSaveStatus === "storage_refused") {
        settleSavedPair(conversationId, routerSaveStatus);
      } else {
        updateUnsavedEntries(conversationId, (currentEntries) => [
          ...currentEntries,
          { messageKey: userMessageKey, role: "user", text: questionText },
          {
            messageKey: pendingMessageKey,
            role: "assistant",
            status: "routed",
            routerMatch: savedRouterMatch,
            saveProblem: routerSaveStatus,
          },
        ]);
      }
      onMood("joy", REPLY_MOOD_HOLD_MS);
      onDestinationOffered();
      return;
    }

    // Not understood, and no model can answer here: say so, and offer what is near. Not saved.
    if (chatState.status !== "ready") {
      updateUnsavedEntries(conversationId, (currentEntries) => [
        ...currentEntries,
        { messageKey: userMessageKey, role: "user", text: questionText },
        {
          messageKey: pendingMessageKey,
          role: "assistant",
          status: "unrouted",
          message: describeRouterOnlyFallback(chatState),
          nearbyDestinationKeys: routerMatch.nearbyDestinationKeys,
        },
      ]);
      onMood("embarrassed", FAILURE_MOOD_HOLD_MS);
      return;
    }
    const chatRoute = chatState.route;
    const priorTurns = buildConversationTurns(messages);
    const questionTurn: AssistantConversationTurn = { role: "user", text: questionText };
    updateUnsavedEntries(conversationId, (currentEntries) => [
      ...currentEntries,
      { messageKey: userMessageKey, role: "user", text: questionText },
      { messageKey: pendingMessageKey, role: "assistant", status: "pending", partialText: "" },
    ]);
    setIsAwaitingReply(true);
    onMood("thinking", THINKING_MOOD_HOLD_MS);

    const replyResult =
      chatRoute === "on_device"
        ? await askOnDevice(conversationId, questionText, priorTurns, pendingMessageKey)
        : await requestCloudReply({
            messages: [...priorTurns, questionTurn].slice(-ASSISTANT_HISTORY_TURN_LIMIT),
            pathname,
            memoryNotes,
          });

    setIsAwaitingReply(false);
    if (!replyResult.success) {
      if (replyResult.error.code === "aborted") return;
      if (chatRoute === "cloud" && signedInUserId !== null) {
        const cloudRefusal = readCloudRefusal(replyResult.error);
        if (cloudRefusal !== null) {
          setCloudRefusalRecord({ userId: signedInUserId, refusal: cloudRefusal });
        }
      }
      replaceUnsavedEntry(conversationId, pendingMessageKey, {
        messageKey: pendingMessageKey,
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

    const saveStatus = onAnsweredPair({
      conversationId,
      questionText,
      answer: { kind: "model", reply: replyResult.data, answeredBy: chatRoute },
      answeredAtMs: Date.now(),
    });
    if (saveStatus === "saved" || saveStatus === "storage_refused") {
      settleSavedPair(conversationId, saveStatus);
    } else {
      replaceUnsavedEntry(conversationId, pendingMessageKey, {
        messageKey: pendingMessageKey,
        role: "assistant",
        status: "answered",
        reply: replyResult.data,
        answeredBy: chatRoute,
        saveProblem: saveStatus,
      });
      if (replyResult.data.search !== null) {
        void runSearchForMessage(pendingMessageKey, replyResult.data.search);
      }
    }
    onMood(replyResult.data.expression, REPLY_MOOD_HOLD_MS);
    if (replyResult.data.destinationKey !== null) onDestinationOffered();
  };

  return {
    modelAvailability,
    chatState,
    canTakeQuestion,
    messages,
    /** Storage refused this chat at least once in this panel: it will not survive a reload. */
    isActiveConversationStorageRefused: storageRefusedConversationIds.has(activeConversationId),
    isAwaitingReply,
    sendMessage,
    startOnDeviceDownload,
  };
}
