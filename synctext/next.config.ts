import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // the workspace root is one level up from synctext/, so file tracing
  // for the standalone build can see packages/db
  outputFileTracingRoot: path.join(__dirname, ".."),
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
