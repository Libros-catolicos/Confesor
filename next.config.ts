import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Subida del documento de verificación (hasta 5 MB) por server action
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
