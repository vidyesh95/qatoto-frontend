import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

// The Express backend (Better Auth) is the source of truth for sessions. The
// cookie it sets is httpOnly, so the client never holds the session itself — it
// asks the backend via useSession(). baseURL is the API origin; cookies ride
// along automatically on its own calls.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  plugins: [
    passkeyClient(),
    emailOTPClient(),
    // Mirror the backend's user.additionalFields.handle (input:false) so
    // session.user.handle is typed without a cast. The handle is written ONLY by
    // PATCH /users/me/handle (the rate-limit + reservation transaction), never
    // through Better Auth's own update paths — hence input:false here too.
    inferAdditionalFields({
      user: { handle: { type: "string", required: false, input: false } },
    }),
  ],
});

export const { useSession, signIn, signOut, emailOtp } = authClient;
