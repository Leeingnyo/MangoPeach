/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Mark the aws-sdk module as external so it's not bundled.
    // We don't use the S3 functionality of unzipper.
    config.externals.push('@aws-sdk/client-s3');
    return config;
  },
}

module.exports = nextConfig