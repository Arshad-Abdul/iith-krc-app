import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

export default function WebViewScreen() {
  const { theme, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, activeTheme, insets);
  
  const params = useLocalSearchParams();
  const url = params.url || 'https://iith.ac.in';
  const title = params.title || 'Library Resource';
  
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      {/* Web content */}
      <View style={styles.webContainer}>
        {Platform.OS === 'web' ? (
          <iframe 
            src={url} 
            style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
            onLoad={() => setLoading(false)}
          />
        ) : (
          <WebView 
            source={{ uri: url }} 
            style={{ flex: 1 }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme, activeTheme, insets) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    headerSafeArea: {
      backgroundColor: theme.primary,
      paddingTop: insets?.top || 0,
      zIndex: 10,
    },
    header: { 
      backgroundColor: theme.primary, 
      height: 60, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4
    },
    backButton: { padding: 4 },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    webContainer: { flex: 1, position: 'relative' },
    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20
    }
  });
};
