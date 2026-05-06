/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for MiniPay iframe / WebView compatibility
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "ALLOWALL" },
        { key: "Content-Security-Policy", value: "frame-ancestors *" },
      ],
    },
  ],
};

module.exports = nextConfig;
