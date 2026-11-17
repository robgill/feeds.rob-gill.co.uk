export type Brand = "plain" | "robgill";

/**
 * `NEXT_PUBLIC_BRAND=robgill` loads the rob-gill.co.uk brand.
 * Anything else, including unset, is the plain local theme.
 * Next.js inlines `NEXT_PUBLIC_` values at build time.
 */
export function brandFrom(value: string | undefined): Brand {
  return value === "robgill" ? "robgill" : "plain";
}
