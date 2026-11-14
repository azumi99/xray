import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';

/** /dashboard TANPA gudang → 404. Dashboard wajib menyertakan gudang:
 *  /dashboard/bgd atau /dashboard/cas */
export default function DashboardWebScreen() {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Gudang tidak ditentukan</Text>
      <Text style={styles.subtitle}>Dashboard wajib menyertakan gudang. Gunakan:</Text>
      <View style={styles.row}>
        <Pressable style={styles.link} onPress={() => router.push('/dashboard/bgd')}><Text style={styles.linkText}>/dashboard/bgd</Text></Pressable>
        <Pressable style={styles.link} onPress={() => router.push('/dashboard/cas')}><Text style={styles.linkText}>/dashboard/cas</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0B1220' },
  code: { fontSize: 72, fontWeight: '900', color: '#EF4444', letterSpacing: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  subtitle: { fontSize: 13, color: '#94A3B8' },
  row: { flexDirection: 'row', gap: 14, marginTop: 6 },
  link: { borderWidth: 1, borderColor: '#38BDF8', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, cursor: 'pointer' },
  linkText: { color: '#38BDF8', fontWeight: '700', fontSize: 13 },
});
