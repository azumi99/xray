import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Box, VStack, HStack, LinearGradient } from '@gluestack-ui/themed';
import { PackageSearchIcon, SearchIcon, PackageIcon, LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
}

const EmptyState = ({ title, subtitle, icon = PackageSearchIcon }: EmptyStateProps) => {
  const IconComponent = icon;

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
          colors={['#F0F9FF', '#E0F2FE']}
          style={styles.gradientCircle}
        />
        <Box
          style={styles.iconWrapper}
          bg="$background0"
        >
          <IconComponent size={48} color="#0284C7" />
        </Box>
      </Box>

      {/* Text Content */}
      <VStack alignItems="center" space="sm" maxW="$80">
        <Text
          fontSize="$2xl"
          fontWeight="$bold"
          textAlign="center"
          color="$text0"
          lineHeight="$2xl"
        >
          {title}
        </Text>
        <Text
          fontSize="$md"
          textAlign="center"
          color="$text400"
          lineHeight="$lg"
          style={styles.subtitle}
        >
          {subtitle}
        </Text>
      </VStack>

      {/* Decorative Elements */}
      <HStack space="sm" mt="$6" opacity={0.6}>
        <Box w="$2" h="$2" borderRadius="$full" bg="$primary300" />
        <Box w="$2" h="$2" borderRadius="$full" bg="$primary400" />
        <Box w="$2" h="$2" borderRadius="$full" bg="$primary600" />
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
  subtitle: {
    letterSpacing: 0.2,
  },
});

export default EmptyState;