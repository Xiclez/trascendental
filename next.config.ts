import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted on a VPS (Docker): ships a minimal server.js + traced node_modules.
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
