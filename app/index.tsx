import { useAuth } from "@/lib/store/auth";
import { useThemeStore } from "@/lib/store/themeStore";
import {
  Box,
  HStack,
  Spinner,
  Text,
  VStack
} from "@gluestack-ui/themed";
import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import { PackageIcon } from "lucide-react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native";

export default function SplashScreen() {
  const { session, isLoading } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  console.log("session", session);

  useEffect(() => {
    if (!isLoading) {
      // If there's a session, redirect to the main app, otherwise to login
      if (session) {
          router.replace("/(tabs)/list");
      } else {
        router.replace("/(auth)/login");
      }
    }
  }, [session, isLoading]);

  // Show splash screen while loading auth state
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient
          colors={isDark ? ['#111827', '#1F2937', '#0F172A'] : ['#E0F2FE', '#F0F9FF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <VStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            px="lg"
            space="lg"
          >
            {/* Logo Container with Modern Gradient */}
            <Box
              w="$32"
              h="$32"
              borderRadius="$3xl"
              bg={isDark ? "linear-gradient(135deg, #1E40AF 0%, #172554 100%)" : "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)"}
              alignItems="center"
              justifyContent="center"
              shadowColor="$primary600"
              shadowOffset={{ width: 0, height: 8 }}
              shadowOpacity={0.4}
              shadowRadius={16}
              mb="$8"
            >
              <PackageIcon size={72} color="white" />
            </Box>

            {/* App Title */}
            <VStack alignItems="center" space="$3" mb="$8">
              <Text
                fontSize="$6xl"
                fontWeight="$bold"
                color={isDark ? "$text50" : "$text900"}
                textAlign="center"
                letterSpacing={2}
              >
                AWB Mobile
              </Text>
              <Text
                fontSize="$lg"
                color={isDark ? "$text300" : "$text500"}
                textAlign="center"
                fontWeight="$medium"
                opacity={0.9}
              >
                Track & Capture Airwaybills Easily
              </Text>
            </VStack>

            {/* Loading Section */}
            <VStack alignItems="center" space="$4" mb="$6">
              <Spinner size="large" color="$primary600" />
              <Text
                fontSize="$sm"
                color={isDark ? "$text400" : "$text400"}
                textAlign="center"
                opacity={0.8}
              >
                Initializing system...
              </Text>
            </VStack>

            {/* Decorative Elements */}
            <HStack space="$3" opacity={0.6} mb="$8">
              <Box w="$3" h="$3" borderRadius="$full" bg="$primary600" />
              <Box w="$3" h="$3" borderRadius="$full" bg="$primary500" opacity={0.8} />
              <Box w="$3" h="$3" borderRadius="$full" bg="$primary600" />
            </HStack>

            {/* Version Info */}
            <VStack alignItems="center" space="sm" mt="auto" mb="$6">
              <Text
                fontSize="$xs"
                color="$text400"
                textAlign="center"
                opacity={0.7}
              >
                v1.0 · UI Only Mode
              </Text>
              <Text
                fontSize="$xs"
                color="$text400"
                textAlign="center"
                opacity={0.5}
              >
                © 2025 AWB Mobile
              </Text>
            </VStack>
          </VStack>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Return null or a minimal view while redirecting
  return null;
}