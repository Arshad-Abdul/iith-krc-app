import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { coverUrl, getSubjectBooks } from '../../services/webopacApi';

export default function SubjectBooksScreen() {
  const { subjectKey, label } = useLocalSearchParams();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subjectKey) return;
    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getSubjectBooks(subjectKey, 40);
        setBooks(data);
      } catch (err) {
        setError(err.message || 'Could not load books for this subject.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [subjectKey]);

  const renderBook = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/book-detail', params: { biblioId: item.biblio_id } })}
    >
      <Image
        source={{ uri: coverUrl(item.biblio_id) }}
        style={styles.cover}
        resizeMode="cover"
      />
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      {item.author ? <Text style={styles.author} numberOfLines={1}>{item.author}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{label || 'Subject Books'}</Text>
          <View style={{ width: 42 }} />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <MaterialIcons name="error-outline" size={40} color={theme.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : books.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>No books found for this subject.</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => String(item.biblio_id)}
          renderItem={renderBook}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
}

const createStyles = (theme, insets) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.primary },
    headerSafeArea: { backgroundColor: theme.primary, paddingTop: insets?.top || 0 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      height: 56, paddingHorizontal: 12,
      borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton: { padding: 8 },
    headerTitle: { flex: 1, textAlign: 'center', color: theme.text, fontSize: 17, fontWeight: 'bold' },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: theme.textSecondary, marginTop: 12, textAlign: 'center' },
    grid: { padding: 12 },
    row: { gap: 12, marginBottom: 12 },
    card: {
      flex: 1, backgroundColor: theme.backgroundElement,
      borderRadius: 14, overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    cover: { width: '100%', height: 160, backgroundColor: theme.backgroundSelected },
    title: { fontSize: 13, fontWeight: '600', color: theme.text, padding: 10, paddingBottom: 2 },
    author: { fontSize: 11, color: theme.textSecondary, paddingHorizontal: 10, paddingBottom: 10 },
  });
