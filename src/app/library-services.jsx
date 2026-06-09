import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

const services = [
  {
    title: 'Document Delivery Service',
    icon: 'local-shipping',
    description: 'Arrange to obtain copies of papers from journals, conference proceedings, and other sources not held in our collection.',
  },
  {
    title: 'Book Suggestion/Procurement',
    icon: 'add-business',
    description: 'Recommend books and other resources required for teaching and research.',
  },
  {
    title: 'Similarity Checking Service',
    icon: 'fact-check',
    description: 'Plagiarism Checking Service using Turnitin tool for researchers.',
  },
  {
    title: 'Grammarly',
    icon: 'spellcheck',
    description: 'Automated grammar tutor and revision tool for writing assignments.',
  },
  {
    title: 'Group Discussion Rooms',
    icon: 'groups',
    description: 'Discussion Rooms, Seminar Room, and Virtual Classrooms for group academic interactions.',
  },
  
];

export default function LibraryServicesScreen() {
  const { theme, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, activeTheme, insets);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => {
        if (item.title === 'DOI Document Search') {
          router.push('/doi-search');
        } else {
          router.push({ pathname: '/service-detail', params: { title: item.title } });
        }
      }}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons name={item.icon} size={36} color={theme.accent} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Library Services</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.title}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        style={styles.list}
      />
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
      borderBottomWidth: 1, 
      borderBottomColor: 'rgba(255,255,255,0.05)' 
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
    backButton: { padding: 8 },
    headerTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    list: { flex: 1, backgroundColor: theme.background },
    listContainer: { padding: 12 },
    card: {
      flex: 1,
      backgroundColor: theme.backgroundElement,
      padding: 16,
      borderRadius: 16,
      margin: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 140,
      maxWidth: '46%', // Ensures the odd 5th item doesn't stretch across the entire screen
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 6,
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.backgroundSelected,
    },
    iconContainer: {
      backgroundColor: isDark ? 'rgba(212, 160, 23, 0.1)' : 'rgba(212, 160, 23, 0.08)',
      padding: 14,
      borderRadius: 50, // Pure circle icon container for premium look
      marginBottom: 12,
      alignItems: 'center',
      justifyContent: 'center'
    },
    cardTitle: {
      fontWeight: 'bold',
      fontSize: 15,
      color: theme.text,
      textAlign: 'center',
      lineHeight: 20
    },
  });
};
