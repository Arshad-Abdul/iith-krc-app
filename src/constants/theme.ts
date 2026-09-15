/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#FFFFFF', // Clean white
    secondary: '#F8FAFC', // Slate 50
    accent: '#3B82F6', // Vibrant Blue
    text: '#0F172A', // Slate 900
    textSecondary: '#64748B', // Slate 500
    background: '#F1F5F9', // Slate 100
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2E8F0', // Slate 200
    border: '#E2E8F0',
    glass: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
  },
  dark: {
    primary: '#0F172A', // Slate 900
    secondary: '#1E293B', // Slate 800
    accent: '#6366F1', // Indigo 500
    text: '#F8FAFC', // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    background: '#020617', // Slate 950
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155', // Slate 700
    border: '#334155',
    glass: 'rgba(30, 41, 59, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
