const nextConfig = {
  experimental: {},
  async rewrites() {
    // Local dev only — production serves /api/* from the Python function
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
