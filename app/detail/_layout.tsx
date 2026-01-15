import { useThemeStore } from '@/lib/store/themeStore';
import { Stack } from 'expo-router';
import gql from 'graphql-tag';

const GET_AWB_DETAIL_HEADER = gql`
  query GetAirwaybillXrayWithDetails($id: ID!) {
    airwaybillXrayWithDetails(id: $id) {
      id
      airwaybill_number
    }
  }
`;

export default function DetailLayout() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          headerTitle: 'AWB Details',
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderBottomWidth: 0.5,
            borderBottomColor: isDark ? '#374151' : '#E5E7EB',
          },
          headerTintColor: isDark ? '#60A5FA' : '#0284C7',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 16,
            color: isDark ? '#F9FAFB' : '#1F2937',
          },
        }}
      />
    </Stack>
  );
}