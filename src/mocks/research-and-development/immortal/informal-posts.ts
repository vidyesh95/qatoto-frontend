// Mock Project Immortal informal posts. Split out of
// project-immortal-mocks.ts only for file size — same convention: fixtures,
// no getters.

import type { ImmortalInformalPost } from "@/types/research-and-development";

export const MOCK_IMMORTAL_INFORMAL_POSTS: ImmortalInformalPost[] = [
  {
    id: "informal-aging-clinics-as-gyms",
    title: "What if we treated aging clinics like gyms?",
    authorName: "Marcus Bell",
    authorAvatarSrc: "/dummy/profile_image_03.avif",
    postedAtLabel: "2 days ago",
    bodyText:
      "No proof, just a hunch. Everybody accepts a monthly gym fee for muscle they can see. Nobody pays monthly for a mitochondrial checkup they can't. If a clinic gave you a biological-age number every month, the number itself becomes the treadmill. Behavior change is the cheapest longevity intervention we have and we keep skipping straight to molecules.",
    reactionCountLabel: "418",
    replyCountLabel: "37",
  },
  {
    id: "informal-n-of-one-clock",
    title: "My n=1 epigenetic clock experiment, month 6",
    authorName: "Lena Fischer",
    authorAvatarSrc: "/dummy/profile_image_07.avif",
    postedAtLabel: "5 days ago",
    bodyText:
      "Six monthly methylation tests, same lab, same time of day. My biological age bounced 4 years in both directions with no lifestyle change big enough to explain it. Either the clocks are noisy at the individual level or something seasonal is going on. Posting the raw CSV in the thread — somebody with real statistics chops please tear this apart.",
    reactionCountLabel: "692",
    replyCountLabel: "104",
  },
  {
    id: "informal-repair-not-slow",
    title: "We keep trying to slow aging when we should be repairing it",
    authorName: "Tobias Nkemelu",
    authorAvatarSrc: "/dummy/profile_image_05.avif",
    postedAtLabel: "1 week ago",
    bodyText:
      "Slowing damage buys years. Repairing damage buys decades, and it works on people who are already old — which is everyone reading this. The whole field's funding still skews toward slowing. I think that's a category error we inherited from calorie-restriction studies.",
    reactionCountLabel: "1,203",
    replyCountLabel: "217",
  },
  {
    id: "informal-open-hardware-perfusion",
    title: "An open-hardware perfusion rig would unblock three branches at once",
    authorName: "Sofia Almeida",
    authorAvatarSrc: "/dummy/profile_image_11.avif",
    postedAtLabel: "2 weeks ago",
    bodyText:
      "Two teams on the map built the same machine-perfusion rig, independently, for about $40K each. Publish the bill of materials, let a Qatoto supplier assemble it at volume, and organ preservation stops being a hardware problem. This is exactly the kind of overlap the branch map should be catching earlier.",
    reactionCountLabel: "534",
    replyCountLabel: "62",
  },
];
