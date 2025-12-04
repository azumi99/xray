import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

const GluestackCard: React.FC<CardProps> = ({ 
  children, 
  title, 
  subtitle,
  className 
}) => {
  return (
    <View style={[styles.card, className ? getStyleFromClassName(className) : {}]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const GluestackCardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <View style={styles.header}>{children}</View>;
};

const GluestackCardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <View style={styles.content}>{children}</View>;
};

const GluestackCardTitle: React.FC<{ children: React.ReactNode, className?: string }> = ({ 
  children,
  className 
}) => {
  return <Text style={[styles.title, className ? getStyleFromClassName(className) : {}]}>{children}</Text>;
};

const GluestackCardDescription: React.FC<{ children: React.ReactNode, className?: string }> = ({ 
  children,
  className 
}) => {
  return <Text style={[styles.subtitle, className ? getStyleFromClassName(className) : {}]}>{children}</Text>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
});

// Helper function to convert Tailwind classes to React Native styles
const getStyleFromClassName = (className: string): any => {
  // This is a simplified implementation - in a real app you'd use NativeWind
  const styleMap: Record<string, any> = {
    'bg-white': { backgroundColor: '#ffffff' },
    'bg-gray-100': { backgroundColor: '#f3f4f6' },
    'rounded-lg': { borderRadius: 8 },
    'rounded-xl': { borderRadius: 12 },
    'p-4': { padding: 16 },
    'p-6': { padding: 24 },
    'm-4': { margin: 16 },
    'mt-4': { marginTop: 16 },
    'mb-4': { marginBottom: 16 },
    'pt-4': { paddingTop: 16 },
    'pb-4': { paddingBottom: 16 },
    'text-lg': { fontSize: 18 },
    'font-bold': { fontWeight: 'bold' },
    'text-gray-800': { color: '#1f2937' },
    'text-gray-600': { color: '#4b5563' },
  };

  return styleMap[className] || {};
};

export {
  GluestackCard,
  GluestackCardHeader,
  GluestackCardContent,
  GluestackCardTitle,
  GluestackCardDescription
};

export default GluestackCard;