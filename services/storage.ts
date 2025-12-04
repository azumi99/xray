import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple storage wrapper for session management
export const storage = {
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item:', error);
    }
  },

  getItem: async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.error('Error getting item:', error);
      return null;
    }
  },

  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  },

  clearAll: async () => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

// Specific session-related functions
export const sessionStorage = {
  setSession: async (session: any) => {
    await storage.setItem('session', JSON.stringify(session));
  },

  getSession: async () => {
    const sessionStr = await storage.getItem('session');
    return sessionStr ? JSON.parse(sessionStr) : null;
  },

  removeSession: async () => {
    await storage.removeItem('session');
  },
};