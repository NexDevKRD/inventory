import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: 'http://localhost:4000/api/v1/:path*' }];
  },
};

export default withNextIntl(nextConfig);
