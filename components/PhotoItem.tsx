import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import { XIcon } from 'lucide-react-native';

interface PhotoItemProps {
  uri: string;
  onDelete: () => void;
}

const PhotoItem = ({ uri, onDelete }: PhotoItemProps) => {
  return (
    <Box
      borderRadius="$2xl"
      overflow="hidden"
      shadow="$2"
      mr="md"
      mb="md"
      width={100}
      height={100}
      borderWidth={1}
      borderColor="$borderLight300"
    >
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <TouchableOpacity
        onPress={onDelete}
        style={{
          position: 'absolute',
          top: 5,
          right: 5,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: 12,
          padding: 4,
          borderWidth: 1,
          borderColor: '$borderLight300',
        }}
      >
        <XIcon size={12} color="#374151" />
      </TouchableOpacity>
    </Box>
  );
};

export default PhotoItem;