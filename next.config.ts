import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Firebase Hosting
  output: 'export',
  
  // Disable image optimization since static hosting doesn't support it
  images: {
    unoptimized: true,
  },
  
  // Optional: Add trailing slash for better compatibility
  trailingSlash: true,
  
  // Disable ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Base path for deployment (can be customized if needed)
  // basePath: '/your-app-name', // Uncomment if deploying to a subdirectory
};

export default nextConfig;
