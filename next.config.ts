import type { NextConfig } from "next";
import { withContentlayer } from 'next-contentlayer2'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  // Enable React strict mode for better debugging
  reactStrictMode: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Compression for better performance
  compress: true,

  // Turbopack disabled due to cache corruption issues
  // turbopack: {},

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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.sentry.io",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
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

// Wrap with Sentry config first, then Contentlayer
export default withSentryConfig(
  withContentlayer(nextConfig),
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: process.env['SENTRY_ORG'],
    project: process.env['SENTRY_PROJECT'],

    // Only print logs for uploading source maps in CI
    silent: !process.env['CI'],

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    tunnelRoute: "/monitoring",

    // Webpack plugin options
    webpack: {
      // Automatically annotate React components
      reactComponentAnnotation: {
        enabled: true,
      },

      // Automatically tree-shake Sentry logger statements
      treeshake: {
        removeDebugLogging: true,
      },

      // Enable automatic instrumentation of Vercel Cron Monitors
      automaticVercelMonitors: true,
    },

    // Source maps configuration
    sourcemaps: {
      // Hide source maps from client bundles
      deleteSourcemapsAfterUpload: true,
    },
  }
);