# Gluestack UI Setup Guide

This document explains how to properly set up and use Gluestack UI components in your React Native project.

## Setup

1. **Provider Configuration**: The GluestackUIProvider has been added to your `_layout.tsx` file to wrap your entire app:

```tsx
<GluestackUIProvider config={config}>
  {/* Your app content */}
</GluestackUIProvider>
```

2. **Configuration**: The default Gluestack theme configuration is imported from `@gluestack-ui/config`.

## Basic Components

### Layout Components

- `VStack` - Vertical stack layout (items stack vertically)
- `HStack` - Horizontal stack layout (items stack horizontally)
- `Box` - A generic container component
- `Text` - For displaying text

### Example Usage

```tsx
import { VStack, HStack, Box, Text } from "@gluestack-ui/themed";

// Vertical stacking
<VStack space="md" p="$4">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
  <Text>Item 3</Text>
</VStack>

// Horizontal stacking
<HStack space="md" alignItems="center">
  <Box bg="$primary500" h="$3" w="$3" />
  <Text>Horizontal Item</Text>
</HStack>
```

## Spacing

Spacing can be controlled using the `space` prop with values:
- `xs`, `sm`, `md`, `lg`, `xl` for different spacing scales
- Or use numeric values like `"$2"`, `"$4"`, etc.

## Styling

Use the dollar sign prefix for theme-based styling:
- Colors: `$primary500`, `$secondary500`, `$text500`, etc.
- Sizes: `$2`, `$4`, `$6`, etc.
- Other theme values

## Common Components

- `Button` with `ButtonText`
- `Input` with `InputField`
- `Card` with `CardHeader`, `CardBody`, `CardTitle`
- And many more...

## Important Notes

1. Make sure to wrap your entire app with `<GluestackUIProvider config={config}>`
2. Use theme-based styling with `$` prefix for consistency
3. The spacing system uses themed values for consistency
4. Check the official documentation for a complete list of components and props