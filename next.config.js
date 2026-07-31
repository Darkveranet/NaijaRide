/** @type {import('next').NextConfig} */
// Merged for GitHub Pages static export. basePath is injected by the deploy
// workflow (NEXT_PUBLIC_BASE_PATH=/<repo>); empty locally.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
};
module.exports = nextConfig;
