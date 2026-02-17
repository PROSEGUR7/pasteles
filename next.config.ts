import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
    distDir: isProduction ? ".next-prod" : ".next-live",
    serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
