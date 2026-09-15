import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import ReadingSpeedTimer from '../components/ReadingSpeedTimer';

const toolsList = [
  {
    id: 'grammarly',
    title: 'Grammarly',
    icon: 'spellcheck',
    badge: 'Writing Assistant',
    description: 'Automated grammar tutor, writing revision tool, and style enhancer. Premium institutional access for IITH students and faculty.',
    url: 'https://docs.google.com/forms/d/1bRGyt3wOUJmvZvZqXzmvVhfEHiYPo5E7YgIVVQI54wU/edit',
    actionText: 'Access Grammarly',
  },
  {
    id: 'turnitin',
    title: 'Turnitin',
    icon: 'fact-check',
    badge: 'Plagiarism Checker',
    description: 'Industry-standard similarity checking and plagiarism detection for academic papers, theses, dissertations, and course assignments.',
    url: 'https://www.turnitin.com',
    actionText: 'Access Turnitin',
  },
  {
    id: 'overleaf',
    title: 'Overleaf',
    icon: 'code',
    badge: 'LaTeX Editor',
    description: 'Collaborative cloud-based LaTeX editor equipped with IITH thesis templates, real-time collaboration, and rich typesetting tools.',
    url: 'https://www.overleaf.com/edu/iith',
    actionText: 'Access Overleaf',
  },
];

export default function ToolsScreen() {
  const { theme, activeTheme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, activeTheme, insets);

  const handleOpenTool = (tool) => {
    router.push({
      pathname: '/web-view',
      params: {
        url: tool.url,
        title: tool.title,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.academicTools || 'Academic Tools'}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subheading}>
          Essential research, writing, and plagiarism checking software provided by KRC IIT Hyderabad.
        </Text>

        {toolsList.map((tool) => (
          <View key={tool.id} style={styles.toolCard}>
            <View style={styles.toolCardHeader}>
              <View style={styles.iconBox}>
                <MaterialIcons name={tool.icon} size={28} color={theme.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tool.badge}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.toolDesc}>{tool.description}</Text>

            <TouchableOpacity 
              style={styles.openButton}
              onPress={() => handleOpenTool(tool)}
              activeOpacity={0.8}
            >
              <Text style={styles.openButtonText}>{tool.actionText}</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Study & Reading Speed Tracker Utility */}
        <View style={{ marginTop: 22, marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
            Study & Reading Utilities
          </Text>
          <Text style={[styles.subheading, { marginBottom: 6, marginTop: 4 }]}>
            Track your personal reading pace and estimate study hours for your textbooks or coursework.
          </Text>
        </View>

        <ReadingSpeedTimer />

        <View style={styles.contactNoteBox}>
          <MaterialIcons name="info-outline" size={22} color={theme.accent} />
          <Text style={styles.contactNoteText}>
            Note: Contact office.library@iith.ac.in for access credentials to Grammarly and Turnitin.
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme, activeTheme, insets) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerSafeArea: {
      backgroundColor: theme.primary,
      paddingTop: insets?.top || 0,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 56,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
    scrollContent: {
      padding: 16,
    },
    subheading: {
      fontSize: 13.5,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    toolCard: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    toolCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: isDark ? `${theme.accent}1E` : `${theme.accent}12`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toolTitle: {
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: theme.text,
    },
    badge: {
      backgroundColor: `${theme.accent}14`,
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.accent,
      letterSpacing: 0.2,
    },
    toolDesc: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 19,
      marginBottom: 16,
    },
    openButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 6,
    },
    openButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    contactNoteBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? `${theme.accent}10` : `${theme.accent}0A`,
      padding: 16,
      borderRadius: 14,
      marginTop: 12,
      borderWidth: 1,
      borderColor: isDark ? `${theme.accent}30` : `${theme.accent}20`,
    },
    contactNoteText: {
      marginLeft: 12,
      flex: 1,
      fontSize: 12.5,
      color: theme.textSecondary,
      lineHeight: 19,
    },
  });
};
