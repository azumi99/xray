import { Stack, useGlobalSearchParams } from 'expo-router';
import { useQuery } from '@apollo/client';
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
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          headerTitle: 'AWB Details',
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 0.5,
            borderBottomColor: '#E5E7EB',
          },
          headerTintColor: '#0284C7',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 16,
            color: '#1F2937',
          },
        }}
      />
    </Stack>
  );
}