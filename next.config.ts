import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM build that must be required at runtime, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Next writes an AGENTS.md on dev startup. This app does not use it.
  agentRules: false,
};

export default nextConfig;
