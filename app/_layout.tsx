import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/lib/store/auth";
import {
  Inter_400Regular,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { config } from "@gluestack-ui/config";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ApolloProvider } from "@apollo/client";
import client from "@/graphql/client";

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

  console.log("app session:", session);

  // Don't redirect from here - let the index.tsx handle routing

  // Tampilkan null saat loading state disimpan
  if (isLoading) {
    return null;
  }

  return (
    <GluestackUIProvider config={config}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            // Apply background color to ensure consistency
            contentStyle: { backgroundColor: '#F0F9FF' },
            // Apply padding for consistency
            cardStyle: { backgroundColor: '#F0F9FF' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="detail/[id]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
