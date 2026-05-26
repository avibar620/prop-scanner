import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We use plain <img> tags per spec, but keep image optimization safe for any
  // accidental next/image usage.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  // Keep Node-only deps out of edge bundling.
  serverExternalPackages: ["nodemailer", "playwright", "playwright-core"],
};

export default nextConfig;
