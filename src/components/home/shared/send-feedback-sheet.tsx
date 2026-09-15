// TRANSPORT: props-only — client island. Chrome only: the form and its write live in
// `platform-feedback-composer.tsx`.
"use client";

// IT LIVES IN `home/shared/` BECAUSE ITS TRIGGER DOES. `AccountMenu` is mounted by the home,
// studio and admin navbars alike, so this sheet opens over all three shells; filing it under
// any one of them would make the other two import across surfaces for their own chrome.
//
// ⚠️ THE FORM MOVED OUT AND THIS FILE DID NOT SHRINK BY ACCIDENT. `/studio/feedback` needed the
// same composer inline on a page, and the two honest options were to extract it or to open this
// modal from a button on the page dedicated to sending feedback — which is the anti-pattern
// `docs/Design.md` names first. What is left here is the sheet: a title, a scrim and a way to
// close. Every rule about what feedback may promise now lives with the form.
//
// ⚠️ THIS IS STILL THE RIGHT PLACE TO SEND FEEDBACK FROM, AND THE PAGE SAYS SO. The composer
// attaches `usePathname()` so a report about a broken control carries the route it broke on.
// Opened from here it captures wherever the person actually was; opened on `/studio/feedback`
// it can only ever say `/studio/feedback`. The page is the general channel; this is the
// specific one.

import ModalSheet from "@/components/home/shared/modal-sheet";
import PlatformFeedbackComposer from "@/components/home/shared/platform-feedback-composer";

export default function SendFeedbackSheet({ onClose }: { readonly onClose: () => void }) {
  return (
    <ModalSheet title="Send feedback" onClose={onClose}>
      <div className="px-4 pb-5">
        <PlatformFeedbackComposer onDismiss={onClose} />
      </div>
    </ModalSheet>
  );
}
