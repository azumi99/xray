// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, StyleSheet } from 'react-native';

export function TabBarIcon({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  tabBarIcon: {
    paddingBottom: 3,
  },
});