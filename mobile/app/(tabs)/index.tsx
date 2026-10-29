import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Box,
  Button,
  ButtonText,
  Card,
  HStack,
  Pressable,
  Text,
  VStack,
  LinearGradient,
  Avatar,
  AvatarFallbackText,
} from "@gluestack-ui/themed";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView } from "react-native";
import { useLogout } from "../../lib/utils/logout";
import { PackageIcon, CalendarIcon, CheckCircleIcon, AlertTriangleIcon } from 'lucide-react-native';

const operationItems = [
  {
    id: 1,
    link: "/(tabs)/inbound",
    icon: "arrow-down-bold-outline",
    title: "Inbound",
    subtitle: "Receiving",
    color: "rgba(59, 130, 246, 0.1)",
    iconColor: "#3B82F6",
  },
  {
    id: 2,
    link: "/(tabs)/outbound",
    icon: "arrow-up-bold-outline",
    title: "Outbound",
    subtitle: "Shipping",
    color: "rgba(16, 185, 129, 0.1)",
    iconColor: "#10B981",
  },
  {
    id: 3,
    link: "/(tabs)/putaway",
    icon: "tray-arrow-down",
    title: "Putaway",
    subtitle: "Storage",
    color: "rgba(245, 158, 11, 0.1)",
    iconColor: "#F59E0B",
  },
  {
    id: 4,
    link: "/inventory",
    icon: "package-variant-closed",
    title: "Inventory",
    subtitle: "Items List",
    color: "rgba(139, 92, 246, 0.1)",
    iconColor: "#8B5CF6",
  },
  {
    id: 5,
    link: "/(tabs)/stock",
    icon: "clipboard-list-outline",
    title: "Stock",
    subtitle: "Counting",
    color: "rgba(236, 72, 153, 0.1)",
    iconColor: "#EC4899",
  },
  {
    id: 6,
    link: "/delivery",
    icon: "truck-fast",
    title: "Delivery",
    subtitle: "Analytics",
    color: "rgba(16, 185, 129, 0.1)",
    iconColor: "#10B981",
  },
  {
    id: 7,
    link: "/movement",
    icon: "cursor-move",
    title: "Movement",
    subtitle: "Transfer",
    color: "rgba(59, 130, 246, 0.1)",
    iconColor: "#3B82F6",
  },
  {
    id: 8,
    link: "/picking",
    icon: "boxing-glove",
    title: "Picking",
    subtitle: "Orders",
    color: "rgba(249, 115, 22, 0.1)",
    iconColor: "#F97316",
  },
  {
    id: 9,
    link: "/cycle",
    icon: "refresh",
    title: "Cycle",
    subtitle: "Count",
    color: "rgba(6, 182, 212, 0.1)",
    iconColor: "#06B6D4",
  },
  {
    id: 10,
    link: "/pickingMulti",
    icon: "format-list-numbered",
    title: "Multi Pick",
    subtitle: "Bulk",
    color: "rgba(139, 92, 246, 0.1)",
    iconColor: "#8B5CF6",
  },
];

const statItems = [
  { id: 1, value: 24, label: "Tasks Today", icon: CalendarIcon, color: "#3B82F6" },
  { id: 2, value: 12, label: "Completed", icon: CheckCircleIcon, color: "#10B981" },
  { id: 3, value: 12, label: "Pending", icon: AlertTriangleIcon, color: "#F59E0B" },
  {
    id: 4,
    value: 85,
    label: "Efficiency",
    icon: PackageIcon,
    color: "#8B5CF6",
    suffix: "%",
  },
];

HomeScreen.options = { headerShown: false };

