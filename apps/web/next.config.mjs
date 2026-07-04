/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The compiler (Ring 2) runs in the browser straight from our workspace package.
  transpilePackages: ["@steward/core"],
};

export default nextConfig;
