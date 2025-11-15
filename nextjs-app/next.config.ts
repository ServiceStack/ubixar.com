import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output to C# wwwroot folder
  output: 'export',
  distDir: '../MyApp/wwwroot/_next',

  // Required for static export
  images: {
    unoptimized: true,
  },

  // Asset configuration
  assetPrefix: '/_next',
  basePath: '',
  trailingSlash: true,

  // Development proxy for API calls to C# backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://localhost:5001/api/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'https://localhost:5001/auth/:path*',
      },
    ]
  },
};

export default nextConfig;
