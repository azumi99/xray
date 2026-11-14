import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';

/** /dashboard tanpa gudang → halaman pemilihan gudang.
 *  Dashboard sekarang terpisah per database: pilih BGD atau CAS. */
export default function DashboardWebScreen() {
  const router = useRouter();
  const warehouses = [
    { key: 'bgd', label: 'BGD', desc: 'awbxray_bgd · rdwarehouse_jkt' },
    { key: 'cas', label: 'CAS', desc: 'awbxray_cas · rdwarehouse_sna' },
  ] as const;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Pilih Gudang</Text>
      <Text style={styles.subtitle}>Dashboard X-ray dipisah per gudang — gunakan /dashboard/bgd atau /dashboard/cas</Text>
      <View style={styles.row}>
        {warehouses.map((w) => (
          <Pressable key={w.key} style={styles.card} onPress={() => router.push(`/dashboard/${w.key}`)}>
            <Text style={styles.cardTitle}>{w.label}</Text>
            <Text style={styles.cardDesc}>{w.desc}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#0B1220' },
  title: { fontSize: 24, fontWeight: '800', color: '#F8FAFC' },
  subtitle: { fontSize: 13, color: '#94A3B8' },
  row: { flexDirection: 'row', gap: 20 },
  card: { borderWidth: 2, borderColor: '#38BDF8', borderRadius: 14, paddingVertical: 28, paddingHorizontal: 40, alignItems: 'center', gap: 6, cursor: 'pointer' },
  cardTitle: { fontSize: 30, fontWeight: '800', color: '#38BDF8', letterSpacing: 2 },
  cardDesc: { fontSize: 11, color: '#94A3B8' },
});
