// THE ASSISTANT'S PARSE BUDGET, MADE REPEATABLE.
//
// Saved assistant chats live inside the one browser-preferences key (`qatoto.browser-preferences`),
// and that blob is read and parsed on every app load. This script prints the LARGEST blob the
// schema accepts, so the cost of that parse can be measured instead of guessed:
//
//   10 chats x 20 messages (ASSISTANT_CONVERSATION_LIMIT / _MESSAGE_LIMIT), every text field at its
//   maximum length (questions and replies 800, remember notes 200, search queries 80, titles 40),
//   plus 20 memory notes at 200.
//
//   node scripts/build-assistant-worst-case-preferences.mjs                  > /tmp/blob.json
//   node scripts/build-assistant-worst-case-preferences.mjs --escape-heavy   > /tmp/blob.json
//
// `--escape-heavy` fills the text with quotes, backslashes and a control character, which
// `JSON.stringify` escapes to two and six characters each: the most bytes the same limits allow.
//
// THE BUDGET IS 16 MS (ONE FRAME) WITH CHROME'S CPU THROTTLED 6x, which stands in for a mid-range
// phone. A fast laptop passing unthrottled says nothing about the field. The procedure:
//
//   1. `pnpm dev`, open http://localhost:3000, turn AI Assist on.
//   2. Seed: in DevTools (or chrome-devtools MCP `evaluate_script`),
//        localStorage.setItem("qatoto.browser-preferences", <the printed JSON>)
//      with `isAiAssistModeOn` already true in the printed blob.
//   3. Throttle the CPU 6x (Performance panel, or MCP `emulate` with `cpuThrottlingRate: 6`),
//      record a reload, and read the total time of `getBrowserPreferencesSnapshot` /
//      `parseStoredBrowserPreferences` in the bottom-up view.
//   4. CHECK THE SEED ACTUALLY PARSED: open the assistant and count 10 chats in the rail. A blob the
//      schema rejects falls back to the defaults in microseconds and would pass for the wrong reason.
//
// MEASURED 2026-10-02, dev build, 6x throttle, on the full app parse (`parseStoredBrowserPreferences`):
//   plain, every chat validated on load ........ 21 to 22 ms  (over: JSON.parse alone was 0.6 ms)
//   plain, chats validated only when read ...... 9 ms         (what ships; see browser-preferences.ts)
//   escape-heavy, chats validated when read .... 22 ms        (accepted: 12.7 ms is JSON.parse itself)
//
// The values below must stay valid against `src/lib/assistant/assistant-conversation.schemas.ts`
// and `assistant-reply.schemas.ts`; if either changes its limits or enums, change them here.
// Deterministic: fixed ids and timestamps, so two runs print the same bytes.

const CONVERSATION_LIMIT = 10;
const CONVERSATION_MESSAGE_LIMIT = 20;
const TURN_TEXT_MAXIMUM_LENGTH = 800;
const REPLY_MAXIMUM_LENGTH = 800;
const REMEMBER_NOTE_MAXIMUM_LENGTH = 200;
const SEARCH_QUERY_MAXIMUM_LENGTH = 80;
const TITLE_MAXIMUM_LENGTH = 40;
const MEMORY_NOTE_LIMIT = 20;
const MEMORY_NOTE_MAXIMUM_LENGTH = 200;

const isEscapeHeavy = process.argv.includes("--escape-heavy");

/** Text of exactly `characterCount`, starting and ending on a letter so `.trim()` keeps every one. */
function buildText(characterCount, seedWord) {
  const fillerUnit = isEscapeHeavy ? '"\\\u0001' : `${seedWord} `;
  let text = "";
  while (text.length < characterCount) text += fillerUnit;
  return `a${text.slice(0, characterCount - 2)}z`;
}

/** A version-4, RFC-variant UUID that `z.uuid()` accepts, fixed per chat. */
function buildConversationId(conversationIndex) {
  return `00000000-0000-4000-8000-${String(conversationIndex + 1).padStart(12, "0")}`;
}

const baseTimeMs = Date.UTC(2026, 9, 2);

const assistantConversations = Array.from(
  { length: CONVERSATION_LIMIT },
  (_unusedConversation, conversationIndex) => ({
    conversationId: buildConversationId(conversationIndex),
    title: buildText(TITLE_MAXIMUM_LENGTH, "title"),
    createdAtMs: baseTimeMs + conversationIndex * 60_000,
    updatedAtMs: baseTimeMs + conversationIndex * 60_000 + 30_000,
    lockedModel: conversationIndex % 2 === 0 ? "on_device" : "cloud",
    messages: Array.from({ length: CONVERSATION_MESSAGE_LIMIT }, (_unusedMessage, messageIndex) =>
      messageIndex % 2 === 0
        ? { role: "user", text: buildText(TURN_TEXT_MAXIMUM_LENGTH, "question") }
        : {
            role: "assistant",
            reply: {
              expression: "enlightened",
              destinationKey: "request_quote",
              search: {
                scope: "research_programs",
                query: buildText(SEARCH_QUERY_MAXIMUM_LENGTH, "query"),
              },
              rememberNote: buildText(REMEMBER_NOTE_MAXIMUM_LENGTH, "note"),
              reply: buildText(REPLY_MAXIMUM_LENGTH, "answer"),
            },
            answeredBy: conversationIndex % 2 === 0 ? "on_device" : "cloud",
          },
    ),
  }),
);

const worstCasePreferences = {
  language: "English",
  countryCode: "US",
  isAiAssistModeOn: true,
  assistantDockSide: "right",
  assistantMascotSize: "medium",
  assistantMascotSpeed: "normal",
  assistantMemoryNotes: Array.from({ length: MEMORY_NOTE_LIMIT }, () =>
    buildText(MEMORY_NOTE_MAXIMUM_LENGTH, "memory"),
  ),
  assistantConversations,
  assistantPreferredModel: null,
};

const serializedPreferences = JSON.stringify(worstCasePreferences);
process.stdout.write(serializedPreferences);
process.stderr.write(
  `${isEscapeHeavy ? "escape-heavy" : "plain"} worst case: ${serializedPreferences.length.toLocaleString("en-US")} characters (${(serializedPreferences.length / 1024).toFixed(0)} KiB of the ~5M-character localStorage quota)\n`,
);
