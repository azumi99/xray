// Modern theme configuration
export const modernTheme = {
  colors: {
    // Primary colors with modern gradient capabilities
    primary50: '#f0f9ff',
    primary100: '#e0f2fe',
    primary200: '#bae6fd',
    primary300: '#7dd3fc',
    primary400: '#38bdf8',
    primary500: '#0ea5e9',
    primary600: '#0284c7',
    primary700: '#0369a1',
    primary800: '#075985',
    primary900: '#0c4a6e',
    
    // Background and surface colors
    background0: '#ffffff',
    background50: '#f9fafb',
    background100: '#f3f4f6',
    background200: '#e5e7eb',
    
    // Text colors
    text0: '#030712',
    text50: '#111827',
    text100: '#1f2937',
    text200: '#374151',
    text300: '#4b5563',
    text400: '#6b7280',
    text500: '#9ca3af',
    
    // Border colors
    borderLight200: '#e5e7eb',
    borderLight300: '#d1d5db',
    
    // Additional modern colors
    success50: '#f0fdf4',
    success500: '#22c55e',
    danger50: '#fef2f2',
    danger500: '#ef4444',
  },
  
  gradients: {
    primary: ['#3D79CC', '#4F46E5'],
    login: ['#4F46E5', '#7C3AED'],
    background: ['#F0F9FF', '#E0F2FE']
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 16,
    },
  }
};