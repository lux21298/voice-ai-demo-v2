/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for react-media-recorder on server-side
    if (isServer) {
      config.externals.push({
        'react-media-recorder': 'react-media-recorder'
      })
    }
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['react-media-recorder']
  }
}

module.exports = nextConfig
