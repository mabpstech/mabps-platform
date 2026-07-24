import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack rooted on this app when a parent lockfile exists.
  turbopack: {
    root: process.cwd(),
  },
  // isomorphic-dompurify / jsdom must stay external for server sanitization.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
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
