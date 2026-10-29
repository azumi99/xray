import { login as apiLogin } from '@/lib/api/authAPI';
import { useAuth } from '@/lib/store/auth';
import { useThemeStore } from '@/lib/store/themeStore';
import { Box, Button, FormControl, FormControlLabel, FormControlLabelText, HStack, Input, InputField, Link, Text, VStack } from '@gluestack-ui/themed';
import { useRouter } from 'expo-router';
import { EyeIcon, EyeOffIcon, UserIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Detox testIDs
const TEST_IDS = {
  EMAIL_INPUT: 'email_input',
  PASSWORD_INPUT: 'password_input',
  LOGIN_BUTTON: 'login_button',
  SHOW_PASSWORD_BUTTON: 'show_password_button',
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#F0F9FF',
      paddingTop: Platform.OS === 'android' ? insets.top : 0,
    },
    keyboardContainer: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) : 20,
    },
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiLogin({ email, password });

      console.log('Login response:', response); // Debug log

      // Store the token and user data in the auth state
      // Safely access response properties
      if (response && response.token) {
        const userData = {
          name: response.user?.name || '',
          id: Number(response.user?.id),
          email: response.user?.email || '',
        };
        console.log('User data extracted:', response); // Debug log

        login(response.token, userData);

        // Navigate to the main app
        router.replace('/(tabs)/list');
      } else {
        throw new Error('Invalid login response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 }}>
            {/* Logo and Header */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Box
                w="$20"
                h="$20"
                borderRadius="$3xl"
                bg="$primary600"
                alignItems="center"
                justifyContent="center"
              >
                <UserIcon size={36} color="white" />
              </Box>
              <Text fontSize={30} fontWeight="$bold" color={isDark ? "$text50" : "$text900"} style={{ marginTop: 20 }}>
                Welcome Back
              </Text>
              <Text fontSize="$md" color={isDark ? "$text300" : "$text500"} textAlign="center" style={{ marginTop: 8 }}>
                Sign in to your account to continue
              </Text>
            </View>

            {/* Login Form */}
            <VStack space="md">
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText fontWeight="500" color={isDark ? "$text50" : "$text0"}>Email</FormControlLabelText>
                </FormControlLabel>
                <Input
                  borderRadius="$full"
                  borderColor={isDark ? "$borderDark700" : "$borderLight300"}
                  borderWidth={1}
                  py="sm"
                  px="md"
                  bg={isDark ? "$backgroundDark800" : "transparent"}
                >
                  <InputField
                    placeholder="Enter your email"
                    placeholderTextColor={isDark ? "$text400" : "$text500"}
                    value={email}
                    onChangeText={setEmail}
                    color={isDark ? "$text50" : "$text0"}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </Input>
              </FormControl>

              <FormControl>
                <FormControlLabel mb="sm">
                  <FormControlLabelText fontWeight="500" color={isDark ? "$text50" : "$text0"}>Password</FormControlLabelText>
                </FormControlLabel>
                <Input
                  borderRadius="$full"
                  borderColor={isDark ? "$borderDark700" : "$borderLight300"}
                  borderWidth={1}
                  py="sm"
                  px="md"
                   bg={isDark ? "$backgroundDark800" : "transparent"}
                >
                  <InputField
                    placeholder="Enter your password"
                    placeholderTextColor={isDark ? "$text400" : "$text500"}
                    value={password}
                    onChangeText={setPassword}
                    color={isDark ? "$text50" : "$text0"}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 12, top: 10 }}
                    onPress={() => setShowPassword(!showPassword)}
                    testID={TEST_IDS.SHOW_PASSWORD_BUTTON}
                  >
                    {showPassword ? (
                      <EyeOffIcon size={20} color="#9CA3AF" />
                    ) : (
                      <EyeIcon size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                </Input>
              </FormControl>

              {/* Remember Me and Forgot Password */}
              <HStack justifyContent="space-between" alignItems="center" mt="sm">
                <TouchableOpacity>
                  <HStack alignItems="center" space="sm">
                    <Box
                      w="$5"
                      h="$5"
                      borderRadius="$sm"
                      borderWidth={1}
                      borderColor={isDark ? "$borderDark700" : "$borderLight300"}
                      bg={isDark ? "$backgroundDark800" : "$background0"}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {/* Checkbox would go here */}
                    </Box>
                    <Text fontSize="$sm" color={isDark ? "$text300" : "$text700"}>Remember me</Text>
                  </HStack>
                </TouchableOpacity>

                <Link onPress={() => Alert.alert('Forgot Password', 'Password reset functionality would go here')}>
                  <Text fontSize="$sm" color="$primary600">Forgot password?</Text>
                </Link>
              </HStack>

              {/* Login Button */}
              <Button
                mt="lg"
                size="lg"
                borderRadius="$full"
                py="md"
                bg="$primary600"
                onPress={handleLogin}
                testID={TEST_IDS.LOGIN_BUTTON}
                isDisabled={isLoading}
              >
                <Text color="white" fontWeight="600">{isLoading ? 'Signing in...' : 'Sign In'}</Text>
              </Button>

              {/* Sign Up Link */}
              <HStack justifyContent="center" mt="lg">
                <Text fontSize="$sm" color={isDark ? "$text400" : "$text500"}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => Alert.alert('Sign Up', 'Registration functionality would go here')}>
                  <Text fontSize="$sm" color="$primary600" fontWeight="600">Sign Up</Text>
                </TouchableOpacity>
              </HStack>
            </VStack>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;