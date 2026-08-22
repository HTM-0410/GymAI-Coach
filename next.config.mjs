/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      // Supabase Storage — exercise media (JPG + GIF)
      { protocol: 'https', hostname: 'xncmtbenoxqduksxpeee.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
};
export default nextConfig;