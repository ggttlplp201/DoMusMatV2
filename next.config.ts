import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "domusmat.pt",
      },
    ],
  },
};

export default nextConfig;
