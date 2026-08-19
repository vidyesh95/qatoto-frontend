import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Roboto_Serif } from "next/font/google";
// eslint-disable-next-line import/no-unassigned-import -- global stylesheet has no exports to bind
import "./globals.css";
import { BrowserPreferencesProvider } from "@/state/browser-preferences-context";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { StructuredData, buildOrganizationStructuredData } from "@/lib/structured-data";

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
    <html lang="en">
      <head>
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
        {/* App-wide, not `(home)`-wide: the account dropdown that edits these preferences is
            mounted by the (home), (studio) AND (admin) navbars. Wrapping `{children}` in a client
            provider leaves the children themselves server components. */}
        {/* Qatoto's own identity, on every page. It is the node a search engine uses to attach a
            name, a logo and a site to the whole domain, so it belongs in the root layout rather
            than on any one page — and unlike the per-page nodes it needs no read to build. */}
        <StructuredData
          data={buildOrganizationStructuredData({
            name: "Qatoto",
            canonicalUrl: SITE_URL,
            description: SITE_DESCRIPTION,
            logoUrl: `${SITE_URL}/og-image.png`,
          })}
        />
        <BrowserPreferencesProvider>{children}</BrowserPreferencesProvider>
      </body>
    </html>
  );
}
