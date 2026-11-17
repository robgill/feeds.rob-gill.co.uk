import type { Metadata, Viewport } from "next";
import { HeadMark } from "@/components/head-mark";
import { ThemeCaret } from "@/components/theme-caret";
import "./globals.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Feeds",
    template: "%s · Feeds",
  },
  description: "Personal RSS router for feeds.rob-gill.co.uk",
  robots: { index: false, follow: false },
  metadataBase: new URL("https://feeds.rob-gill.co.uk"),
  icons: {
    icon: [
      { url: "/favicon-white.svg?v=2", type: "image/svg+xml", sizes: "any" },
      { url: "/icon-48.png?v=3", type: "image/png", sizes: "48x48" },
      { url: "/icon-192.png?v=3", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png?v=3", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest?v=3",
  openGraph: {
    siteName: "Rob Gill",
    title: "Feeds · Rob Gill",
    description: "Rob Gill's personal RSS router: feeds he follows, posted to Slack.",
    type: "website",
    url: "https://feeds.rob-gill.co.uk/",
    locale: "en_GB",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Rob Gill, a pixel-art portrait on yellow, with the line: Designer, design leader and co-founder of Provius. Based in Preston, Lancashire.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@rob_gill_",
    creator: "@rob_gill_",
    title: "Feeds · Rob Gill",
    description: "Rob Gill's personal RSS router: feeds he follows, posted to Slack.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        {/* Blocking on purpose: brand.js sets data-theme before the stylesheet paints. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://rob-gill.co.uk/brand.js" />
        <link rel="stylesheet" href="https://rob-gill.co.uk/brand.css" />
      </head>
      <body>
        <div className="page">
          <HeadMark />
          <h1 className="name">
            Feeds
            <ThemeCaret />
          </h1>
          <div className="col">{children}</div>
        </div>
      </body>
    </html>
  );
}
