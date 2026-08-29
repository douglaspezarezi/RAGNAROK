import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes do monorepo importados como TypeScript-fonte precisam ser
  // transpilados pelo Next.
  transpilePackages: ["@game/core", "@game/data"],
};

export default nextConfig;
