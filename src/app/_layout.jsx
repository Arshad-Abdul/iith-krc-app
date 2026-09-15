import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../constants/ThemeContext';

function MainLayout() {
  const { activeTheme, theme } = useTheme();
  return (
    <>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.primary,
          },
          headerTintColor: theme.text,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: true, title: 'Login' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="library-hours" options={{ headerShown: true, title: 'Library Hours' }} />
        <Stack.Screen name="library-services" options={{ headerShown: false }} />
        <Stack.Screen name="service-detail" options={{ headerShown: true, title: 'Service Detail' }} />
        <Stack.Screen name="institutional-resources" options={{ headerShown: true, title: 'Institutional Repositories' }} />
        <Stack.Screen name="off-campus-access" options={{ headerShown: true, title: 'Off-Campus Access' }} />
        <Stack.Screen name="profile" options={{ headerShown: true, title: 'My Account' }} />
        <Stack.Screen name="doi-search" options={{ headerShown: false }} />
        <Stack.Screen name="book-detail" options={{ headerShown: false }} />
        <Stack.Screen name="subject-books" options={{ headerShown: false }} />
        <Stack.Screen name="interest-books" options={{ headerShown: false }} />
        <Stack.Screen name="web-view" options={{ headerShown: false }} />
        <Stack.Screen name="ocr-scanner" options={{ headerShown: false }} />
        <Stack.Screen name="ocr-notes" options={{ headerShown: false }} />
        <Stack.Screen name="pdf-viewer" options={{ headerShown: false }} />
        <Stack.Screen name="reading-lists" options={{ headerShown: false }} />
        <Stack.Screen name="professors-bookshelf" options={{ headerShown: false }} />
        <Stack.Screen name="new-arrivals-books" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="dds-ill" options={{ headerShown: false }} />
        <Stack.Screen name="library-occupancy" options={{ headerShown: false }} />
        <Stack.Screen name="tools" options={{ headerShown: false }} />
        <Stack.Screen name="faculty-books" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainLayout />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
