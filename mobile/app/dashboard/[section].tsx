import { DashboardScreen } from '@/components/web/DashboardScreen';
import { Redirect } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

const VALID = ['awb', 'scan', 'labels'] as const;
type Section = (typeof VALID)[number];

/** Fallback native route satu-segmen — mirror dari [section].web.tsx. */
export default function DashboardSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (section === 'bgd' || section === 'cas') {
    return <DashboardScreen section="dashboard" warehouse={section} />;
  }
  if (section === 'dashboard') {
    return <Redirect href="/dashboard/bgd" />;
  }
  const active = (VALID as readonly string[]).includes(section ?? '') ? (section as Section) : 'awb';
  return <DashboardScreen section={active} warehouse="bgd" />;
}
