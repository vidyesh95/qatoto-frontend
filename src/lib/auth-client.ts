import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import {
  emailOTPClient,
  inferAdditionalFields,
  multiSessionClient,
  phoneNumberClient,
} from "better-auth/client/plugins";

// The Express backend (Better Auth) is the source of truth for sessions. The
// cookie it sets is httpOnly, so the client never holds the session itself — it
// asks the backend via useSession(). baseURL is the API origin; cookies ride
// along automatically on its own calls.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  plugins: [
    passkeyClient(),
    emailOTPClient(),
    // Drives authClient.phoneNumber.sendOtp / .verify. The OTP is sent and
    // checked entirely by the Express backend (Better Auth phoneNumber plugin +
    // SMS provider) — the client only triggers it and submits the typed code.
    phoneNumberClient(),
    // Mirrors the backend multiSession() plugin: enables authClient.multiSession
    // .listDeviceSessions / .setActive / .revoke for the account switcher. Also
    // registers the listener that auto-refreshes useSession() after setActive.
    multiSessionClient(),
    // Mirror the backend's user.additionalFields so the session is typed without
    // a cast. `handle` is written ONLY by PATCH /users/me/handle (the rate-limit
    // + reservation transaction); `phoneNumber` / `phoneNumberVerified` are
    // written ONLY by the phoneNumber plugin's verify path — never through Better
    // Auth's own update paths — hence input:false on all three.
    inferAdditionalFields({
      user: {
        handle: { type: "string", required: false, input: false },
        phoneNumber: { type: "string", required: false, input: false },
        phoneNumberVerified: { type: "boolean", required: false, input: false },
      },
    }),
  ],
});

export const { useSession, signIn, signOut, emailOtp } = authClient;
