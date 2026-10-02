import { describe, expect, it } from "vitest";

import {
  ASSISTANT_CONVERSATION_LIMIT,
  ASSISTANT_CONVERSATION_MESSAGE_LIMIT,
  AssistantConversationListSchema,
  appendAnsweredPair,
  buildConversationTitle,
  createConversation,
  deleteConversation,
  isConversationFull,
  isConversationListFull,
  parseStoredConversations,
  readAssistantConversations,
  sortConversationsByRecency,
  type AssistantConversation,
} from "./assistant-conversation.schemas";
import type { AssistantReply } from "./assistant-reply.schemas";

const SAMPLE_REPLY: AssistantReply = {
  expression: "joy",
  destinationKey: "open_cart",
  search: null,
  rememberNote: null,
  reply: "Your cart is one tap away.",
};

function buildConversationId(conversationIndex: number): string {
  return `00000000-0000-4000-8000-${String(conversationIndex + 1).padStart(12, "0")}`;
}

function buildConversation(
  conversationIndex: number,
  overrides: Partial<AssistantConversation> = {},
): AssistantConversation {
  return {
    ...createConversation({
      conversationId: buildConversationId(conversationIndex),
      questionText: `question ${conversationIndex}`,
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "on_device" },
      nowMs: 1_000 + conversationIndex,
    }),
    ...overrides,
  };
}

/** A chat holding exactly `pairCount` question-and-answer pairs. */
function buildConversationWithPairs(pairCount: number): AssistantConversation {
  let conversations: readonly AssistantConversation[] = [];
  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    const appendResult = appendAnsweredPair(conversations, {
      conversationId: buildConversationId(0),
      questionText: `question ${pairIndex}`,
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "on_device" },
      nowMs: 1_000 + pairIndex,
    });
    if (appendResult.status !== "saved")
      throw new Error(`pair ${pairIndex}: ${appendResult.status}`);
    conversations = appendResult.conversations;
  }
  const builtConversation = conversations[0];
  if (builtConversation === undefined) throw new Error("no conversation built");
  return builtConversation;
}

describe("buildConversationTitle", () => {
  it("keeps a short question as it is, whitespace collapsed", () => {
    expect(buildConversationTitle("  where   is\nmy cart  ")).toBe("where is my cart");
  });

  it("cuts a long question to 40 characters, ending in an ellipsis", () => {
    const title = buildConversationTitle("a".repeat(100));
    expect(title).toHaveLength(40);
    expect(title.endsWith("…")).toBe(true);
  });
});

describe("createConversation", () => {
  it("saves the first question with its answer and locks the model that answered", () => {
    const conversation = createConversation({
      conversationId: buildConversationId(0),
      questionText: "where is my cart",
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "cloud" },
      nowMs: 42,
    });
    expect(conversation).toEqual({
      conversationId: buildConversationId(0),
      title: "where is my cart",
      createdAtMs: 42,
      updatedAtMs: 42,
      lockedModel: "cloud",
      messages: [
        { role: "user", text: "where is my cart" },
        { role: "assistant", reply: SAMPLE_REPLY, answeredBy: "cloud" },
      ],
    });
  });
});

