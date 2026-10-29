import { useThemeStore } from '@/lib/store/themeStore';
import React from 'react';
import { Text, View } from 'react-native';

const TONES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: '#E0F2FE', fg: '#0369A1' },
  green: { bg: '#DCFCE7', fg: '#15803D' },
  amber: { bg: '#FEF3C7', fg: '#B45309' },
};

export function StatsCard({ icon, label, value, tone = 'blue' }: { icon: React.ReactNode; label: string; value: string | number; tone?: 'blue' | 'green' | 'amber' }) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const t = TONES[tone] ?? TONES.blue;

  return (
    <View style={{
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? '#1F2937' : '#F3F4F6',
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    }}>
      <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>{value}</Text>
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{label}</Text>
      </View>
    </View>
  );
}
