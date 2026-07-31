/** @type {import('next').NextConfig} */
// Static export for GitHub Pages. The deploy workflow injects
// NEXT_PUBLIC_BASE_PATH=/<repo>; locally it stays empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true, remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};
module.exports = nextConfig;
