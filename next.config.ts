import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Keep in sync with IMAGE_HOSTS in lib/api/shared.ts.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "s1.ticketm.net" },
      { protocol: "https", hostname: "img.evbuc.com" },
    ],
  },
};

export default nextConfig;
