import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["prisma", "@prisma/client"],
};

export default nextConfig;
