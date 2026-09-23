import type { NextConfig } from "next";

const SEGURIDAD = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // El navegador solo pedirá la ubicación si el usuario la activa en la búsqueda
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Subida del documento de verificación (hasta 5 MB) por server action
    serverActions: { bodySizeLimit: "6mb" },
  },
  async redirects() {
    // Enlaces antiguos de las fichas (/s/juan-perez → /juan-perez)
    return [{ source: "/s/:slug", destination: "/:slug", permanent: true }];
  },
  async headers() {
    return [
      { source: "/(.*)", headers: SEGURIDAD },
      {
        // El service worker no se cachea: así una versión nueva llega enseguida
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
