import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
    distDir: isProduction ? "node_modules/.next-prod" : ".next-live",
};

export default nextConfig;