export default function HomeScreen() {
  const [countdownEnd, setCountdownEnd] = useState(new Date());
  const { handleLogout } = useLogout();

  useEffect(() => {
    const t = new Date();
    t.setHours(t.getHours() + 1);
    setCountdownEnd(t);
  }, []);

  const handleLogoutPress = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari aplikasi?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Keluar",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await handleLogout();
              if (!result.success)
                Alert.alert("Error", "Terjadi kesalahan saat logout.");
            } catch (e) {
              console.error("Logout error:", e);
              Alert.alert("Error", "Terjadi kesalahan saat logout.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderOperationItem = ({
    item,
  }: {
    item: (typeof operationItems)[number];
  }) => (
    <Link href={item.link} asChild>
      <Pressable $activeOpacity={0.7} flex={1} my="$1">
        {({ pressed }) => (
          <Card
            bg="$white"
            borderRadius="$2xl"
            p="$4"
            alignItems="center"
            justifyContent="center"
            space="$3"
            shadowColor="$backgroundLight500"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.1}
            shadowRadius={8}
            opacity={pressed ? 0.8 : 1}
            flex={1}
            borderWidth={1}
            borderColor="$borderLight100"
            style={{
              transform: [{ scale: pressed ? 0.97 : 1 }],
            }}
          >
            <Box
              w="$14"
              h="$14"
              borderRadius="$2xl"
              bg={item.color}
              alignItems="center"
              justifyContent="center"
              mb="$2"
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={28}
                color={item.iconColor}
              />
            </Box>
            <VStack alignItems="center" space="$1">
              <Text
                fontSize="$sm"
                fontWeight="$bold"
                color="$text900"
                textAlign="center"
              >
                {item.title}
              </Text>
              <Text fontSize="$xs" color="$text500" textAlign="center">
                {item.subtitle}
              </Text>
            </VStack>
          </Card>
        )}
      </Pressable>
    </Link>
  );

  const renderStatItem = ({ item }: { item: (typeof statItems)[number] }) => {
    const IconComponent = item.icon;
    return (
      <Card
        bg="$white"
        borderRadius="$2xl"
        p="$4"
        alignItems="center"
        justifyContent="center"
        shadowColor="$backgroundLight500"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.1}
        shadowRadius={8}
        flex={1}
        my="$1"
        borderWidth={1}
        borderColor="$borderLight100"
      >
        <Box
          w="$12"
          h="$12"
          borderRadius="$full"
          bg={`rgba(${parseInt(item.color.slice(1, 3), 16)}, ${parseInt(item.color.slice(3, 5), 16)}, ${parseInt(item.color.slice(5, 7), 16)}, 0.1)`}
          alignItems="center"
          justifyContent="center"
          mb="$2"
        >
          <IconComponent size={20} color={item.color} />
        </Box>
        <Text fontSize="$2xl" fontWeight="$bold" color={item.color as any}>
          {item.value}
          {item.suffix || ""}
        </Text>
        <Text
          fontSize="$xs"
          fontWeight="$500"
          color="$text800"
          textAlign="center"
        >
          {item.label}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView flex={1} bg="$primary50">
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        flex={1}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Header Section with Modern Gradient */}
        <VStack px="$6" pt="$6" pb="$8">
          <LinearGradient
            colors={['#0284C7', '#0369A1', '#075985']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 24,
              overflow: 'hidden',
            }}
          >
            <HStack justifyContent="space-between" alignItems="center">
              <VStack flex={1} mr="$4">
                <Text fontSize="$lg" fontWeight="$bold" color="$white" mb="$1">
                  Welcome Back! 👋
                </Text>
                <Text fontSize="$sm" color="$primary100" opacity={0.9}>
                  Here's what's happening today
                </Text>
              </VStack>
              <Avatar size="md" bg="$white">
                <AvatarFallbackText color="$primary600" fontWeight="$bold">JD</AvatarFallbackText>
              </Avatar>
            </HStack>

            {/* Stats Row */}
            <HStack mt="$6" space="$4">
              {statItems.map((item) => (
                <Box flex={1} key={item.id}>
                  <VStack alignItems="center">
                    <Text fontSize="$xl" fontWeight="$bold" color="$white">
                      {item.value}
                      {item.suffix || ""}
                    </Text>
                    <Text fontSize="$xs" color="$primary100" textAlign="center">
                      {item.label}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </HStack>
          </LinearGradient>
        </VStack>

        {/* Main Content Area */}
        <VStack
          px="$6"
          pt="$4"
          pb="$6"
          space="$5"
          flex={1}
          bg="transparent"
          minHeight="100%"
        >
          {/* Operations Section */}
          <VStack space="$4">
            <HStack justifyContent="space-between" alignItems="center" mb="$3">
              <Text fontSize="$xl" fontWeight="$bold" color="$text900">
                Operations
              </Text>
              <Text fontSize="$sm" color="$text500">
                {operationItems.length} modules
              </Text>
            </HStack>
            <VStack space="$4">
              {/* Create rows with 3 items each */}
              {Array.from({ length: Math.ceil(operationItems.length / 3) }).map(
                (_, rowIndex) => {
                  const start = rowIndex * 3;
                  const rowItems = operationItems.slice(start, start + 3);
                  return (
                    <HStack
                      key={rowIndex}
                      space="$3"
                      justifyContent="space-between"
                    >
                      {rowItems.map((item) => (
                        <Box key={item.id} flex={1} mx="$1">
                          {renderOperationItem({ item })}
                        </Box>
                      ))}
                    </HStack>
                  );
                }
              )}
            </VStack>
          </VStack>

          {/* Quick Actions Section */}
          <VStack space="$4" mt="$4">
            <Text fontSize="$xl" fontWeight="$bold" color="$text900" mb="$3">
              Quick Actions
            </Text>
            <HStack space="$3">
              <Button
                flex={1}
                size="md"
                variant="solid"
                bg="$primary600"
                borderRadius="$2xl"
                py="$3"
                onPress={handleLogoutPress}
              >
                <ButtonText
                  color="white"
                  fontWeight="$semibold"
                  fontSize="$sm"
                >
                  Logout
                </ButtonText>
              </Button>
              <Button
                flex={1}
                size="md"
                variant="outline"
                borderColor="$primary600"
                borderRadius="$2xl"
                py="$3"
                onPress={() => { }}
              >
                <ButtonText
                  color="$primary600"
                  fontWeight="$semibold"
                  fontSize="$sm"
                >
                  Settings
                </ButtonText>
              </Button>
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}