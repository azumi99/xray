import { useBreakpoint } from '@/components/web/useBreakpoint';
import { useThemeStore } from '@/lib/store/themeStore';
import { SearchIcon } from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, View } from 'react-native';

export function DashboardHeader({ title, subtitle, search, onSearch }: { title: string; subtitle?: string; search?: string; onSearch?: (value: string) => void }) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { isSmall } = useBreakpoint();

  return (
    <View style={{
      flexDirection: isSmall ? 'column' : 'row',
      alignItems: isSmall ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: isSmall ? 12 : 16,
      paddingVertical: isSmall ? 14 : 18,
      paddingHorizontal: isSmall ? 16 : 28,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1F2937' : '#E5E7EB',
      backgroundColor: isDark ? '#0B1220' : '#FFFFFF',
    }}>
      <View style={{ flexShrink: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: isSmall ? 17 : 20, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{subtitle}</Text> : null}
      </View>

      {onSearch ? (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: isDark ? '#111827' : '#F3F4F6',
          borderRadius: 10,
          paddingHorizontal: 12,
          width: isSmall ? '100%' : undefined,
          flex: isSmall ? undefined : 0.55,
          maxWidth: 360,
          borderWidth: 1,
          borderColor: isDark ? '#1F2937' : '#E5E7EB',
        }}>
          <SearchIcon size={16} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={onSearch}
            placeholder="Cari nomor AWB / kurir..."
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, minWidth: 0, paddingVertical: 9, fontSize: 13, color: isDark ? '#F9FAFB' : '#111827', outlineWidth: 0 } as any}
          />
        </View>
      ) : null}
    </View>
  );
}
