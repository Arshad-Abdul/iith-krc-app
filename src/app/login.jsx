import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { CustomTextField } from '../components/CustomTextField';
import { useTheme } from '../constants/ThemeContext';
import { login } from '../../services/kohaApi';
import { saveSession } from '../../services/session';

export default function LoginScreen() {
  const { theme, activeTheme, t } = useTheme();
  const styles = createStyles(theme, activeTheme);

  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [membershipExpired, setMembershipExpired] = useState(null); // { message, dateexpiry }
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedUserid = userid.trim();
    if (!trimmedUserid || !password) {
      setError('Enter your User ID and password.');
      return;
    }

    setError('');
    setMembershipExpired(null);
    setIsLoading(true);
    try {
      const { token, patron } = await login(trimmedUserid, password);
      await saveSession({ token, patron });
      router.replace('/dashboard');
    } catch (err) {
      // Check if this is a membership expiry error (HTTP 403 with code MEMBERSHIP_EXPIRED)
      if (err.code === 'MEMBERSHIP_EXPIRED' || err.message?.includes('membership expired')) {
        setMembershipExpired({ message: err.message });
      } else {
        setError(err.message || 'Login failed. Check your credentials and network.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const membershipFormUrl = 'https://forms.gle/Xok49Q8FBednj4uf8';

  const handleOpenMembershipForm = () => {
    Linking.openURL(membershipFormUrl).catch((err) => {
      console.error("Couldn't open membership form", err);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ height: Platform.OS === 'web' ? 40 : 20 }} />

          {/* KRC Official Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/download.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={{ height: 20 }} />

          <Text style={styles.title}>Welcome Back</Text>
          <View style={{ height: 8 }} />
          <Text style={styles.subtitle}>{t.signInKrcAccount || 'Sign in with your KRC account'}</Text>
          <View style={{ height: 32 }} />

          <CustomTextField
            labelText={t.krcUserIdCard || "User ID / Card Number"}
            hintText="Enter your User ID or Card Number"
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

          {membershipExpired ? (
            <View style={styles.expiredCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons name="card-membership" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.expiredTitle}>Membership Expired</Text>
              </View>
              <Text style={styles.expiredMsg}>{membershipExpired.message}</Text>
              <TouchableOpacity
                style={styles.renewButton}
                onPress={handleOpenMembershipForm}
                activeOpacity={0.8}
              >
                <MaterialIcons name="assignment" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.renewButtonText}>Renew Membership</Text>
              </TouchableOpacity>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          <View style={{ height: 24 }} />

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.accent} />
          ) : (
            <CustomButton title="LOGIN" onPress={handleLogin} disabled={isLoading} />
          )}

          <View style={{ height: 32 }} />

          {/* Membership Google Form Section */}
          <View style={styles.membershipSection}>
            <Text style={styles.membershipPrompt}>
              {t.dontHaveAccount || "Don't have an account?"}
            </Text>
            <TouchableOpacity
              style={styles.membershipButton}
              onPress={handleOpenMembershipForm}
              activeOpacity={0.7}
            >
              <MaterialIcons name="assignment" size={18} color={theme.accent} style={{ marginRight: 6 }} />
              <Text style={styles.membershipLinkText}>
                {t.fillMembershipForm || "Fill the Library Membership Form"}
              </Text>
              <MaterialIcons name="open-in-new" size={15} color={theme.accent} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme, activeTheme) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.primary },
    scrollContent: { padding: 24, flexGrow: 1, backgroundColor: theme.primary },
    logoContainer: {
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      width: 100,
      height: 100,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
      boxShadow: "0px 4px 16px rgba(0,0,0,0.08)",
      elevation: 3,
      padding: 10,
    },
    logo: {
      width: '100%',
      height: '100%',
    },
    title: { fontSize: 28, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    subtitle: { fontSize: 16, color: theme.textSecondary, textAlign: 'center' },
    errorText: { color: '#DC2626', marginTop: 8, textAlign: 'center' },
    membershipSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    },
    membershipPrompt: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    membershipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(32, 138, 239, 0.08)',
    },
    membershipLinkText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.accent,
    },
    // ── Membership expired card ───────────────────────────────────────────────
    expiredCard: {
      marginTop: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: '#DC2626',
      backgroundColor: isDark ? 'rgba(220,38,38,0.1)' : 'rgba(220,38,38,0.06)',
    },
    expiredTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#DC2626',
    },
    expiredMsg: {
      fontSize: 13,
      color: isDark ? '#FCA5A5' : '#991B1B',
      lineHeight: 19,
      marginBottom: 12,
    },
    renewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: '#DC2626',
    },
    renewButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
  });
};
