import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { VStack, FormControl, Input, InputField, Button, Box, HStack, Avatar, AvatarFallbackText, LinearGradient, Badge, Card } from '@gluestack-ui/themed';
import { UserIcon, ShieldIcon, LogOutIcon, KeyIcon, SettingsIcon, HelpCircleIcon, ChevronRightIcon, BarChartIcon, PackageIcon, CheckCircleIcon, ClockIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { sessionStorage } from '@/services/storage';
import StatusBarSafeArea from '@/components/StatusBarSafeArea';

const ProfileScreen = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await sessionStorage.removeSession();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert('Success', 'Password updated successfully (dummy)');
    setOldPassword('');
    setNewPassword('');
  };

  const menuItems = [
    {
      icon: SettingsIcon,
      label: 'Settings',
      onPress: () => console.log('Settings pressed'),
      color: '#0284C7',
    },
    {
      icon: HelpCircleIcon,
      label: 'Help & Support',
      onPress: () => console.log('Help pressed'),
      color: '#0284C7',
    },
  ];

  // Stats for the dashboard
  const stats = [
    { id: 1, value: "24", label: "Total AWB", icon: PackageIcon, color: "#3B82F6" },
    { id: 2, value: "18", label: "Completed", icon: CheckCircleIcon, color: "#10B981" },
    { id: 3, value: "6", label: "In Progress", icon: ClockIcon, color: "#F59E0B" },
    { id: 4, value: "85%", label: "Efficiency", icon: BarChartIcon, color: "#8B5CF6" },
  ];

  return (
    <Box flex={1} bg="$background0">
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
      />
      <StatusBarSafeArea>
        <ScrollView showsVerticalScrollIndicator={false}>
          <VStack p={"10"} space="lg">
            {/* Enhanced Header with Gradient */}
            <LinearGradient
              colors={['#0284C7', '#0369A1', '#075985']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 24,
                overflow: 'hidden',
                marginBottom: 20,
              }}
            >
              <View style={{ zIndex: 10 }}>
                <VStack alignItems="center" space="md">
                  <Box
                    position="relative"
                  >
                    <Avatar
                      size="4xl"
                      bg="rgba(255,255,255,0.2)"
                      borderWidth={3}
                      borderColor="rgba(255,255,255,0.5)"
                      style={styles.avatar}
                    >
                      <AvatarFallbackText fontSize="$5xl" fontWeight="$bold" color="white">
                        JD
                      </AvatarFallbackText>
                    </Avatar>
                    <Box
                      position="absolute"
                      bottom={8}
                      right={8}
                      w="$8"
                      h="$8"
                      borderRadius="$full"
                      bg="$success500"
                      borderWidth={3}
                      borderColor="white"
                    />
                  </Box>

                  <VStack alignItems="center" space="sm">
                    <Text fontSize="$4xl" fontWeight="$bold" color="white">
                      John Doe
                    </Text>
                    <Text fontSize="$lg" color="$primary100" textAlign="center">
                      john.doe@example.com
                    </Text>
                    <Badge
                      bg="rgba(255, 255, 255, 0.2)"
                      px="$5"
                      py="$2"
                      borderRadius="$full"
                      borderWidth={1}
                      borderColor="rgba(255, 255, 255, 0.3)"
                    >
                      <Text color="white" fontWeight="$600" fontSize="$sm">
                        Active Member
                      </Text>
                    </Badge>
                  </VStack>
                </VStack>

                {/* Quick Stats */}
                <HStack justifyContent="space-around" mt="xl">
                  {stats.map((stat) => {
                    const IconComponent = stat.icon;
                    return (
                      <VStack alignItems="center" key={stat.id} space="xs">
                        <Box
                          w="$14"
                          h="$14"
                          borderRadius="$full"
                          bg="rgba(255,255,255,0.2)"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <IconComponent size={24} color="white" />
                        </Box>
                        <Text fontSize="$xl" fontWeight="$bold" color="white" mt="sm">
                          {stat.value}
                        </Text>
                        <Text fontSize="$xs" color="$primary100" textAlign="center">
                          {stat.label}
                        </Text>
                      </VStack>
                    );
                  })}
                </HStack>
              </View>
            </LinearGradient>

            {/* Content Area */}
            <VStack space="lg">
              {/* Menu Items */}
              <Card bg="$white" borderRadius="$2xl" p={"10"} shadow="$2" borderWidth={1} borderColor="$borderLight100">
                <VStack space="md">
                {menuItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (

                    <TouchableOpacity
                      key={index}
                      onPress={item.onPress}
                      activeOpacity={0.7}
                    >
                      <HStack alignItems="center" space="md" p="lg" pl="md">
                        <Box
                          w="$12"
                          h="$12"
                          borderRadius="$lg"
                          bg="rgba(2, 132, 199, 0.1)"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <IconComponent size={20} color={item.color} />
                        </Box>
                        <Text fontSize="$md" color="$text0" flex={1}>
                          {item.label}
                        </Text>
                        <ChevronRightIcon size={18} color="#D1D5DB" />
                      </HStack>
                      {index < menuItems.length - 1 && (
                        <Box ml="$16" w="85%" h={StyleSheet.hairlineWidth} bg="$borderLight100" />
                      )}
                    </TouchableOpacity>
                  );
                })}
                </VStack>
              </Card>

              {/* Security Section */}
              <Card bg="$white" borderRadius="$2xl" p={"10"} shadow="$2" borderWidth={1} borderColor="$borderLight100">
                <HStack alignItems="center" space="sm" mb="lg">
                  <Box
                    w="$12"
                    h="$12"
                    borderRadius="$lg"
                    bg="rgba(2, 132, 199, 0.1)"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <ShieldIcon size={22} color="#0284C7" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$600" fontSize="$lg" color="$text0">
                      Security Settings
                    </Text>
                    <Text fontSize="$sm" color="$text400">
                      Manage your account security
                    </Text>
                  </VStack>
                </HStack>

                <VStack space="md" p={"10"}>
                  <FormControl mb="md">
                    <Text fontSize="$sm" fontWeight="$600" color="$text400" mb="xs">
                      Current Password
                    </Text>
                    <Input
                      borderRadius="$lg"
                      borderColor="$borderLight100"
                      borderWidth={1}
                      py="sm"
                      px="md"
                      bg="$background50"
                      shadow="$1"
                    >
                      <InputField
                        placeholder="Enter current password"
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        secureTextEntry
                        color="$text0"
                        fontSize="$md"
                      />
                    </Input>
                  </FormControl>

                  <FormControl mb="md">
                    <Text fontSize="$sm" fontWeight="$600" color="$text400" mb="xs">
                      New Password
                    </Text>
                    <Input
                      borderRadius="$lg"
                      borderColor="$borderLight100"
                      borderWidth={1}
                      py="sm"
                      px="md"
                      bg="$background50"
                      shadow="$1"
                    >
                      <InputField
                        placeholder="Enter new password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        color="$text0"
                        fontSize="$md"
                      />
                    </Input>
                  </FormControl>

                  <Button
                    size="md"
                    variant="solid"
                    bg="linear-gradient(135deg, #0284C7 0%, #0369A1 100%)"
                    borderRadius="$lg"
                    py="sm"
                    onPress={handleChangePassword}
                    shadow="$2"
                    _pressed={{ bg: "linear-gradient(135deg, #0369A1 0%, #075985 100%)" }}
                  >
                    <HStack alignItems="center" space="sm">
                      <KeyIcon size={20} color="white" />
                      <Text fontWeight="$600" fontSize="$md" style={{ color: 'white' }}>
                        Update Password
                      </Text>
                    </HStack>
                  </Button>
                </VStack>
              </Card>

              {/* Logout Section */}
              <Card bg="$white" borderRadius="$2xl" p="lg" shadow="$2" borderWidth={1} borderColor="$borderLight100">
                <Button
                  variant="outline"
                  action="negative"
                  borderRadius="$lg"
                  py="sm"
                  onPress={handleLogout}
                  borderWidth={1}
                  borderColor="$red200"
                  bg="$red50"
                >
                  <HStack alignItems="center" space="sm">
                    <LogOutIcon size={20} color="#DC2626" />
                    <Text color="#DC2626" fontWeight="$600" fontSize="$md">
                      Sign Out
                    </Text>
                  </HStack>
                </Button>
              </Card>

              {/* Add padding to account for bottom navigation */}
              <Box h="72" />
            </VStack>
          </VStack>
        </ScrollView>
      </StatusBarSafeArea>
    </Box>
  );
};

const styles = {
  avatar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: {
    borderRadius: 12,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

export default ProfileScreen;