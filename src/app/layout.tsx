import type { Metadata } from "next";
import Link from "next/link";
import { ThemeSwitch } from "@/components/theme-switch";
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
        <div className="wrap">
          <header className="mast">
            <div className="mast-row">
              <p className="kicker">
                <Link href="/">feeds.rob-gill.co.uk</Link>
              </p>
              <ThemeSwitch />
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
