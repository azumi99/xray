import { DashboardScreen } from '@/components/web/DashboardScreen';
import { useLocalSearchParams } from 'expo-router';

const VALID = ['awb', 'scan'] as const;
type Section = (typeof VALID)[number];

export default function DashboardSectionWebScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const active = (VALID as readonly string[]).includes(section ?? '') ? (section as Section) : 'awb';
  return <DashboardScreen section={active} />;
}
