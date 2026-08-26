/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      // Supabase Storage - exercise media (JPG + GIF)
      { protocol: 'https', hostname: 'xncmtbenoxqduksxpeee.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/profile/body_composition',
        destination: '/profile/body-composition',
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
