import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import { XIcon } from 'lucide-react-native';

interface PhotoItemProps {
  uri: string;
  onDelete: () => void;
  isMain?: boolean;
  showDelete?: boolean;
}

const PhotoItem = ({ uri, onDelete, isMain = false, showDelete = true }: PhotoItemProps) => {
  return (
    <Box
      borderRadius="$md"
      overflow="hidden"
      shadow="$2"
      width={100}
      height={100}
      borderWidth={1}
      borderColor="$borderLight200"
      position="relative"
    >
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      {/* Main badge */}
      {isMain && (
        <Box
          position="absolute"
          top={4}
          left={4}
          bg="$primary600"
          px="$2"
          py={1}
          borderRadius="$xs"
        >
          <Text color="$white" fontSize={10} fontWeight="bold">MAIN</Text>
        </Box>
      )}

      {/* Delete button */}
      {showDelete && !isMain && (
        <TouchableOpacity
          onPress={onDelete}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            borderRadius: 12,
            padding: 4,
          }}
        >
          <Text color="white" fontSize={12} fontWeight="bold">×</Text>
        </TouchableOpacity>
      )}
    </Box>
  );
};

export default PhotoItem;