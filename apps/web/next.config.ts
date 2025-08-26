import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  // Configure Next.js to look for .env files in the monorepo root
  env: {
    // This tells Next.js where to find environment files
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
    NOTION_API_KEY: process.env.NOTION_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    POSTIZ_API_KEY: process.env.POSTIZ_API_KEY,
    POSTIZ_BASE_URL: process.env.POSTIZ_BASE_URL,
    // Docker networking: internal API URL for server-side requests
    API_BASE_URL: process.env.API_BASE_URL,
    // Public API URL for client-side requests
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  // Alternatively, you can specify custom env file paths
  experimental: {
    // This doesn't work in all versions, so we use the env approach above
  }
};

export default nextConfig;
