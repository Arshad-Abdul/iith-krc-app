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
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="library-hours" options={{ title: 'Library Hours' }} />
        <Stack.Screen name="library-services" options={{ headerShown: false }} />
        <Stack.Screen name="service-detail" options={{ title: 'Service Detail' }} />
        <Stack.Screen name="institutional-resources" options={{ title: 'Institutional Repositories' }} />
        <Stack.Screen name="off-campus-access" options={{ title: 'Off-Campus Access' }} />
        <Stack.Screen name="profile" options={{ title: 'My Account' }} />
        <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="doi-search" options={{ headerShown: false }} />
        <Stack.Screen name="web-view" options={{ headerShown: false }} />
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
