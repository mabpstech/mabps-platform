import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Baseline production CSP (no nonce). Inline styles/scripts allowed for App Router
 * + theme studio; Google Fonts for published sites; frames limited to same-origin
 * except chatbot embed (overridden below).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
]
  .join("; ")
  .replace(/\s+/g, " ")
  .trim();

/** Chatbot widget is loaded in third-party site iframes. */
const embedContentSecurityPolicy = contentSecurityPolicy.replace(
  "frame-ancestors 'self'",
  "frame-ancestors *",
);

const sharedSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
] as const;

const nextConfig: NextConfig = {
  // Keep Turbopack rooted on this app when a parent lockfile exists.
  turbopack: {
    root: process.cwd(),
  },
  // libsql has native bindings; keep external so Next does not bundle them.
  serverExternalPackages: ["libsql", "@libsql/client"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          ...sharedSecurityHeaders,
        ],
      },
      // Clickjacking defense for all routes except the public chatbot embed.
      // X-Frame-Options cannot allow arbitrary parents, so it must be omitted
      // on /embed/chatbot/* (CSP frame-ancestors * covers that path instead).
      {
        source: "/((?!embed/chatbot).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
      {
        source: "/embed/chatbot/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: embedContentSecurityPolicy,
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // P2-2: canonical UI paths (legacy plurals → singular module names)
      {
        source: "/sites",
        destination: "/website",
        permanent: true,
      },
      {
        source: "/sites/:path*",
        destination: "/website/:path*",
        permanent: true,
      },
      {
        source: "/automations",
        destination: "/automation",
        permanent: true,
      },
      {
        source: "/automations/:path*",
        destination: "/automation/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
