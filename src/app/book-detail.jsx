import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { coverUrl, getBookDetail } from '../../services/webopacApi';
import { addToWishlist, isInWishlist, removeFromWishlist } from '../../services/wishlist';

export default function BookDetailScreen() {
  const { biblioId } = useLocalSearchParams();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    if (!biblioId) return;
    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getBookDetail(biblioId);
        setBook(data);
        setWishlisted(await isInWishlist(Number(biblioId)));
      } catch (err) {
        setError(err.message || 'Could not load this book.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [biblioId]);

  const toggleWishlist = async () => {
    if (!book) return;
    if (wishlisted) {
      await removeFromWishlist(book.biblio_id);
      setWishlisted(false);
    } else {
      await addToWishlist({ biblio_id: book.biblio_id, title: book.title, author: book.author });
      setWishlisted(true);
    }
  };

  const subjects = Array.isArray(book?.subjects) ? book.subjects : [];

  return (
    <View style={styles.container}>
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Book Details</Text>
          <TouchableOpacity onPress={toggleWishlist} style={styles.backButton}>
            <MaterialIcons
              name={wishlisted ? 'bookmark' : 'bookmark-border'}
              size={26}
              color={wishlisted ? theme.accent : theme.text}
            />
          </TouchableOpacity>
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
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Image source={{ uri: coverUrl(book.biblio_id) }} style={styles.cover} resizeMode="cover" />

          <Text style={styles.title}>{book.title}</Text>
          {book.author ? <Text style={styles.author}>{book.author}</Text> : null}

          <View style={styles.metaRow}>
            {book.copyrightdate ? (
              <View style={styles.metaChip}><Text style={styles.metaChipText}>{book.copyrightdate}</Text></View>
            ) : null}
            {book.isbn ? (
              <View style={styles.metaChip}><Text style={styles.metaChipText}>ISBN {book.isbn}</Text></View>
            ) : null}
          </View>

          {subjects.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Subjects</Text>
              <View style={styles.subjectRow}>
                {subjects.map((s, i) => {
                  const key = s?.subject_key ?? s?.key ?? String(s);
                  const label = s?.subject_name ?? s?.name ?? String(s);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => router.push({ pathname: '/subject-books', params: { subjectKey: key, label } })}
                    >
                      <View style={styles.subjectChip}>
                        <Text style={styles.subjectChipText}>{label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {book.notes ? (
            <>
              <Text style={styles.sectionTitle}>About this book</Text>
              <Text style={styles.notes}>{book.notes}</Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Availability ({book.item_count ?? 0} copies)</Text>
          {(book.items ?? []).length === 0 ? (
            <Text style={styles.emptyText}>No holdings information available.</Text>
          ) : (
            book.items.map((item, i) => (
              <View key={item.itemnumber ?? i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemCallNumber}>{item.call_number || item.item_type_desc}</Text>
                  <Text style={styles.itemMeta}>
                    {item.location ? `${item.location} • ` : ''}{item.holdingbranch}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'Available' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)' },
                  ]}
                >
                  <Text style={{ color: item.status === 'Available' ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: 12 }}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
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
    scrollContent: { padding: 20, alignItems: 'center' },
    cover: { width: 160, height: 240, borderRadius: 12, backgroundColor: theme.backgroundSelected, marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    author: { fontSize: 14, color: theme.textSecondary, fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
    metaChip: { backgroundColor: theme.backgroundElement, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    metaChipText: { color: theme.textSecondary, fontSize: 12 },
    sectionTitle: { alignSelf: 'flex-start', fontSize: 15, fontWeight: 'bold', color: theme.text, marginTop: 24, marginBottom: 8 },
    notes: { alignSelf: 'flex-start', fontSize: 13, color: theme.textSecondary, lineHeight: 20 },
    emptyText: { alignSelf: 'flex-start', color: theme.textSecondary, fontSize: 13 },
    subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'flex-start' },
    subjectChip: {
      backgroundColor: theme.backgroundElement, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: theme.accent + '44',
    },
    subjectChipText: { color: theme.accent, fontSize: 12, fontWeight: '600' },
    itemRow: {
      flexDirection: 'row', alignItems: 'center', width: '100%',
      backgroundColor: theme.backgroundElement, borderRadius: 12, padding: 12, marginBottom: 8,
    },
    itemCallNumber: { color: theme.text, fontWeight: '600', fontSize: 13 },
    itemMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  });
