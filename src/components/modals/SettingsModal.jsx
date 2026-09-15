import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SettingsModal({
  isSettingsVisible,
  setIsSettingsVisible,
  activeTheme,
  setActiveTheme,
  currentLanguage,
  setCurrentLanguage,
  handleLogout,
  theme,
  styles,
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isSettingsVisible}
      onRequestClose={() => setIsSettingsVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.settingsModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setIsSettingsVisible(false)} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.settingsSectionTitle}>Appearance</Text>

          <View style={styles.themeOptionsContainer}>
            <TouchableOpacity
              style={[
                styles.themeOptionButton,
                activeTheme === 'light' && styles.themeOptionActive
              ]}
              onPress={() => setActiveTheme('light')}
            >
              <MaterialIcons
                name="light-mode"
                size={24}
                color={activeTheme === 'light' ? theme.accent : theme.textSecondary}
              />
              <Text style={[
                styles.themeOptionText,
                activeTheme === 'light' && styles.themeOptionTextActive
              ]}>Light Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOptionButton,
                activeTheme === 'dark' && styles.themeOptionActive
              ]}
              onPress={() => setActiveTheme('dark')}
            >
              <MaterialIcons
                name="dark-mode"
                size={24}
                color={activeTheme === 'dark' ? theme.accent : theme.textSecondary}
              />
              <Text style={[
                styles.themeOptionText,
                activeTheme === 'dark' && styles.themeOptionTextActive
              ]}>Dark Mode</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
          <Text style={styles.settingsSectionTitle}>Language / भाषा / భాష</Text>

          <View style={styles.themeOptionsContainer}>
            {/* English */}
            <TouchableOpacity
              style={[
                styles.themeOptionButton,
                currentLanguage === 'en' && styles.themeOptionActive,
                { flex: 1, paddingVertical: 10 }
              ]}
              onPress={() => setCurrentLanguage('en')}
            >
              <Text style={[
                styles.themeOptionText,
                currentLanguage === 'en' && styles.themeOptionTextActive,
                { fontSize: 13 }
              ]}>English</Text>
            </TouchableOpacity>

            {/* Hindi */}
            <TouchableOpacity
              style={[
                styles.themeOptionButton,
                currentLanguage === 'hi' && styles.themeOptionActive,
                { flex: 1, paddingVertical: 10 }
              ]}
              onPress={() => setCurrentLanguage('hi')}
            >
              <Text style={[
                styles.themeOptionText,
                currentLanguage === 'hi' && styles.themeOptionTextActive,
                { fontSize: 13 }
              ]}>हिन्दी</Text>
            </TouchableOpacity>

            {/* Telugu */}
            <TouchableOpacity
              style={[
                styles.themeOptionButton,
                currentLanguage === 'te' && styles.themeOptionActive,
                { flex: 1, paddingVertical: 10 }
              ]}
              onPress={() => setCurrentLanguage('te')}
            >
              <Text style={[
                styles.themeOptionText,
                currentLanguage === 'te' && styles.themeOptionTextActive,
                { fontSize: 13 }
              ]}>తెలుగు</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
          <Text style={styles.settingsSectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.logoutOptionButton}
            onPress={handleLogout}
          >
            <MaterialIcons
              name="logout"
              size={22}
              color="#EF4444"
            />
            <Text style={styles.logoutOptionText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
