import AsyncStorage from "@react-native-async-storage/async-storage";
import { LoginPayload } from "../../types/profile";
import { apiClient, AUTH_TOKEN_KEY } from "../axiosConfig";

const getLogin = async ({ email, password }: LoginPayload) => {
  try {
    const response = await apiClient.post("auth/login", {
      email: email,
      password: password,
    });

    // Store token using the consistent AUTH_TOKEN_KEY
    if (response?.data?.token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
    }

    return response.data;
  } catch (error) {
    console.log("Login error:", error);
    // Return network error for axios errors without response
    if (error?.message === "NetworkError") {
      return { message: "NetworkError" };
    }
    return { message: "error login" };
  }
};

export { getLogin };
