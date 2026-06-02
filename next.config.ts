import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/((?!api/webhooks/whatsapp).*)', // Apply to all routes, bypass whatsapp webhook GET verifiers to be safe
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
