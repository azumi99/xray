import { Box, HStack, VStack } from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon, PackageSearchIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useThemeStore } from '../lib/store/themeStore';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
}

const EmptyState = ({ title, subtitle, icon = PackageSearchIcon }: EmptyStateProps) => {
  const IconComponent = icon;
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <VStack
      alignItems="center"
      justifyContent="center"
      py="$16"
      px="$6"
      mt="$8"
    >
      {/* Gradient Circle for Icon */}
      <Box
        mb="$6"
        style={styles.iconContainer}
      >
        <LinearGradient
          colors={isDark ? ['#1F2937', '#111827'] : ['#F0F9FF', '#E0F2FE']}
          style={styles.gradientCircle}
        />
        <Box
          style={[styles.iconWrapper, isDark && styles.iconWrapperDark]}
          bg={isDark ? '$backgroundDark800' : '$background0'}
        >
          <IconComponent size={48} color={isDark ? '#3B82F6' : '#0284C7'} />
        </Box>
      </Box>

      {/* Text Content */}
      <VStack alignItems="center" space="sm" maxW="$80">
        <Text
          style={[
            styles.titleText,
            { color: isDark ? '#F9FAFB' : '#111827' }
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? '#9CA3AF' : '#6B7280' }
          ]}
        >
          {subtitle}
        </Text>
      </VStack>

      {/* Decorative Elements */}
      <HStack space="sm" mt="$6" opacity={0.6}>
        <Box w="$2" h="$2" borderRadius="$full" bg={isDark ? "$blue400" : "$primary300"} />
        <Box w="$2" h="$2" borderRadius="$full" bg={isDark ? "$blue500" : "$primary400"} />
        <Box w="$2" h="$2" borderRadius="$full" bg={isDark ? "$blue600" : "$primary600"} />
      </HStack>
    </VStack>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrapperDark: {
    shadowOpacity: 0.3,
    backgroundColor: '#1F2937'
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.2,
  },
});

export default EmptyState;