import React, { useState } from 'react';
import { SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { VStack, Input, InputField, Button, Box, HStack, FormControl, FormControlLabel, FormControlLabelText, Link, Text } from '@gluestack-ui/themed';
import { useRouter } from 'expo-router';
import { UserIcon, EyeIcon, EyeOffIcon } from 'lucide-react-native';
import { useAuth } from '@/lib/store/auth';
import { login as apiLogin } from '@/lib/api/authAPI';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

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
          id: response.user?.id || ''
        };

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F9FF' }}>
      <VStack flex={1} justifyContent="center" px="$5" space="lg">
        {/* Logo and Header */}
        <VStack alignItems="center" space="xl">
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
          <Text fontSize={30} fontWeight="$bold" color="$text900">
            Welcome Back
          </Text>
          <Text fontSize="$md" color="$text500" textAlign="center">
            Sign in to your account to continue
          </Text>
        </VStack>

        {/* Login Form */}
        <VStack space="md">
          <FormControl>
            <FormControlLabel >
              <FormControlLabelText fontWeight="500" color="$text0">Email</FormControlLabelText>
            </FormControlLabel>
            <Input
              borderRadius="$full"
              borderColor="$borderLight300"
              borderWidth={1}
              py="sm"
              px="md"
            >
              <InputField
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                color="$text0"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </Input>
          </FormControl>

          <FormControl>
            <FormControlLabel mb="sm">
              <FormControlLabelText fontWeight="500" color="$text0">Password</FormControlLabelText>
            </FormControlLabel>
            <Input
              borderRadius="$full"
              borderColor="$borderLight300"
              borderWidth={1}
              py="sm"
              px="md"
            >
              <InputField
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                color="$text0"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 12, top: 10 }}
                onPress={() => setShowPassword(!showPassword)}
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
                  borderColor="$borderLight300"
                  bg="$background0"
                  alignItems="center"
                  justifyContent="center"
                >
                  {/* Checkbox would go here */}
                </Box>
                <Text fontSize="$sm" color="$text700">Remember me</Text>
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
          >
            <Text color="white" fontWeight="600">Sign In</Text>
          </Button>

          {/* Sign Up Link */}
          <HStack justifyContent="center" mt="lg">
            <Text fontSize="$sm" color="$text500">Don't have an account? </Text>
            <TouchableOpacity onPress={() => Alert.alert('Sign Up', 'Registration functionality would go here')}>
              <Text fontSize="$sm" color="$primary600" fontWeight="600">Sign Up</Text>
            </TouchableOpacity>
          </HStack>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
};

export default LoginScreen;