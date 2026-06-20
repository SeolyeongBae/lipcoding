/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone bundle for Azure App Service Docker-free deployment
  output: "standalone",
};

export default nextConfig;
