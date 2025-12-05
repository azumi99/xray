import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

// Constants
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const AUTH_TOKEN_KEY = "token";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    "Content-Type": "application/json",
    // Add additional headers for better debugging
    "Accept": "application/json",
  },
  // Enable debugging mode
  withCredentials: false,
  // For development: bypass SSL verification if needed
  // Remove this in production!
  validateStatus: (status) => status < 500, // Accept all status codes below 500
});

// Request interceptor to add auth token and debug request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      console.log("=== REQUEST INTERCEPTOR DEBUG ===");
      console.log("URL:", (config.baseURL || "") + (config.url || ""));
      console.log("Method:", config.method?.toUpperCase());
      console.log("Full config URL:", config.url || "");
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
    console.log("URL:", (response.config.baseURL || "") + (response.config.url || ""));
    console.log("Method:", response.config.method?.toUpperCase());
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("Response Data:", response.data);
    console.log("=== END INTERCEPTOR SUCCESS ===");
    return response;
  },
  async (error) => {
    console.log("=== RESPONSE INTERCEPTOR ERROR ===");

    if (error.config) {
      console.log("Failed URL:", (error.config.baseURL || "") + (error.config.url || ""));
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

        // IMPORTANT: Reject with the original error so we can check properties later
        return Promise.reject(error);
      }

      // Handle 401 Unauthorized - Token expired
      if (error.response?.status === 401) {
        console.error("Unauthorized - token expired, clearing auth state");

        // Clear token from AsyncStorage
        try {
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          await AsyncStorage.removeItem("userId");
          await AsyncStorage.removeItem("name");
          await AsyncStorage.removeItem("auth-storage");
          console.log("Cleared expired token from storage");

          // Clear Zustand auth store
          const { useAuthStore } = await import("../store/auth");
          const { logout } = useAuthStore.getState();
          logout();
          console.log("Cleared auth from Zustand store");

          // Navigate to login - using dynamic import to avoid circular dependency
          const { router } = await import("expo-router");
          router.replace("/(auth)/login");
        } catch (cleanupError) {
          console.error("Error during auth cleanup:", cleanupError);
        }
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

// Authentication API functions
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface LogoutResponse {
  success: boolean;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Login function - API call
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    console.log('=== LOGIN API CALL ===');
    console.log('Login credentials:', { email: credentials.email });

    const response = await apiClient.post('/auth/login', credentials);
    console.log('Login response:', response.data);

    // Save token to AsyncStorage
    if (response.data.token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
      // Save user info too
      if (response.data.user) {
        await AsyncStorage.setItem('userId', response.data.user.id);
        await AsyncStorage.setItem('name', response.data.user.name);
      }
    }

    return response.data;
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
};

// Register function - API call
export const register = async (credentials: RegisterCredentials): Promise<RegisterResponse> => {
  try {
    console.log('=== REGISTER API CALL ===');
    console.log('Register credentials:', { email: credentials.email, name: credentials.name });

    const response = await apiClient.post('/auth/register', credentials);
    console.log('Register response:', response.data);

    // Save token to AsyncStorage
    if (response.data.token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
      // Save user info too
      if (response.data.user) {
        await AsyncStorage.setItem('userId', response.data.user.id);
        await AsyncStorage.setItem('name', response.data.user.name);
      }
    }

    return response.data;
  } catch (error) {
    console.error('Register API error:', error);
    throw error;
  }
};

// Logout function - API call
export const logoutAPI = async (): Promise<LogoutResponse> => {
  try {
    console.log('=== LOGOUT API CALL ===');

    const response = await apiClient.post('/auth/logout');
    console.log('Logout response:', response.data);

    // Clear token from AsyncStorage
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('name');
    await AsyncStorage.removeItem('auth-storage');

    // Clear Zustand auth store
    const { useAuthStore } = await import("../store/auth");
    const { logout } = useAuthStore.getState();
    logout();

    // Navigate to login - using dynamic import to avoid circular dependency
    const { router } = await import("expo-router");
    router.replace("/(auth)/login");

    return response.data;
  } catch (error) {
    console.error('Logout API error:', error);

    // Even if the API call fails, still clear local storage and navigate away
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('name');
    await AsyncStorage.removeItem('auth-storage');

    // Clear Zustand auth store
    const { useAuthStore } = await import("../store/auth");
    const { logout } = useAuthStore.getState();
    logout();

    // Navigate to login - using dynamic import to avoid circular dependency
    const { router } = await import("expo-router");
    router.replace("/(auth)/login");

    // Return a success response even on API failure to allow client-side logout
    return { success: true };
  }
};

// Refresh token function - API call
export const refreshToken = async (): Promise<{ token: string }> => {
  try {
    console.log('=== REFRESH TOKEN API CALL ===');

    const response = await apiClient.post('/auth/refresh');
    console.log('Refresh token response:', response.data);

    // Update token in AsyncStorage
    if (response.data.token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
    }

    return response.data;
  } catch (error) {
    console.error('Refresh token API error:', error);
    throw error;
  }
};

// Get current user function - API call
export const getCurrentUser = async () => {
  try {
    console.log('=== GET CURRENT USER API CALL ===');

    const response = await apiClient.get('/auth/me');
    console.log('Get current user response:', response.data);

    return response.data;
  } catch (error) {
    console.error('Get current user API error:', error);
    throw error;
  }
};
