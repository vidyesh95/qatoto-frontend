import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Roboto_Serif } from "next/font/google";
// eslint-disable-next-line import/no-unassigned-import -- global stylesheet has no exports to bind
import "./globals.css";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/browser-preferences";
import { BrowserPreferencesProvider } from "@/state/browser-preferences-context";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const robotoSerif = Roboto_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qatoto.com";
const SITE_TITLE = "Qatoto : Product Research, Development & Support";
const SITE_DESCRIPTION =
  "Qatoto is a B2B platform for product research, development, and support — from idea to funded, market-ready product.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "Qatoto | %s",
  },
  description: SITE_DESCRIPTION,
  appleWebApp: {
    title: "Qatoto",
  },
  openGraph: {
    type: "website",
    siteName: "Qatoto",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Qatoto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `suppressHydrationWarning` because the bootstrap script below writes `<html class="dark">`
    // before React hydrates, so the class attribute the client sees is deliberately not the one
    // the server sent. It suppresses the warning on THIS element only, not on its subtree.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* THE THEME, APPLIED BEFORE THE FIRST PAINT. It is a raw inline <script>, not <Script>:
            `beforeInteractive` still loads asynchronously relative to the initial paint, and any
            React-driven answer arrives an effect too late — either way the visitor sees a white
            flash before a dark page. This one blocks parsing for a few hundred bytes and there is
            no flash. See `THEME_BOOTSTRAP_SCRIPT` for what it does and why it is duplicated. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${robotoSerif.variable} antialiased`}
      >
        {/* {process.env.NODE_ENV === "development" && (
          <Script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )} */}
        {/* App-wide, not `(home)`-wide: the theme has to be right on the sign-in page and the
            marketing pages too, and none of those are inside that group. Wrapping `{children}` in a
            client provider leaves the children themselves server components. */}
        <BrowserPreferencesProvider>{children}</BrowserPreferencesProvider>
      </body>
    </html>
  );
}