describe("appendAnsweredPair", () => {
  it("creates the chat on its first answer", () => {
    const appendResult = appendAnsweredPair([], {
      conversationId: buildConversationId(0),
      questionText: "first",
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "on_device" },
      nowMs: 5,
    });
    expect(appendResult.status).toBe("saved");
    if (appendResult.status !== "saved") return;
    expect(appendResult.conversations).toHaveLength(1);
    expect(appendResult.conversations[0]?.lockedModel).toBe("on_device");
  });

  it("appends a later pair, keeps the title and lock, and moves the activity time", () => {
    const existingConversation = buildConversation(0);
    const appendResult = appendAnsweredPair([existingConversation], {
      conversationId: existingConversation.conversationId,
      questionText: "second question",
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "on_device" },
      nowMs: 9_999,
    });
    expect(appendResult.status).toBe("saved");
    if (appendResult.status !== "saved") return;
    const updatedConversation = appendResult.conversations[0];
    expect(updatedConversation?.messages).toHaveLength(4);
    expect(updatedConversation?.title).toBe(existingConversation.title);
    expect(updatedConversation?.lockedModel).toBe("on_device");
    expect(updatedConversation?.createdAtMs).toBe(existingConversation.createdAtMs);
    expect(updatedConversation?.updatedAtMs).toBe(9_999);
  });

  it("refuses an answer from the other model: a lock never changes", () => {
    const appendResult = appendAnsweredPair([buildConversation(0)], {
      conversationId: buildConversationId(0),
      questionText: "follow-up",
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "cloud" },
      nowMs: 10,
    });
    expect(appendResult).toEqual({ status: "model_mismatch" });
  });

  it("refuses a pair once the chat holds its 20 messages", () => {
    const fullConversation = buildConversationWithPairs(ASSISTANT_CONVERSATION_MESSAGE_LIMIT / 2);
    expect(fullConversation.messages).toHaveLength(ASSISTANT_CONVERSATION_MESSAGE_LIMIT);
    const appendResult = appendAnsweredPair([fullConversation], {
      conversationId: fullConversation.conversationId,
      questionText: "one more",
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "on_device" },
      nowMs: 10,
    });
    expect(appendResult).toEqual({ status: "conversation_full" });
  });

  it("refuses a new chat when 10 are saved, and evicts nothing", () => {
    const savedConversations = Array.from({ length: ASSISTANT_CONVERSATION_LIMIT }, (_, index) =>
      buildConversation(index),
    );
    const appendResult = appendAnsweredPair(savedConversations, {
      conversationId: buildConversationId(99),
      questionText: "an eleventh chat",
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "on_device" },
      nowMs: 10,
    });
    expect(appendResult).toEqual({ status: "list_full" });
  });

  it("carries other chats through untouched, matched by id", () => {
    const otherConversation = buildConversation(1);
    const appendResult = appendAnsweredPair([buildConversation(0), otherConversation], {
      conversationId: buildConversationId(0),
      questionText: "follow-up",
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "on_device" },
      nowMs: 10,
    });
    expect(appendResult.status).toBe("saved");
    if (appendResult.status !== "saved") return;
    expect(appendResult.conversations[1]).toBe(otherConversation);
  });
});

describe("appendAnsweredPair: router answers", () => {
  const routerAnswer = {
    kind: "router",
    routerMatch: { kind: "destination", destinationKey: "your_orders" },
  } as const;

  it("saves a routed first turn UNLOCKED: it used no model", () => {
    const appendResult = appendAnsweredPair([], {
      conversationId: buildConversationId(0),
      questionText: "my orders",
      answer: routerAnswer,
      nowMs: 5,
    });
    expect(appendResult.status).toBe("saved");
    if (appendResult.status !== "saved") return;
    expect(appendResult.conversations[0]?.lockedModel).toBeNull();
    expect(appendResult.conversations[0]?.messages[1]).toEqual({
      role: "assistant",
      answeredBy: "router",
      routerMatch: { kind: "destination", destinationKey: "your_orders" },
    });
  });

  it("locks a routed chat to the first MODEL that answers it", () => {
    const routedResult = appendAnsweredPair([], {
      conversationId: buildConversationId(0),
      questionText: "my orders",
      answer: routerAnswer,
      nowMs: 5,
    });
    if (routedResult.status !== "saved") throw new Error(routedResult.status);
    const modelResult = appendAnsweredPair(routedResult.conversations, {
      conversationId: buildConversationId(0),
      questionText: "why is my order late",
      answer: { kind: "model", reply: SAMPLE_REPLY, answeredBy: "cloud" },
      nowMs: 6,
    });
    expect(modelResult.status).toBe("saved");
    if (modelResult.status !== "saved") return;
    expect(modelResult.conversations[0]?.lockedModel).toBe("cloud");
  });

  it("adds a routed turn to a locked chat without a mismatch or a new lock", () => {
    const appendResult = appendAnsweredPair([buildConversation(0)], {
      conversationId: buildConversationId(0),
      questionText: "find solar pumps",
      answer: {
        kind: "router",
        routerMatch: { kind: "search", scope: "store", query: "solar pumps" },
      },
      nowMs: 7,
    });
    expect(appendResult.status).toBe("saved");
    if (appendResult.status !== "saved") return;
    expect(appendResult.conversations[0]?.lockedModel).toBe("on_device");
    expect(appendResult.conversations[0]?.messages).toHaveLength(4);
  });

  it("still reads a chat saved before router answers existed", () => {
    const partOneConversation = {
      conversationId: buildConversationId(0),
      title: "where is my cart",
      createdAtMs: 1,
      updatedAtMs: 1,
      lockedModel: "on_device",
      messages: [
        { role: "user", text: "where is my cart" },
        { role: "assistant", reply: SAMPLE_REPLY, answeredBy: "on_device" },
      ],
    };
    expect(parseStoredConversations([partOneConversation])).toHaveLength(1);
  });

  it("refuses a saved router answer whose place does not exist", () => {
    const conversationWithUnknownPlace = {
      ...buildConversation(0),
      messages: [
        { role: "user", text: "somewhere" },
        {
          role: "assistant",
          answeredBy: "router",
          routerMatch: { kind: "destination", destinationKey: "not_a_place" },
        },
      ],
    };
    expect(parseStoredConversations([conversationWithUnknownPlace])).toHaveLength(0);
  });
});

