import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, usePathname } from 'expo-router';

const TopTabsNavigation: React.FC = () => {
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname?.includes(path) || false;

  return (
    <View style={styles.container}>
      <Link href="/(tabs)/inbound" asChild>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            isActive('inbound') ? styles.activeTab : styles.inactiveTab
          ]}
        >
          <Text style={[
            styles.tabText,
            isActive('inbound') ? styles.activeTabText : styles.inactiveTabText
          ]}>
            📦 INBOUND
          </Text>
          {isActive('inbound') && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </Link>
      
      <Link href="/(tabs)/outbound" asChild>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            isActive('outbound') ? styles.activeTab : styles.inactiveTab
          ]}
        >
          <Text style={[
            styles.tabText,
            isActive('outbound') ? styles.activeTabText : styles.inactiveTabText
          ]}>
            🚚 OUTBOUND
          </Text>
          {isActive('outbound') && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </Link>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#F9FAFB',
  },
  inactiveTab: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  inactiveTabText: {
    color: '#6B7280',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '80%',
    height: 3,
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
});

export default TopTabsNavigation;