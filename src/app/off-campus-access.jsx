import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useTheme } from '../constants/ThemeContext';

export default function OffCampusAccessScreen() {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);

  const url = 'https://identity.iith.ac.in/';
  const launchUrl = () => router.push({ pathname: '/web-view', params: { url, title: 'Remote Access Portal' } });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="vpn-lock" size={80} color={theme.accent} />
      </View>
      <View style={{ height: 32 }} />
      
      <Text style={styles.title}>Remote Library Access</Text>
      <View style={{ height: 16 }} />
      
      <Text style={styles.description}>
        Access our library resources from anywhere in the world using our secure identity portal. Log in with your institutional credentials to explore digital books, journals, and databases.
      </Text>
      <View style={{ height: 48 }} />

      <TouchableOpacity style={styles.button} onPress={launchUrl}>
        <MaterialIcons name="open-in-new" size={20} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>GO TO IDENTITY PORTAL</Text>
      </TouchableOpacity>
      <View style={{ height: 24 }} />

      <TouchableOpacity onPress={launchUrl}>
        <Text style={styles.linkText}>{url}</Text>
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
      backgroundColor: isDark ? 'rgba(212, 160, 23, 0.1)' : 'rgba(212, 160, 23, 0.08)', 
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
    linkText: { color: theme.accent, textDecorationLine: 'underline' },
  });
};
