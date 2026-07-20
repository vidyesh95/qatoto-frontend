// Mock Project Immortal ideas (with nested replies). Split out of
// project-immortal-mocks.ts only for file size — same convention: fixtures,
// no getters.

import type { ImmortalIdea } from "@/types/research-and-development";

export const MOCK_IMMORTAL_IDEAS: ImmortalIdea[] = [
  {
    id: "idea-caloric-restriction-mimetics",
    authorName: "Ravi Deshmukh",
    authorAvatarSrc: "/dummy/profile_image_01.avif",
    authorLocation: "Pune, India",
    postedAtLabel: "4 hours ago",
    ideaText:
      "Caloric restriction works in every model organism we've tried and almost nobody can stick to it. A mimetic that triggers the same pathways without the hunger would be the single highest-leverage intervention on this whole map. Why is this not branch number one?",
    likeCountLabel: "482",
    replies: [
      {
        id: "reply-crm-rapamycin",
        authorName: "Dr. Amara Okafor",
        authorAvatarSrc: "/dummy/profile_image_02.avif",
        postedAtLabel: "3 hours ago",
        replyText:
          "It partly is — rapamycin and metformin both sit under AI Drug Discovery. The hard part isn't finding mimetics, it's proving healthspan benefit in humans without a 30-year trial.",
        likeCountLabel: "214",
      },
      {
        id: "reply-crm-endpoints",
        authorName: "Lena Fischer",
        authorAvatarSrc: "/dummy/profile_image_07.avif",
        postedAtLabel: "2 hours ago",
        replyText:
          "Which loops back to the epigenetic clock branch. Fix the instrument and every other trial gets 10x cheaper.",
        likeCountLabel: "97",
      },
    ],
  },
  {
    id: "idea-community-clock-testing",
    authorName: "Grace Muthoni",
    authorAvatarSrc: "/dummy/profile_image_04.avif",
    authorLocation: "Nairobi, Kenya",
    postedAtLabel: "Yesterday",
    ideaText:
      "Qatoto could run community epigenetic-clock testing at scale — 10,000 people, five continents, one protocol. Cheap per head, and it fixes the South-Asian and African biomarker gaps the map is already flagging. The crowd is the asset here, not the lab.",
    likeCountLabel: "1,047",
    replies: [
      {
        id: "reply-clock-consent",
        authorName: "Dr. Nadia Haddad",
        authorAvatarSrc: "/dummy/profile_image_06.avif",
        postedAtLabel: "20 hours ago",
        replyText:
          "Consent and data governance have to be designed before sample one. Who owns a methylation profile, and can it ever be sold?",
        likeCountLabel: "331",
      },
      {
        id: "reply-clock-supplier",
        authorName: "Sofia Almeida",
        authorAvatarSrc: "/dummy/profile_image_11.avif",
        postedAtLabel: "16 hours ago",
        replyText:
          "Kit assembly and cold-chain shipping is a supplier problem, and suppliers on Qatoto already do this for the store. Compensation could ride the same escrow.",
        likeCountLabel: "158",
      },
    ],
  },
  {
    id: "idea-plasma-dilution-protocol",
    authorName: "Tobias Nkemelu",
    authorAvatarSrc: "/dummy/profile_image_05.avif",
    authorLocation: "Lagos, Nigeria",
    postedAtLabel: "2 days ago",
    ideaText:
      "Publish an open plasma-dilution protocol. The mouse results are strong, the procedure is already routine in hospitals as therapeutic plasma exchange, and the only reason it hasn't been tested properly is that nobody can patent saline.",
    likeCountLabel: "756",
    replies: [],
  },
  {
    id: "idea-repair-old-first",
    authorName: "Yuki Sato",
    authorAvatarSrc: "/dummy/profile_image_08.avif",
    authorLocation: "Osaka, Japan",
    postedAtLabel: "3 days ago",
    ideaText:
      "Every therapy on this map should be evaluated on people who are already 70. If it only works when started at 30, it's a lifestyle product, not a life-extension one — and we should be honest about which we're building.",
    likeCountLabel: "612",
    replies: [],
  },
  {
    id: "idea-fund-the-gaps",
    authorName: "Marcus Bell",
    authorAvatarSrc: "/dummy/profile_image_03.avif",
    authorLocation: "Manchester, UK",
    postedAtLabel: "6 days ago",
    ideaText:
      "The two dashed nodes on the branch map — long-term safety data and non-European biomarkers — are the least glamorous and most blocking work in the program. Qatoto should route funding to highlighted gaps first, not to whatever branch is trending.",
    likeCountLabel: "389",
    replies: [],
  },
];
