import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  colors?: [string, string];
  style?: ViewStyle;
}

const GradientHeader: React.FC<GradientHeaderProps> = ({ 
  title, 
  subtitle, 
  children, 
  colors = ['#4F46E5', '#7C3AED'], // Default purple gradient
  style 
}) => {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children && <View style={styles.childrenContainer}>{children}</View>}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  childrenContainer: {
    marginTop: 10,
  },
});

export default GradientHeader;