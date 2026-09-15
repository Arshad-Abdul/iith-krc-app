import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

// Known domains that set X-Frame-Options: SAMEORIGIN or DENY header
const FRAME_RESTRICTED_DOMAINS = [
  'irins.org',
  'rb.krc.iith.ac.in',
  'identity.iith.ac.in',
];

const isFrameRestricted = (targetUrl = '') => {
  return FRAME_RESTRICTED_DOMAINS.some(domain => targetUrl.toLowerCase().includes(domain));
};

export default function WebViewScreen() {
  const { theme, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, activeTheme, insets);
  
  const params = useLocalSearchParams();
  const url = params.url || 'https://iith.ac.in';
  const title = params.title || 'Library Resource';
  
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const restricted = isFrameRestricted(url);

  const handleLaunchExternal = async () => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: theme.primary,
        controlsColor: theme.accent,
        dismissButtonStyle: 'close',
      });
    } catch (_err) {
      Linking.openURL(url);
    }
  };

  useEffect(() => {
    if (restricted) {
      // Automatically attempt launching in-app web browser popup if frame-restricted
      handleLaunchExternal();
    }
  }, [url]);

  return (
    <View style={styles.container}>
      {/* App Top Navigation Bar */}
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={handleLaunchExternal} style={{ padding: 6 }}>
            <MaterialIcons name="open-in-new" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.webContainer}>
        {restricted || hasError ? (
          // Clean In-App Portal Card for Frame-Restricted / Security Blocked Sites
          <View style={styles.restrictedCard}>
            <View style={styles.iconCircle}>
              <MaterialIcons 
                name={url.includes('irins') ? 'hub' : url.includes('rb.krc') ? 'meeting-room' : 'vpn-lock'} 
                size={48} 
                color={theme.accent} 
              />
            </View>
            <Text style={styles.restrictedTitle}>{title}</Text>
            <View style={styles.urlBadge}>
              <Text style={styles.urlBadgeText} numberOfLines={1}>{url}</Text>
            </View>
            <Text style={styles.restrictedDesc}>
              This institutional resource uses security authentication policies that require dedicated portal access.
            </Text>
            
            <TouchableOpacity 
              style={styles.openPortalButton} 
              onPress={handleLaunchExternal}
              activeOpacity={0.8}
            >
              <MaterialIcons name="open-in-browser" size={20} color="#FFFFFF" />
              <Text style={styles.openPortalButtonText}>OPEN {title.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        ) : Platform.OS === 'web' ? (
          <iframe 
            src={url} 
            style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
            onLoad={() => setLoading(false)}
            onError={() => setHasError(true)}
          />
        ) : (
          <WebView 
            source={{ uri: url }} 
            style={{ flex: 1 }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => setHasError(true)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            scalesPageToFit={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
          />
        )}

        {/* Floating Loading Overlay for normal webviews */}
        {!restricted && !hasError && loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color={theme.accent} />
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
      height: 56, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
      elevation: 4,
      boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
    },
    backButton: { padding: 4 },
    headerTitle: { color: theme.text, fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 8 },
    webContainer: { flex: 1, position: 'relative' },
    loadingOverlay: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 20,
      padding: 8,
      zIndex: 20,
    },
    restrictedCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: theme.background,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(32, 138, 239, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    restrictedTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    urlBadge: {
      backgroundColor: theme.backgroundElement,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      marginBottom: 16,
      maxWidth: '90%',
    },
    urlBadgeText: {
      fontSize: 12,
      color: theme.accent,
    },
    restrictedDesc: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 28,
      maxWidth: 320,
    },
    openPortalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      gap: 8,
      width: '100%',
      maxWidth: 300,
    },
    openPortalButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 14,
    },
  });
};
