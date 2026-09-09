import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  // Enable React strict mode for better debugging
  reactStrictMode: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // L-9: explicitly disable browser source maps in production. Default
  // is false but pinning it explicitly so the policy is visible in git
  // and a future Next.js upgrade can't silently flip it. Sentry source
  // maps are uploaded server-side via withSentryConfig — those still
  // work for stack traces. SECURITY_AUDIT.md §L-9
  productionBrowserSourceMaps: false,

  // Compression for better performance
  compress: true,

  // Turbopack disabled due to cache corruption issues
  // turbopack: {},

  // /exchanges is advertised as a nav destination ("Exchanges") but has never
  // been a route — it anchors into the homepage. Redirect typed/linked hits
  // there instead of serving a 404.
  async redirects() {
    return [
      {
        source: "/exchanges",
        destination: "/#capabilities",
        permanent: true,
      },
    ];
  },

  // Security headers
  async headers() {
    // Next.js dev mode (esp. with Turbopack) uses eval() for HMR and React
    // fast refresh. Production keeps the H-8 lockdown — 'unsafe-eval' is
    // only added in dev, never shipped.
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = [
      "script-src 'self' 'unsafe-inline'",
      isDev ? "'unsafe-eval'" : "",
      "https://www.googletagmanager.com https://www.googleadservices.com https://static.cloudflareinsights.com",
    ].filter(Boolean).join(" ");

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
            // M-21: strict-origin-when-cross-origin suppresses the
            // referrer entirely when downgrading from HTTPS to HTTP,
            // and limits cross-origin referrers to the origin (no path).
            // SECURITY_AUDIT.md §M-21
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // H-8: 'unsafe-eval' removed in production. 'unsafe-inline' still
              // required by Next.js runtime inline bootstrap; replacing it with
              // nonces is tracked as post-launch work in SECURITY_REMEDIATION_PLAN.md.
              // Dev mode adds 'unsafe-eval' (see scriptSrc above) for HMR/fast refresh.
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.sentry.io https://*.amazonaws.com https://api.taxformatter.com https://www.google-analytics.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.google.com",
              "worker-src 'self' blob:",
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "quantum-transfer-group",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env["CI"],

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
