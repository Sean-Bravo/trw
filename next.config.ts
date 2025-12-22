import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better debugging
  reactStrictMode: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Compression for better performance
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Image optimization domains (add as needed)
  images: {
    domains: [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
