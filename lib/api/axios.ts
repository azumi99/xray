import axios from "axios";

const API_BASE_URL = "https://wmsapidev.goodang.com/";
// const API_BASE_URL = "https://tvd-api.goodang.com/";

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Retrieve token from storage (using async/await approach)
    // In a real app, you would get the auth token from your auth store
    // const token = getAuthToken();

    // For now, we'll just return the config as is
    // Uncomment the following when you have auth implementation
    /*
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    */

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Return the response if successful
    return response;
  },
  (error) => {
    // Handle specific error cases here
    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      console.log("Unauthorized access - redirect to login");
      // In real app: router.replace('/login');
    } else if (error.response?.status === 403) {
      // Handle forbidden access
      console.log("Forbidden access");
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.log("Server error");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
