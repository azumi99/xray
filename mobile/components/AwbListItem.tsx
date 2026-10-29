import { useThemeStore } from '@/lib/store/themeStore';
import { CalendarIcon, ChevronRightIcon, PackageIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AwbStatus = 'waiting' | 'incomplete' | 'complete';

interface AwbListItemProps {
  awbNumber: string;
  hawb?: string | null;
  date: string;
  status?: AwbStatus;
  /** info colly "scanned / total" (mode grouping); null = sembunyikan */
  colly?: string | null;
  /** jumlah record dalam grup (mode grouping) */
  groupCount?: number | null;
  onPress: () => void;
}

const STATUS_CONFIG: Record<AwbStatus, { label: string; bg: string; color: string }> = {
  waiting: { label: 'WAITING', bg: 'rgba(245, 158, 11, 0.12)', color: '#D97706' },
  incomplete: { label: 'INCOMPLETE', bg: 'rgba(234, 88, 12, 0.12)', color: '#EA580C' },
  complete: { label: 'COMPLETE', bg: 'rgba(22, 163, 74, 0.12)', color: '#16A34A' },
};

const COLLY_CONFIG = {
  full: { bg: 'rgba(22, 163, 74, 0.12)', color: '#16A34A' },
  partial: { bg: 'rgba(2, 132, 199, 0.12)', color: '#0369A1' },
  none: { bg: 'rgba(107, 114, 128, 0.12)', color: '#6B7280' },
};

const AwbListItem = ({ awbNumber, hawb, date, status = 'waiting', colly, groupCount, onPress }: AwbListItemProps) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting;

  // colly "x / y": hijau lengkap, biru sebagian, abu nol
  const collyMatch = colly?.match(/^(\d+)\s*\/\s*(\d+)$/);
  const collyCfg = collyMatch
    ? Number(collyMatch[1]) >= Number(collyMatch[2]) && Number(collyMatch[2]) > 0
      ? COLLY_CONFIG.full
      : Number(collyMatch[1]) > 0
        ? COLLY_CONFIG.partial
        : COLLY_CONFIG.none
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#1F2937' : '#F3F4F6' },
      ]}
    >
      <View style={styles.topRow}>
        <View style={{ flexShrink: 1, gap: 3 }}>
          <Text style={[styles.awbNumber, { color: isDark ? '#F9FAFB' : '#111827' }]} numberOfLines={1}>
            {awbNumber}
          </Text>
          {hawb ? (
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' }} numberOfLines={1}>
              HAWB · {hawb}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {collyCfg ? (
            <View style={[styles.badge, { backgroundColor: collyCfg.bg }]}>
              <Text style={[styles.badgeText, { color: collyCfg.color }]}>{colly}</Text>
            </View>
          ) : null}
          <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.badgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.dateRow}>
          <CalendarIcon size={11} color="#9CA3AF" />
          <Text style={[styles.dateText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{date}</Text>
          {groupCount != null && groupCount > 1 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              <PackageIcon size={11} color="#0369A1" />
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#0369A1' }}>{groupCount} records</Text>
            </View>
          ) : null}
        </View>
        <ChevronRightIcon size={17} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  awbNumber: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
});

export default AwbListItem;
