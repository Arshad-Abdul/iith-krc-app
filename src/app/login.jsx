import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { CustomTextField } from '../components/CustomTextField';
import { useTheme } from '../constants/ThemeContext';
import { login } from '../../services/kohaApi';
import { saveSession } from '../../services/session';

export default function LoginScreen() {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);

  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedUserid = userid.trim();
    if (!trimmedUserid || !password) {
      setError('Enter your Koha user ID and password.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const { token, patron } = await login(trimmedUserid, password);
      await saveSession({ token, patron });
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials and network.');
    } finally {
      setIsLoading(false);
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
        <Text style={styles.subtitle}>Sign in with your Koha library account</Text>
        <View style={{ height: 48 }} />

        <CustomTextField
          labelText="Koha User ID / Card Number"
          hintText="Enter your library user ID"
          prefixIcon="badge"
          value={userid}
          onChangeText={setUserid}
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.accent} />
        ) : (
          <CustomButton title="LOGIN" onPress={handleLogin} disabled={isLoading} />
        )}
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
    errorText: { color: '#DC2626', marginTop: 8, textAlign: 'center' },
    forgotPassword: { alignSelf: 'flex-end', marginTop: 8 },
    forgotPasswordText: { fontWeight: '600', color: theme.accent },
    registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    registerText: { color: theme.textSecondary },
    registerLink: { fontWeight: 'bold', color: theme.accent }
  });
};
