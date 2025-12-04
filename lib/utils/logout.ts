import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useUserStore } from "../store/userStore";

// Fungsi untuk logout yang membersihkan semua state yang tersimpan
export const performLogout = async (navigation?: any) => {
  try {
    console.log("Starting logout process...");

    // 1. Clear Zustand user store
    const { clearAuth } = useUserStore.getState();
    clearAuth();
    console.log("Zustand user store cleared");

    // 2. Clear AsyncStorage items
    const keysToRemove = [
      "token", // Token autentikasi
      "userId", // User ID
      "name", // User name
      "user-storage", // Zustand persisted storage
      // Tambahkan keys lain jika ada
    ];

    await Promise.all(
      keysToRemove.map(async (key) => {
        try {
          await AsyncStorage.removeItem(key);
          console.log(`Removed ${key} from AsyncStorage`);
        } catch (error) {
          console.warn(`Failed to remove ${key}:`, error);
        }
      })
    );

    // 3. Clear all AsyncStorage (opsional - lebih aggressive)
    // await AsyncStorage.clear();

    console.log("All states cleared successfully");

    // 4. Navigate to login screen
    if (navigation) {
      // Jika ada navigation object, gunakan replace
      navigation.replace("Login");
    } else {
      // Gunakan router dari expo-router
      router.replace("/(auth)");
    }

    console.log("Navigation to login completed");

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);

    // Fallback: tetap coba navigasi ke login
    try {
      if (navigation) {
        navigation.replace("Login");
      } else {
        router.replace("/(auth)");
      }
    } catch (navError) {
      console.error("Navigation error:", navError);
    }

    return { success: false, error };
  }
};

// Hook untuk menggunakan logout di components
export const useLogout = () => {
  const handleLogout = async (navigation?: any) => {
    const result = await performLogout(navigation);
    router.replace("/(auth)/login");
    return result;
  };

  return { handleLogout };
};
