import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useTheme } from '../constants/ThemeContext';

export default function OffCampusAccessScreen() {
  const { theme, activeTheme, t } = useTheme();
  const styles = createStyles(theme, activeTheme);

  const libraryUrl = 'https://library.iith.ac.in/';
  const identityUrl = 'https://identity.iith.ac.in/';

  const launchUrl = (targetUrl) => {
    Linking.openURL(targetUrl).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="vpn-lock" size={80} color={theme.accent} />
      </View>
      <View style={{ height: 32 }} />
      
      <Text style={styles.title}>{t.offCampusAccess || 'Off-Campus Access'}</Text>
      <View style={{ height: 16 }} />
      
      <Text style={styles.description}>
        {t.offCampusDesc || 'Access our library resources, digital books, journals, and databases from anywhere in the world using your institutional credentials.'}
      </Text>
      <View style={{ height: 36 }} />

      <TouchableOpacity style={styles.button} onPress={() => launchUrl(libraryUrl)}>
        <MaterialIcons name="open-in-new" size={20} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>{t.goToLibraryPortal || 'GO TO LIBRARY PORTAL'}</Text>
      </TouchableOpacity>

      <View style={{ height: 14 }} />

      <TouchableOpacity style={styles.secondaryButton} onPress={() => launchUrl(identityUrl)}>
        <MaterialIcons name="security" size={20} color={theme.text} style={{ marginRight: 8 }} />
        <Text style={[styles.buttonText, { color: theme.text }]}>{t.openIdentityPortal || 'OPEN IDENTITY PORTAL'}</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />

      <TouchableOpacity onPress={() => launchUrl(libraryUrl)}>
        <Text style={styles.linkText}>{libraryUrl}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme, activeTheme) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    iconContainer: { 
      padding: 24, 
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(32, 138, 239, 0.08)', 
      borderRadius: 100 
    },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    description: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24 },
    button: { 
      width: '100%', 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: theme.accent, 
      paddingVertical: 18, 
      borderRadius: 15 
    },
    buttonText: { fontSize: 16, fontWeight: 'bold', color: 'white' },
    secondaryButton: { 
      width: '100%', 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      paddingVertical: 18, 
      borderRadius: 15 
    },
    linkText: { color: theme.accent, textDecorationLine: 'underline' },
  });
};
