import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // I test E2E locali usano una build separata, per convivere con `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // In sviluppo il sito si prova anche dal telefono sulla rete di casa (http://192.168.x.x:3000):
  // senza questo Next blocca i suoi script e la pagina resta senza interattività.
  allowedDevOrigins: ["192.168.*.*"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
