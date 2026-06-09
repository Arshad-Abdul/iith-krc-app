import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CustomTextField } from '../components/CustomTextField';
import { useTheme } from '../constants/ThemeContext';

export default function RegisterScreen() {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ height: 20 }} />
        
        <MaterialIcons name="person-add-alt-1" size={80} color={theme.accent} style={styles.icon} />
        <View style={{ height: 24 }} />
        
        <Text style={styles.title}>Register</Text>
        <View style={{ height: 32 }} />

        <CustomTextField
          labelText="Name"
          hintText="Enter your full name"
          prefixIcon="person"
        />

        <CustomTextField
          labelText="Institute Mail ID"
          hintText="Enter your institute email"
          prefixIcon="email"
        />

        <CustomTextField
          labelText="Mobile Number"
          hintText="Enter your mobile number"
          prefixIcon="phone"
          keyboardType="phone-pad"
        />

        <CustomTextField
          labelText="Create Password"
          hintText="Enter a strong password"
          prefixIcon="lock-outline"
          secureTextEntry={true}
        />

        <CustomTextField
          labelText="Re-enter Password"
          hintText="Confirm your password"
          prefixIcon="lock"
          secureTextEntry={true}
        />
        <View style={{ height: 16 }} />

        <TouchableOpacity style={styles.submitButton} onPress={() => router.replace('/dashboard')}>
          <Text style={styles.submitButtonText}>SUBMIT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme, activeTheme) => {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.primary },
    scrollContent: { padding: 24, flexGrow: 1 },
    icon: { alignSelf: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: theme.text },
    submitButton: { backgroundColor: theme.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    submitButtonText: { fontSize: 16, fontWeight: 'bold', color: 'white' }
  });
};
