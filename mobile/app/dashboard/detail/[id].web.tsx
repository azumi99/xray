import { AwbDetailScreen } from '@/components/web/AwbDetailScreen';
import { useLocalSearchParams } from 'expo-router';

export default function DetailWebScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AwbDetailScreen id={id} warehouse="bgd" />;
}
