import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";

/** One group of the "what we hold" inventory. */
export type HeldDataCategory = {
  readonly title: string;
  readonly icon: string;
  readonly items: readonly string[];
  /** Shown when the category behaves differently from the rest on deletion. */
  readonly note?: string;
  /**
   * Why the download will NOT contain this, when it will not.
   *
   * THE LIST ABOVE IS NOW CHECKABLE. Somebody can read a category here, open the export,
   * and find nothing matching it — and with no explanation the honest reading is that data
   * is being withheld. Every category the archive cannot carry says so here instead.
   */
  readonly absentFromExport?: string;
};

export const HELD_DATA_CATEGORIES: readonly HeldDataCategory[] = [
  {
    title: "Who you are",
    icon: "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Your name, email address, and profile photo",
      "Your handle and the location shown on your profile",
      "When you joined",
      "Whether your account has Premium AI, and when it was turned on or off",
    ],
  },
  {
    title: "How you sign in",
    icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Your password, stored only as a hash we cannot reverse",
      "Your passkeys and any linked Google or GitHub account",
      "Each signed-in device, with the IP address and browser it signed in from",
    ],
  },
  {
    title: "What you do here",
    icon: "/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Videos you watch, like, and save, and playlists you build",
      "Comments and forum replies you post",
      "Products you view, your cart, and your orders",
    ],
  },
  {
    title: "How much you watch, and when",
    icon: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Which hour of which day you watched something, kept for 90 days",
      "How many seconds you watched each day, kept for about 25 months",
      "An hour-by-hour total for the whole platform, which carries no account id at all",
    ],
    note: "Only recorded while you are signed in. Watching signed out is not counted, here or in Time watched.",
    absentFromExport:
      "The platform-wide hourly total is not in the download — it carries no account id, so there is no way to say which part of it is yours.",
  },
  {
    title: "What you search for",
    icon: "/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "The words you searched for videos, kept for 30 days",
      "A code that changes every week instead of your account, name or network address",
      "Never a search containing an email address, a phone number or a web address",
    ],
    note: "A term is shown to others only once enough different people have searched for it.",
    absentFromExport:
      "Not in the download, and not deletable one person at a time: nothing links a search to your account. Every search is deleted after 30 days.",
  },
  {
    title: "Product pages you looked at",
    icon: "/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Which listing you opened, and on which day",
      "Roughly how long the page was open, measured by us rather than reported by your browser",
      "Whether you arrived from search, a rail or the listing itself",
    ],
    note: "Recorded whether or not you are signed in. Signed in, it is attached to your account and is in the download below; signed out, there is no account to attach it to.",
    absentFromExport:
      "The scrambled per-day code and the blunted network address stored beside each row are not in the download — they exist to stop one person counting as a hundred, are not identifiers we can read back, and printing them would tell you nothing about yourself.",
  },
  {
    title: "Work you have done",
    icon: "/icons/shield_person_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Projects you founded, joined, or applied to",
      "Effort you logged and claims you submitted",
      "Daily updates you posted, and the transcript and claims drawn from them",
      "Receipt photos you uploaded as evidence",
      "Equity, pay records, and payments",
    ],
    note: "This is the category that outlives a deleted account, without your name attached.",
    absentFromExport: `Only the projects you founded, joined or applied to are in the download so far. For a copy of the rest, email ${PRIVACY_CONTACT_EMAIL}.`,
  },
  {
    title: "Buying and selling",
    icon: "/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Business details you gave as a seller, with registration and tax numbers stored encrypted",
      "Documents you uploaded as evidence of your business",
      "Delivery addresses and customisation artwork you gave with an order",
      "Inquiries you sent to factories",
    ],
    absentFromExport: `Not in the download yet. For a copy, email ${PRIVACY_CONTACT_EMAIL}.`,
  },
  {
    title: "What you publish",
    icon: "/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Pitches you posted, and funding outcomes you recorded, including the funder's name",
      "Teardowns, product launches and case studies, with the statements you made with them",
      "A company name you withheld from a case study, which moderators see and readers do not",
      "Problems you reported on the map, with a pin rounded to about 110 metres",
      "Photos you attached to a problem report, which are public and deleted after two years, or 90 days after the problem is marked fixed",
      "Your cofounder directory profile",
      "Rights claims you sent about a teardown, with your name, organisation, email and standing, which moderators see and the publisher does not, kept for six years after the claim is answered",
    ],
    absentFromExport: `Not in the download yet. For a copy, email ${PRIVACY_CONTACT_EMAIL}.`,
  },
  {
    title: "Settings on this device",
    icon: "/icons/storage_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Your language, browse country, and AI assist preference",
      "Where the AI assistant sits, its size and speed, and the notes you asked it to remember",
      "Stored in this browser only. With Premium AI, assistant notes travel with a question when your browser cannot run the assistant itself, and we do not keep them",
    ],
    absentFromExport:
      "Not in the download: we store none of these, so we have no copy to include. Clear them above.",
  },
];
