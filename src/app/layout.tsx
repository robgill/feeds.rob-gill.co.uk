import type { Metadata, Viewport } from "next";
import { HeadMark } from "@/components/head-mark";
import { ThemeCaret } from "@/components/theme-caret";
import { brandFrom } from "@/lib/brand";
import { PLAIN_THEME_BOOT } from "@/lib/plain-theme";
import "./globals.css";
import "./plain.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const brand = brandFrom(process.env.NEXT_PUBLIC_BRAND);

const robGillMetadata: Metadata = {
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

const plainMetadata: Metadata = {
  title: {
    default: "Feeds",
    template: "%s · Feeds",
  },
  description:
    "A personal RSS router. New posts go to Slack on a schedule. This page shows status and does not show webhook URLs or email addresses.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    siteName: "Feeds",
    title: "Feeds",
    description: "A personal RSS router. New posts go to Slack on a schedule.",
    type: "website",
    locale: "en_GB",
  },
};

export const metadata: Metadata = brand === "robgill" ? robGillMetadata : plainMetadata;

const robGillViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

const plainViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
  ],
};

export const viewport: Viewport = brand === "robgill" ? robGillViewport : plainViewport;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const robGill = brand === "robgill";
  return (
    <html lang="en-GB" {...(robGill ? {} : { "data-brand": "plain" })} suppressHydrationWarning>
      <head>
        {robGill ? (
          <>
            {/* Blocking on purpose: brand.js sets data-theme before the stylesheet paints. */}
            {/* eslint-disable-next-line @next/next/no-sync-scripts */}
            <script src="https://rob-gill.co.uk/brand.js" />
            <link rel="stylesheet" href="https://rob-gill.co.uk/brand.css" />
          </>
        ) : (
          <>
            {/* Blocking on purpose: sets data-theme before the stylesheet paints. */}
            <script dangerouslySetInnerHTML={{ __html: PLAIN_THEME_BOOT }} />
          </>
        )}
      </head>
      <body>
        <div className="page">
          {robGill ? <HeadMark /> : null}
          <h1 className="name">
            Feeds
            <ThemeCaret brand={brand} />
          </h1>
          <div className="col">{children}</div>
        </div>
      </body>
    </html>
  );
}
