import { useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isSmall: width < 768,
    isMedium: width >= 768 && width < 1100,
    isWide: width >= 1100,
  };
}
