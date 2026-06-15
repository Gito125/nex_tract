import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import pkg from "./package.json";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default withPWA(nextConfig);
