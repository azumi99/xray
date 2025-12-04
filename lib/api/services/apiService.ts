import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { performLogout } from "../../utils/logout";
import { apiClient, AUTH_TOKEN_KEY } from "../axiosConfig";

// Types
interface ApiResponse<T> {
  data?: T;
  error?: boolean;
  errorMessage?: string;
}

interface LoginResponse {
  token?: string;
  user_id?: number;
  name?: string;
}

// Constants
const USER_ID_KEY = "userId";
const NAME_KEY = "name";
const AUTH_ENDPOINT = "auth/login"; // Sesuaikan dengan endpoint login Anda

class ApiService {
  // Helper method untuk mendapatkan token
  private static async getAuthToken(): Promise<string | null> {
    // First, try to get token from Zustand store if available
    // If not available in Zustand, fall back to AsyncStorage
    try {
      // For now, we'll get token from AsyncStorage, which is synchronized with Zustand
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  // Check token validity
  static checkTokenValidity = async (): Promise<boolean> => {
    try {
      const token = await this.getAuthToken();
      console.log("Token check - Token exists:", !!token);
      console.log("Token check - Token value:", token ? `${token.substring(0, 20)}...` : "null");

      if (!token) {
        console.log("Token check: No token found");
        return false;
      }

      // Test token with a simple API call
      const response = await apiClient.get("rf/getlatestapk");
      console.log("Token check - API response status:", response.status);

      return response.status === 200;
    } catch (error: any) {
      console.error("Token validity check failed:", error);
      if (error.response?.status === 401) {
        console.log("Token check: Token is invalid or expired");
      }
      return false;
    }
  };

  // Helper method untuk mendapatkan user ID
  private static async getUserId(): Promise<number | null> {
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    return userId ? parseInt(userId) : null;
  }

  // Login Section
  static authenticateUser = async (
    email: string,
    password: string
  ): Promise<any> => {
    try {
      const response = await apiClient.post(AUTH_ENDPOINT, { email, password });

      // Store the token in AsyncStorage if received
      if (response.data && response.data.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
      }

      return response.data;
    } catch (error) {
      console.error("Authentication error:", error);
      if (axios.isAxiosError(error) && !error.response) {
        return "NetworkError";
      }
      return null;
    }
  };

  static logoutUser = async (navigation: any): Promise<void> => {
    await performLogout(navigation);
  };

  static fetch = async (endPoint: string): Promise<any> => {
    try {
      const response = await apiClient.get(endPoint);
      return response.data;
    } catch (error) {
      console.error("Fetch error:", error);
      if (axios.isAxiosError(error) && !error.response) {
        return "NetworkError";
      }
      return null;
    }
  };

  // Get Product
  static getProduct = async (body: any): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post("/rf/getproduct");

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Get product error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  // Inbound Section
  static getInbound = async (inboundID: string): Promise<any> => {
    try {
      // Debug logs
      console.log("=== GET INBOUND DEBUG ===");
      console.log("InboundID parameter:", inboundID);
      console.log("InboundID type:", typeof inboundID);
      console.log("InboundID length:", inboundID?.length);
      console.log("InboundID is empty/undefined:", !inboundID);

      // Validate input parameter
      if (!inboundID || inboundID.trim() === '') {
        throw new Error("InboundID cannot be empty");
      }

      // Check if token exists (without making additional API call)
      const token = await this.getAuthToken();
      console.log("Token exists:", !!token);
      console.log("Token value:", token ? `${token.substring(0, 20)}...` : "null");

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Make the API request with full URL for debugging
      const endpoint = `rf/inboundcheck/${inboundID}`;
      const fullUrl = `${apiClient.defaults.baseURL}${endpoint}`;
      console.log("Making request to:", fullUrl);
      console.log("Request method: GET");

      const response = await apiClient.get(endpoint);

      console.log("Request completed successfully!");
      console.log("Response status:", response.status);
      console.log("Response status text:", response.statusText);
      console.log("Response headers:", response.headers);
      console.log("Response data:", response.data);
      console.log("Response data type:", typeof response.data);
      console.log("=== END DEBUG ===");

      // Match Flutter pattern: only status 200 is success
      if (response.status === 200) {
        return response.data;
      } else {
        // Status 400 dan di atasnya (kecuali 200) adalah error
        throw new Error("Invalid GR ID");
      }
    } catch (error: any) {
      console.error("=== GET INBOUND ERROR ===");
      console.error("Error occurred in getInbound");

      if (error.code === 'ECONNABORTED') {
        console.error("Request timeout");
      } else if (error.code === 'NETWORK_ERROR') {
        console.error("Network error");
      }

      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Error config:", error.config);

      if (error.response) {
        console.error("Error response status:", error.response.status);
        console.error("Error response data:", error.response.data);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.error("No response received - request was made but no response");
        console.error("Request:", error.request);
      }

      console.error("=== END ERROR ===");

      throw new Error(error.message || "Unknown Error");
    }
  };

  static postInbound = async (body: any): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post("/rf/inboundcheck/store", body);

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Post inbound error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  // Putaway Section
  static getPutaway = async (grID: string): Promise<any> => {
    try {
      const response = await apiClient.get(
        `/rf/goodreceive/putawaylist/${grID}`
      );

      if (response.status < 200 || response.status > 400) {
        throw new Error("Invalid GR ID");
      }
      console.log(response.data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || "Unknown Error");
    }
  };

  static postPutaway = async (body: any): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post(
        "/rf/goodreceive/putawayforeground",
        body
      );

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Post putaway error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  // Checking Movement ID Status
  static checkingMovementIdStatus = async (pickingID: string): Promise<any> => {
    try {
      const response = await apiClient.post("/rf/picklist", { id: pickingID });

      if (response.status === 200) {
        console.log(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Checking movement status error:", error);
      return null;
    }
  };

  // Picking List By User
  static getPickingList = async (): Promise<any[]> => {
    try {
      const response = await apiClient.get("/rf/movementorder/getpicking");

      if (response.status === 200) {
        console.log(response.data);
        return response.data;
      }
      throw new Error("Invalid Data");
    } catch (error: any) {
      throw new Error(error.message || "Unknown Error");
    }
  };

  // Picking By List Section
  static getPicking = async (pickingID: string): Promise<any> => {
    try {
      const response = await apiClient.post("/rf/picklist", { id: pickingID });

      if (response.status === 200) {
        return response.data;
      }
      throw new Error("Invalid Picking ID");
    } catch (error: any) {
      throw new Error(error.message || "Unknown Error");
    }
  };

  static assignPicker = async (
    movement: number[]
  ): Promise<ApiResponse<boolean>> => {
    try {
      const userId = await this.getUserId();
      const response = await apiClient.post("/rf/movementorder/assign_picker", {
        movement,
        picker: userId,
      });

      if (response.status === 200 || response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Assign picker error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  static submitPickList = async (body: any): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post("/rf/picklist/submit", body);

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Submit pick list error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  // Movement Order Section
  static getMovement = async (movementID: string): Promise<any> => {
    try {
      const response = await apiClient.get(
        `/rf/movementorder/list/${movementID}`
      );

      if (response.status < 200 || response.status > 400) {
        throw new Error("Invalid Movement ID");
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || "Unknown Error");
    }
  };

  static movementConfirm = async (body: any): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post("/rf/movementorder/confirm", body);

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Movement confirm error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  static movementForeground = async (
    body: any
  ): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post(
        "/rf/movementorder/foreground",
        body
      );

      if (response.status === 201) {
        return { error: false, data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Movement foreground error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  static movementByLoc = async (body: any): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post(
        "/rf/movementorder/movementbylocation",
        body
      );

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Movement by location error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  // Outbound Section
  static getOutbound = async (outboundID: string): Promise<any> => {
    try {
      const response = await apiClient.get(`rf/outboundcheck/${outboundID}`);

      if (response.status < 200 || response.status > 420) {
        throw new Error("Invalid Movement ID");
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || "Unknown Error");
    }
  };

  static outboundSubmit = async (body: any): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post("/rf/outboundcheck/submit", body);

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Outbound submit error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  // Delivery Order Section
  static getDelivery = async (deliveryID: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/rf/checklist/${deliveryID}`);

      if (response.status < 200 || response.status > 420) {
        throw new Error("Invalid Delivery ID");
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || "Unknown Error");
    }
  };

  // Cycle Count Section
  static getCycleCount = async (cycleID: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/rf/stockcheck/${cycleID}`);

      if (response.status < 200 || response.status > 420) {
        throw new Error("Invalid Movement ID");
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || "Unknown Error");
    }
  };

  static cycleCountSubmit = async (
    body: any
  ): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post("/rf/stockcheck/submit", body);

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Cycle count submit error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  // Stock Transfer Section
  static changeStockType = async (body: any): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post(
        "/rf/stocktransfer/stocktype",
        body
      );

      if (response.status === 201) {
        return { data: true };
      } else if (response.status >= 400 && response.status < 420) {
        return { error: true, errorMessage: response.data };
      }
      return { error: true, errorMessage: "An Error Occurred..." };
    } catch (error) {
      console.error("Change stock type error:", error);
      return { error: true, errorMessage: "An Error Occurred..." };
    }
  };

  // Inventory List Section
  static getInventory = async (): Promise<any> => {
    try {
      console.log("=== GET INVENTORY DEBUG ===");
      console.log("Fetching inventory list...");

      // Check token first
      const token = await this.getAuthToken();
      console.log("Token exists:", !!token);

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await apiClient.post("rf/inventorieslist", {});

      console.log("Inventory response status:", response.status);
      console.log("Inventory response data:", response.data);
      console.log("=== END INVENTORY DEBUG ===");

      // Match Flutter pattern: only status 200 is success
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error("Failed to fetch inventory data");
      }
    } catch (error: any) {
      console.error("=== GET INVENTORY ERROR ===");
      console.error("Error message:", error.message);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("=== END INVENTORY ERROR ===");

      throw new Error(error.message || "Unknown Error");
    }
  };

  // Get Latest APK Version
  static getLatestApk = async (): Promise<any> => {
    try {
      const response = await apiClient.get("/rf/getlatestapk");

      if (response.status === 200) {
        return response.data;
      }
      throw new Error("No RF Version");
    } catch (error: any) {
      throw new Error(error.message || "Unknown Error");
    }
  };
}

export default ApiService;
