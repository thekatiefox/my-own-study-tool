import { Platform } from 'react-native';

// Inter font family — loaded in app/_layout.tsx
// Falls back to system font if Inter hasn't loaded yet
const isWeb = Platform.OS === 'web';

export const Fonts = {
  light: isWeb ? 'Inter, system-ui, sans-serif' : 'Inter-Light',
  regular: isWeb ? 'Inter, system-ui, sans-serif' : 'Inter-Regular',
  medium: isWeb ? 'Inter, system-ui, sans-serif' : 'Inter-Medium',
} as const;
