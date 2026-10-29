import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';

// This hook loads fonts and returns a boolean indicating whether they are loaded
export const useCustomFonts = () => {
  const [fontsLoaded] = useFonts({
    // NeoSans fonts will be loaded here when available
    // 'NeoSans-Regular': require('../assets/fonts/NeoSansStd-Regular.otf'),
    // 'NeoSans-Bold': require('../assets/fonts/NeoSansStd-Bold.otf'),
    
    // Using Inter as a fallback until NeoSans is available
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
    'Inter-Black': Inter_900Black,
  });

  return fontsLoaded;
};