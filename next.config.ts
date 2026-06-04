import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['10.199.98.156', 'localhost:3000'],
  serverExternalPackages: ['serialport'],
};

export default nextConfig;
