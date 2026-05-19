const frameAncestors = process.env.FRAME_ANCESTORS ?? "'self'";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // FRAME_ANCESTORS can be widened at deploy time for trusted embed hosts.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: `frame-ancestors ${frameAncestors}`,
        },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
};

module.exports = nextConfig;
