import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Roboto_Serif } from "next/font/google";
// eslint-disable-next-line import/no-unassigned-import -- global stylesheet has no exports to bind
import "./globals.css";

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
const SITE_TITLE = "Qatoto — Product Research, Development & Funding";
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
        {process.env.NODE_ENV === "development" && (
          <Script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}
