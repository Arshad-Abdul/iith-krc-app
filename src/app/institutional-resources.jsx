import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../constants/ThemeContext';

export default function InstitutionalResourcesScreen() {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);

  const launchUrl = (url, title) => router.push({ pathname: '/web-view', params: { url, title } });

  const ResourceBox = ({ title, url, icon, color }) => (
    <TouchableOpacity style={styles.resourceBox} onPress={() => launchUrl(url, title)} activeOpacity={0.8}>
      <MaterialIcons name={icon} size={28} color={color} />
      <View style={{ width: 16 }} />
      <Text style={styles.resourceTitle}>{title}</Text>
      <MaterialIcons name="open-in-new" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Resources</Text>
      <View style={{ height: 15 }} />
      
      <ResourceBox 
        title="RAIITH" 
        url="https://raiith.krc.iith.ac.in/home?tl.page=1" 
        icon="account-balance" 
        color="#ef6c00" 
      />
      <View style={{ height: 10 }} />
      <ResourceBox 
        title="IRINS" 
        url="https://iith.irins.org/" 
        icon="hub" 
        color="#00796b" 
      />
      <View style={{ height: 10 }} />
      <ResourceBox 
        title="e-SHODHGANGA" 
        url="https://shodhganga.inflibnet.ac.in/simple-search" 
        icon="library-books" 
        color="#7b1fa2" 
      />
    </ScrollView>
  );
}

const createStyles = (theme, activeTheme) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: theme.accent },
    resourceBox: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: theme.backgroundElement, 
      paddingVertical: 18, 
      paddingHorizontal: 16, 
      borderRadius: 12, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: isDark ? 0.25 : 0.04, 
      shadowRadius: 8, 
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.backgroundSelected,
    },
    resourceTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.text },
  });
};
