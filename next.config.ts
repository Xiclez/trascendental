import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted on a VPS (Docker): ships a minimal server.js + traced node_modules.
  output: "standalone",
  // Loops (Roja) and Alex Fierro used to share one page; each has their own now.
  redirects: async () => [
    { source: "/lineup/loops-roja-b2b-alex-fierro", destination: "/lineup/loops-roja", permanent: true },
  ],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
