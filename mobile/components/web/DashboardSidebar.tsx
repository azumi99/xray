import { useBreakpoint } from '@/components/web/useBreakpoint';
import { useThemeStore } from '@/lib/store/themeStore';
import { LayoutDashboardIcon, LogOutIcon, PackageIcon, ScanLineIcon } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { key: 'awb', label: 'AWB List', icon: PackageIcon },
  { key: 'scan', label: 'X-ray Capture', icon: ScanLineIcon },
];

export function DashboardSidebar({ active = 'dashboard', onNavigate, onLogout }: { active?: string; onNavigate?: (key: string) => void; onLogout?: () => void }) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { isSmall } = useBreakpoint();
  const width = isSmall ? 60 : 232;

  return (
    <View style={{
      width,
      flexShrink: 0,
      height: '100%',
      backgroundColor: isDark ? '#0B1220' : '#FFFFFF',
      borderRightWidth: 1,
      borderRightColor: isDark ? '#1F2937' : '#E5E7EB',
      paddingVertical: isSmall ? 16 : 24,
      paddingHorizontal: isSmall ? 8 : 16,
      gap: 4,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSmall ? 0 : 10, paddingHorizontal: isSmall ? 0 : 12, marginBottom: isSmall ? 20 : 28, justifyContent: isSmall ? 'center' : 'flex-start' }}>
        <View style={{ width: isSmall ? 34 : 36, height: isSmall ? 34 : 36, borderRadius: 10, backgroundColor: '#0284C7', alignItems: 'center', justifyContent: 'center' }}>
          <ScanLineIcon size={isSmall ? 18 : 20} color="#FFFFFF" />
        </View>
        {!isSmall && (
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>AWB X-Ray</Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Web Dashboard</Text>
          </View>
        )}
      </View>

      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = key === active;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onNavigate?.(key)}
            accessibilityLabel={label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: isSmall ? 'center' : 'flex-start',
              gap: isSmall ? 0 : 10,
              paddingHorizontal: isSmall ? 0 : 12,
              paddingVertical: isSmall ? 12 : 10,
              borderRadius: 10,
              backgroundColor: isActive ? (isDark ? '#1E3A8A33' : '#E0F2FE') : 'transparent',
            }}
          >
            <Icon size={18} color={isActive ? '#0284C7' : '#9CA3AF'} />
            {!isSmall && (
              <Text style={{ fontSize: 13, fontWeight: isActive ? '700' : '500', color: isActive ? '#0284C7' : (isDark ? '#9CA3AF' : '#4B5563') }}>
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={onLogout}
        accessibilityLabel="Logout"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: isSmall ? 'center' : 'flex-start',
          gap: isSmall ? 0 : 10,
          paddingHorizontal: isSmall ? 0 : 12,
          paddingVertical: isSmall ? 12 : 10,
          borderRadius: 10,
          marginTop: 'auto',
        }}
      >
        <LogOutIcon size={18} color="#EF4444" />
        {!isSmall && <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Logout</Text>}
      </TouchableOpacity>
    </View>
  );
}
