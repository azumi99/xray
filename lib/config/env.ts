export default {
  API_DEV: process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:3000",
  API_PROD:
    process.env.EXPO_PUBLIC_API_PROD_URL || "https://your-production-api.com",
};
