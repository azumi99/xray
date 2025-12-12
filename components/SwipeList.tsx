import { formatDateTime } from '@/utils/formatDate';
import { gql, useMutation } from '@apollo/client';
import React from 'react';
import { Alert, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Trash2Icon } from 'lucide-react-native';
import AwbListItem from './AwbListItem';

// GraphQL mutation untuk delete AWB
const DELETE_AWB_MUTATION = gql`
  mutation DeleteAirwaybillXray($id: ID!) {
    deleteAirwaybillXray(id: $id) {
      id
      airwaybill_number
      photo_airwaybill
      created_at
      updated_at
    }
  }
`;

interface SwipeListProps {
  data: Array<{
    id: string;
    airwaybill_number: string;
    created_at: string;
    xray_photos_count?: number;
  }>;
  onRefresh?: () => void;
  onItemClick: (id: string) => void;
  refreshing?: boolean;
  onScroll?: (e: any) => void;
  contentContainerStyle?: any;
}

const SwipeList = React.forwardRef<any, SwipeListProps>(({
  data,
  onRefresh,
  onItemClick,
  refreshing = false,
  onScroll,
  contentContainerStyle
}, ref) => {
  const [deleteAwb] = useMutation(DELETE_AWB_MUTATION);

  const handleDelete = (id: string, awbNumber: string) => {
    Alert.alert(
      'Delete AWB',
      `Are you sure you want to delete ${awbNumber}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('Attempting to delete AWB:', { id, awbNumber });
            try {
              const result = await deleteAwb({
                variables: { id },
                onCompleted: (data: any) => {
                  console.log('Delete completed successfully:', data);
                  if (onRefresh) {
                    onRefresh();
                  }
                },
                onError: (error: any) => {
                  console.error('Delete error details:', {
                    message: error.message,
                    graphQLErrors: error.graphQLErrors,
                    networkError: error.networkError,
                    error: error
                  });

                  let errorMessage = 'Failed to delete AWB';

                  // Check for specific error patterns
                  if (error.message.includes('would modify models') ||
                      error.message.includes('use argument to filter')) {
                    errorMessage = 'This AWB has X-ray photos that must be deleted first. Please contact your administrator to delete this record.';
                  } else if (error.message) {
                    errorMessage = `Failed to delete AWB: ${error.message}`;
                  }

                  Alert.alert('Delete Error', errorMessage);
                },
              });
              console.log('Delete mutation result:', result);
            } catch (error: any) {
              console.error('Delete exception:', error);
              Alert.alert('Error', 'An unexpected error occurred while deleting AWB');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    return (
      <View style={{
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <AwbListItem
          key={item.id}
          awbNumber={item.airwaybill_number}
          date={formatDateTime(new Date(item.created_at))}
          onPress={() => onItemClick(item.id)}
          index={index}
          status="Pending"
        />
      </View>
    );
  };

  const renderHiddenItem = ({ item }: { item: any }) => (
    <View style={{
      backgroundColor: 'transparent',
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: 8,
    }}>
      <View
        style={{
          backgroundColor: '#DC2626',
          width: 75,
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => handleDelete(item.id, item.airwaybill_number)}
        >
          <Trash2Icon size={20} color="#FFFFFF" />
          <Text style={{
            color: '#FFF',
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SwipeListView
      ref={ref}
      data={data}
      renderItem={renderItem}
      renderHiddenItem={renderHiddenItem}
      leftOpenValue={0}
      rightOpenValue={-75}
      closeOnRowBeginSwipe={true}
      closeOnScroll={true}
      swipeToOpenPercent={15}
      disableRightSwipe={true}
      useNativeDriver={true}
      previewDuration={300}
      friction={2}
      tension={50}
      keyExtractor={(item) => item.id}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#0284C7']}
          tintColor="#0284C7"
        />
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      onRowOpen={(rowKey) => {
        // Handle row open if needed
      }}
      onRowClose={() => {
        // Handle row close if needed
      }}
    />
  );
});

SwipeList.displayName = 'SwipeList';

export default SwipeList;