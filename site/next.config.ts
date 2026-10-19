import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/relatorio/:slug/design-system",
          destination: "/relatorio/:slug/design-system/index.html",
        },
        {
          source: "/relatorio/:slug/design-system/",
          destination: "/relatorio/:slug/design-system/index.html",
        },
        {
          source: "/relatorio/:slug/prototipo",
          destination: "/relatorio/:slug/prototipo/index.html",
        },
        {
          source: "/relatorio/:slug/prototipo/",
          destination: "/relatorio/:slug/prototipo/index.html",
        },
      ],
    };
  },
  async headers() {
    const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

    return [
      {
        source: "/relatorio/:slug/design-system/:path*",
        headers: noIndex,
      },
      {
        source: "/relatorio/:slug/prototipo/:path*",
        headers: noIndex,
      },
    ];
  },
};

export default nextConfig;