describe("deleteConversation", () => {
  it("removes only the chat with that id", () => {
    const remainingConversations = deleteConversation(
      [buildConversation(0), buildConversation(1)],
      buildConversationId(0),
    );
    expect(remainingConversations.map((conversation) => conversation.conversationId)).toEqual([
      buildConversationId(1),
    ]);
  });

  it("leaves the list as it was for an id that is not there", () => {
    expect(deleteConversation([buildConversation(0)], buildConversationId(5))).toHaveLength(1);
  });
});

describe("isConversationFull / isConversationListFull", () => {
  it("is full when no room is left for one more pair", () => {
    expect(isConversationFull(buildConversationWithPairs(9))).toBe(false);
    expect(isConversationFull(buildConversationWithPairs(10))).toBe(true);
  });

  it("counts the list against the 10-chat limit", () => {
    const nineConversations = Array.from({ length: 9 }, (_, index) => buildConversation(index));
    expect(isConversationListFull(nineConversations)).toBe(false);
    expect(isConversationListFull([...nineConversations, buildConversation(9)])).toBe(true);
  });
});

describe("sortConversationsByRecency", () => {
  it("lists the newest activity first without changing its input", () => {
    const olderConversation = buildConversation(0, { updatedAtMs: 1 });
    const newerConversation = buildConversation(1, { updatedAtMs: 2 });
    const conversations = [olderConversation, newerConversation];
    expect(sortConversationsByRecency(conversations)).toEqual([
      newerConversation,
      olderConversation,
    ]);
    expect(conversations[0]).toBe(olderConversation);
  });
});

describe("AssistantConversationListSchema", () => {
  it("rejects more than 10 chats", () => {
    const elevenConversations = Array.from({ length: 11 }, (_, index) => buildConversation(index));
    expect(AssistantConversationListSchema.safeParse(elevenConversations).success).toBe(false);
  });

  it("rejects a chat holding more than 20 messages", () => {
    const fullConversation = buildConversationWithPairs(10);
    const overfullConversation = {
      ...fullConversation,
      messages: [...fullConversation.messages, { role: "user", text: "one too many" }],
    };
    expect(AssistantConversationListSchema.safeParse([overfullConversation]).success).toBe(false);
  });

  it("strips keys it does not know", () => {
    const parsed = AssistantConversationListSchema.parse([
      { ...buildConversation(0), addedByALaterBuild: true },
    ]);
    expect(parsed[0]).not.toHaveProperty("addedByALaterBuild");
  });
});

describe("parseStoredConversations / readAssistantConversations", () => {
  it("drops an unreadable chat alone, keeping the readable ones", () => {
    const parsedConversations = parseStoredConversations([
      buildConversation(0),
      { conversationId: "not-a-uuid", title: "broken" },
      buildConversation(1),
    ]);
    expect(parsedConversations.map((conversation) => conversation.conversationId)).toEqual([
      buildConversationId(0),
      buildConversationId(1),
    ]);
  });

  it("cuts a stored list past the limit rather than refusing it", () => {
    const storedConversations = Array.from({ length: 12 }, (_, index) => buildConversation(index));
    expect(parseStoredConversations(storedConversations)).toHaveLength(
      ASSISTANT_CONVERSATION_LIMIT,
    );
  });

  it("validates a stored array once and reuses the result", () => {
    const storedConversations: readonly unknown[] = [buildConversation(0)];
    const firstRead = readAssistantConversations(storedConversations);
    expect(readAssistantConversations(storedConversations)).toBe(firstRead);
    expect(readAssistantConversations([...storedConversations])).not.toBe(firstRead);
  });
});
