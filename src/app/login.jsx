import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { CustomTextField } from '../components/CustomTextField';
import { useTheme } from '../constants/ThemeContext';

export default function LoginScreen() {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);

  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    const formattedRoll = rollNo.trim().toLowerCase();
    if (formattedRoll === 'admin' && password === 'admin') {
      global.isAdmin = true;
      router.replace('/admin-dashboard');
    } else {
      global.isAdmin = false;
      router.replace('/dashboard');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ height: Platform.OS === 'web' ? 80 : 120 }} />
        
        <View style={styles.iconContainer}>
          <MaterialIcons name="account-balance" size={60} color={theme.accent} />
        </View>
        <View style={{ height: 32 }} />
        
        <Text style={styles.title}>Welcome Back</Text>
        <View style={{ height: 8 }} />
        <Text style={styles.subtitle}>Sign in With your Institute Mail</Text>
        <View style={{ height: 48 }} />

        <CustomTextField
          labelText="mail.iith.ac.in"
          hintText="Enter your email"
          prefixIcon="badge"
          value={rollNo}
          onChangeText={setRollNo}
          autoCapitalize="none"
        />

        <CustomTextField
          labelText="Password"
          hintText="Enter your password"
          prefixIcon="lock"
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={styles.forgotPassword} 
          onPress={() => {
            if (Platform.OS === 'web') alert('Forgot Password functionality coming soon!');
            else console.warn('Forgot Password functionality coming soon!');
          }}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />

        <CustomButton title="LOGIN" onPress={handleLogin} />
        <View style={{ height: 32 }} />

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don&apos;t have an account? </Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme, activeTheme) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.primary },
    scrollContent: { padding: 24, flexGrow: 1, backgroundColor: theme.primary },
    iconContainer: {
      alignSelf: 'center',
      padding: 20,
      backgroundColor: isDark ? 'rgba(212, 160, 23, 0.1)' : 'rgba(212, 160, 23, 0.08)',
      borderRadius: 24,
    },
    title: { fontSize: 28, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    subtitle: { fontSize: 16, color: theme.textSecondary, textAlign: 'center' },
    forgotPassword: { alignSelf: 'flex-end', marginTop: 8 },
    forgotPasswordText: { fontWeight: '600', color: theme.accent },
    registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    registerText: { color: theme.textSecondary },
    registerLink: { fontWeight: 'bold', color: theme.accent }
  });
};
