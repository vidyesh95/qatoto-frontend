import Image from "next/image";

// "Questions and answers" block on the product page. Shows answered buyer
// questions with engagement, plus a search/ask entry point. UI-only mock —
// the real Q&A list comes from the backend later.

const ANSWERED_QUESTIONS = [
  {
    question: "Is this comfortable for office work?",
    answer: "It prevents back pain and also well furnished nice product",
    askedAgo: "12 months ago",
    location: "Central African Republic",
    likeCount: "8.8m",
    username: "@ikun",
  },
  {
    question: "Does it stack with older models?",
    answer: "It prevents back pain and also well furnished nice product",
    askedAgo: "12 months ago",
    location: "Central African Republic",
    likeCount: "8.8m",
    username: "@ikun",
  },
  {
    question: "What is the seat height?",
    answer: "It prevents back pain and also well furnished nice product",
    askedAgo: "12 months ago",
    location: "Central African Republic",
    likeCount: "8.8m",
    username: "@ikun",
  },
];

export default function QuestionsAndAnswers() {
  return (
    <details className="group flex flex-col py-2" open>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 [&::-webkit-details-marker]:hidden">
          <h2 className="text-sm tracking-[0.25px] text-[#191C1C]">Questions and answers</h2>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
            className="transition-transform group-open:rotate-90"
          />
        </summary>

      <div className="px-4 py-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-2.5 pr-6 pl-4 outline -outline-offset-1 outline-[#6F7979]"
        >
          <Image
            src="/icons/search_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          <span className="text-sm font-medium tracking-[0.1px] text-[#00696E]">
            Search or ask question
          </span>
        </button>
      </div>

      <div className="flex flex-col">
        {ANSWERED_QUESTIONS.map((entry, entryIndex) => (
          <div key={entryIndex} className="flex flex-col gap-1 px-4 py-2">
            {/* Question */}
            <div className="flex items-start gap-2">
              <div className="flex flex-1 items-start">
                <span className="text-xs font-medium tracking-[0.5px] text-[#191C1C]">Q:</span>
                <div className="flex flex-1 flex-col">
                  <span className="text-xs font-medium tracking-[0.5px] text-[#191C1C]">
                    {entry.question}
                  </span>
                  <button
                    type="button"
                    className="text-right text-xs font-medium tracking-[0.5px] text-[#2A76FD]"
                  >
                    more
                  </button>
                </div>
              </div>
              <Image
                src="/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                width={14}
                height={14}
                alt=""
              />
            </div>

            {/* Answer */}
            <div className="flex items-start gap-2">
              <div className="flex flex-1 items-start">
                <span className="text-xs tracking-[0.4px] text-[#191C1C]">A:</span>
                <div className="flex flex-1 flex-col">
                  <span className="text-xs tracking-[0.4px] text-[#191C1C]">{entry.answer}</span>
                  <button
                    type="button"
                    className="text-right text-xs font-medium tracking-[0.5px] text-[#2A76FD]"
                  >
                    more
                  </button>
                </div>
              </div>
              <Image
                src="/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                width={14}
                height={14}
                alt=""
              />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-0.5 text-[11px] font-medium tracking-[0.5px] text-[#6F7979]">
              <span>{entry.askedAgo}</span>
              <span>•</span>
              <span>{entry.location}</span>
            </div>

            {/* Engagement */}
            <div className="flex items-center gap-4">
              <div className="flex w-16 items-center">
                <div className="flex flex-1 items-center gap-0.5">
                  <Image
                    src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    width={14}
                    height={14}
                    alt=""
                  />
                  <span className="flex-1 text-[11px] font-medium tracking-[0.5px] text-[#6F7979]">
                    {entry.likeCount}
                  </span>
                </div>
                <Image
                  src="/icons/heart_broken_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={14}
                  height={14}
                  alt=""
                />
              </div>
              <Image
                src="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                width={14}
                height={14}
                alt=""
              />
            </div>

            <span className="text-[11px] font-medium tracking-[0.5px] text-black">
              {entry.username}
            </span>

            {/* Verified purchase */}
            <div className="flex items-center gap-2">
              <span className="h-px w-6 bg-[#CAC4D0]" />
              <span className="text-[11px] font-medium tracking-[0.5px] text-[#6F7979]">
                Verified Purchase
              </span>
              <Image
                src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
                width={14}
                height={14}
                alt=""
              />
            </div>

            <button
              type="button"
              className="text-left text-[11px] font-medium tracking-[0.5px] text-[#2A76FD]"
            >
              Read other answers
            </button>
          </div>
        ))}
      </div>

      <div className="px-4">
        <div className="h-px w-full bg-[#CAC4D0]" />
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm tracking-[0.25px] text-[#191C1C]">All questions and answers</span>
        <Image
          src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          width={24}
          height={24}
          alt=""
        />
      </div>

      <div className="px-4">
        <div className="h-px w-full bg-[#CAC4D0]" />
      </div>

    </details>
  );
}
