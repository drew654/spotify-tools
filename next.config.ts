import type { NextConfig } from "next";

const allowedOrigin = process.env.DEV_ORIGIN;

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: allowedOrigin ? [allowedOrigin] : undefined,
};

export default nextConfig;
