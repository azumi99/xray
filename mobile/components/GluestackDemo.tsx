import React from "react";
import { VStack, HStack, Box, Text, Button, Heading } from "@gluestack-ui/themed";

const GluestackDemo = () => {
  return (
    <VStack space="md" p="$4" flex={1}>
      <Heading size="lg" mb="$2">Gluestack UI Demo</Heading>
      
      {/* VStack example - vertical layout */}
      <VStack space="sm" bg="$blue50" p="$3" borderRadius="$md">
        <Text>This is a VStack (vertical stack)</Text>
        <Box bg="$primary500" h="$2" w="$20" borderRadius="$sm" />
        <Text>Items are stacked vertically</Text>
      </VStack>
      
      {/* HStack example - horizontal layout */}
      <HStack space="sm" bg="$green50" p="$3" borderRadius="$md">
        <Text>This is an HStack (horizontal stack)</Text>
        <Box bg="$secondary500" h="$2" w="$20" borderRadius="$sm" />
        <Text>Items are stacked horizontally</Text>
      </HStack>
      
      {/* More complex example */}
      <HStack space="md" justifyContent="space-between" alignItems="center">
        <Button size="sm" action="primary">
          <Text color="white">Button 1</Text>
        </Button>
        <Button size="sm" action="secondary">
          <Text color="white">Button 2</Text>
        </Button>
        <Button size="sm" action="positive">
          <Text color="white">Button 3</Text>
        </Button>
      </HStack>
    </VStack>
  );
};

export default GluestackDemo;