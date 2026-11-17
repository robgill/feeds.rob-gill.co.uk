import { createHash } from "node:crypto";

/**
 * Identity for an item within a feed.
 * A guid wins when the feed provides one. Otherwise the link is the identity.
 */
export function dedupeHash(guid: string | null, link: string | null): string | null {
  const source = guid?.trim() || link?.trim() || "";
  if (!source) return null;
  return createHash("sha256").update(source).digest("hex");
}
