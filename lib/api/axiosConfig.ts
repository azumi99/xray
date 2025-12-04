import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

// Constants
const BASE_URL = "https://wmsapidev.goodang.com/";
// const BASE_URL = "https://tvd-api.goodang.com/";
const AUTH_TOKEN_KEY = "token";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Increased timeout to 15 seconds
  headers: {
    "Content-Type": "application/json",
    // Add additional headers for better debugging
    "Accept": "application/json",
  },
  // Enable debugging mode
  withCredentials: false,
});

// Request interceptor to add auth token and debug request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      console.log("=== REQUEST INTERCEPTOR DEBUG ===");
      console.log("URL:", config.baseURL + config.url);
      console.log("Method:", config.method?.toUpperCase());
      console.log("Full config URL:", config.url);
      console.log("Params:", config.params);
      console.log("Data:", config.data);
      console.log("Token exists:", !!token);
      console.log(
        "Token value:",
        token ? `${token.substring(0, 20)}...` : "null"
      );

      if (token) {
        config.headers = config.headers || {};
        // Match Flutter pattern: send token directly without Bearer prefix
        config.headers.token = token;
        console.log("Headers set:", {
          token: `${token.substring(0, 20)}...`,
        });
      } else {
        console.warn("⚠️ No token found! This might cause 400 error");
      }

      console.log("Final headers:", config.headers);
      console.log("=== END INTERCEPTOR DEBUG ===");
    } catch (error) {
      console.error("Error getting auth token in interceptor:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log("=== RESPONSE INTERCEPTOR SUCCESS ===");
    console.log("URL:", response.config.baseURL + response.config.url);
    console.log("Method:", response.config.method?.toUpperCase());
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("Response Data:", response.data);
    console.log("=== END INTERCEPTOR SUCCESS ===");
    return response;
  },
  (error) => {
    console.log("=== RESPONSE INTERCEPTOR ERROR ===");

    if (error.config) {
      console.log("Failed URL:", error.config.baseURL + error.config.url);
      console.log("Failed Method:", error.config.method?.toUpperCase());
    }

    if (axios.isAxiosError(error)) {
      if (!error.response) {
        console.error("Network error - no response received");
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);

        if (error.code === 'ECONNABORTED') {
          console.error("Request was aborted due to timeout");
        } else if (error.code === 'ERR_NETWORK') {
          console.error("Network connection failed");
        }

        return Promise.reject(new Error("NetworkError"));
      }

      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        console.error("Unauthorized - token may be expired");
        // Could trigger logout logic here
      }

      console.error("HTTP Error Status:", error.response?.status);
      console.error("HTTP Error Data:", error.response?.data);
    } else {
      console.error("Non-Axios error:", error);
    }

    console.log("=== END INTERCEPTOR ERROR ===");
    return Promise.reject(error);
  }
);

// Export configured axios instance and types
export { apiClient };
export type { AxiosRequestConfig };

// Export constants for use in other services
export { AUTH_TOKEN_KEY, BASE_URL };
