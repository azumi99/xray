import { useThemeStore } from '@/lib/store/themeStore';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const GluestackButton: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          button: 'bg-blue-500 active:bg-blue-600',
          text: 'text-white'
        };
      case 'secondary':
        return {
          button: isDark ? 'bg-gray-700 active:bg-gray-600' : 'bg-gray-200 active:bg-gray-300',
          text: isDark ? 'text-gray-100' : 'text-gray-800'
        };
      case 'outline':
        return {
          button: 'bg-transparent border border-blue-500',
          text: 'text-blue-500'
        };
      default:
        return {
          button: 'bg-blue-500',
          text: 'text-white'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'px-3 py-1.5 rounded-lg',
          text: 'text-sm'
        };
      case 'lg':
        return {
          button: 'px-6 py-3 rounded-xl',
          text: 'text-lg'
        };
      default: // md
        return {
          button: 'px-4 py-2 rounded-lg',
          text: 'text-base'
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || loading;
  const buttonStyle = [
    StyleSheet.flatten([
      {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDisabled ? 0.6 : 1,
      },
      ...variantStyles.button.split(' ').map(cls => getStyleFromClassName(cls) as any),
      ...sizeStyles.button.split(' ').map(cls => getStyleFromClassName(cls) as any)
    ])
  ];

  const textStyle = [
    ...variantStyles.text.split(' ').map(cls => getStyleFromClassName(cls) as any),
    ...sizeStyles.text.split(' ').map(cls => getStyleFromClassName(cls) as any)
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#ffffff' : (isDark ? '#60A5FA' : '#3b82f6')}
        />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

// Helper function to convert Tailwind classes to React Native styles
const getStyleFromClassName = (className: string): ViewStyle | TextStyle => {
  // This is a simplified implementation - in a real app you'd use NativeWind
  const styleMap: Record<string, ViewStyle | TextStyle> = {
    'bg-blue-500': { backgroundColor: '#3b82f6' },
    'active:bg-blue-600': { backgroundColor: '#2563eb' },
    'bg-gray-200': { backgroundColor: '#e5e7eb' },
    'active:bg-gray-300': { backgroundColor: '#d1d5db' },
    'bg-gray-700': { backgroundColor: '#374151' },
    'active:bg-gray-600': { backgroundColor: '#4B5563' },
    'bg-transparent': { backgroundColor: 'transparent' },
    'border': { borderWidth: 1 },
    'border-blue-500': { borderColor: '#3b82f6' },
    'text-white': { color: '#ffffff' },
    'text-gray-800': { color: '#1f2937' },
    'text-gray-100': { color: '#F3F4F6' },
    'text-blue-500': { color: '#3b82f6' },
    'px-3': { paddingHorizontal: 12 },
    'px-4': { paddingHorizontal: 16 },
    'px-6': { paddingHorizontal: 24 },
    'py-1.5': { paddingVertical: 6 },
    'py-2': { paddingVertical: 8 },
    'py-3': { paddingVertical: 12 },
    'rounded-lg': { borderRadius: 8 },
    'rounded-xl': { borderRadius: 12 },
    'flex-row': { flexDirection: 'row' },
    'items-center': { alignItems: 'center' },
    'justify-center': { justifyContent: 'center' },
    'text-sm': { fontSize: 14 },
    'text-base': { fontSize: 16 },
    'text-lg': { fontSize: 18 },
    'opacity-50': { opacity: 0.5 },
  };

  return styleMap[className] || {};
};

export default GluestackButton;