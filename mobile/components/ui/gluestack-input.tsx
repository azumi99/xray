import { useThemeStore } from '@/lib/store/themeStore';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  className?: string;
}

const GluestackInput: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  className
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, className ? getStyleFromClassName(className) : {}]}>
      {label && (
        <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#374151' }]}>
          {label}
        </Text>
      )}
      <View style={[styles.inputContainer, { 
          backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
          borderColor: isDark ? '#374151' : '#D1D5DB' 
        }, error ? styles.errorBorder : {}]}>
        <TextInput
          style={[styles.input, { color: isDark ? '#F9FAFB' : '#1F2937' }]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
        />
      </View>
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  errorBorder: {
    borderColor: '#EF4444',
  },
  input: {
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});

// Helper function to convert Tailwind classes to React Native styles
const getStyleFromClassName = (className: string): any => {
  // This is a simplified implementation - in a real app you'd use NativeWind
  const styleMap: Record<string, any> = {
    'mb-4': { marginBottom: 16 },
    'mb-6': { marginBottom: 24 },
    'w-full': { width: '100%' },
  };

  return styleMap[className] || {};
};

export default GluestackInput;