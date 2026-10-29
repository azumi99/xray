import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface StatusBarSafeAreaProps {
  children: React.ReactNode;
  style?: object;
  topSpacing?: boolean;
  bottomSpacing?: boolean;
}

const StatusBarSafeArea: React.FC<StatusBarSafeAreaProps> = ({
  children,
  style = {},
  topSpacing = true,
  bottomSpacing = true,
}) => {
  return (
    <SafeAreaView
      style={[
        styles.container,
        topSpacing && { paddingTop: 10 || 0 },
        bottomSpacing && { paddingBottom: 20 }, // Standard bottom padding
        style
      ]}
      edges={['top', 'left', 'right']} // Only handle top edge, let bottom be handled by the component content
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default StatusBarSafeArea;