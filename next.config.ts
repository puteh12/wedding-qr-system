import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '10.8.0.70',
    '10.10.0.170',
    'localhost',
    '127.0.0.1',
  ],
}

export default nextConfig