/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        stream: false,
        crypto: false,
        fs: false,
        path: false,
        os: false,
        util: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
        buffer: 'buffer',
        process: 'process/browser',
      };

      // Handle "node:" scheme imports
      config.module.rules.push({
        test: /\.(js|mjs)$/,
        include: /node_modules\/@libp2p/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              ['babel-plugin-transform-node-env-inline'],
              ['@babel/plugin-transform-modules-commonjs'],
            ],
          },
        },
      });
    }
    return config;
  },
};

export default nextConfig;
