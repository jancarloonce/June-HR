const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
    GOOGLE_SHEET_URL: process.env.GOOGLE_SHEET_URL,
  },
}

module.exports = nextConfig

