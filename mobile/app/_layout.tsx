import client from "@/graphql/client";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/lib/store/auth";
import { useThemeStore } from "@/lib/store/themeStore";
import { ApolloProvider } from "@apollo/client";
import {
  Inter_400Regular,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { config } from "@gluestack-ui/config";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const [loaded] = useFonts({
    // Here you would load NeoSans font when available
    // 'NeoSans-Regular': require('../assets/fonts/NeoSansStd-Regular.otf'),
    // 'NeoSans-Bold': require('../assets/fonts/NeoSansStd-Bold.otf'),
    Inter_900Black,
    Inter_400Regular,
    Inter_700Bold,
  });

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ApolloProvider client={client}>
        <RootLayoutNav />
      </ApolloProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  console.log("app session:", session);

  // Don't redirect from here - let the index.tsx handle routing

  // Tampilkan null saat loading state disimpan
  if (isLoading) {
    return null;
  }

  return (
    <GluestackUIProvider config={config}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? '#111827' : '#F0F9FF' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detail/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </GluestackUIProvider>
  );
}
