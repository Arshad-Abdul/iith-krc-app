import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getInterestRecommendations, getInterests } from '../../services/kohaApi';
import { getSession } from '../../services/session';
import { coverUrl, searchBooks } from '../../services/webopacApi';
import { useTheme } from '../constants/ThemeContext';

export default function InterestBooksScreen() {
  const { theme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Unified responsive column layout: 2 columns on mobile (< 600px)
  const numCols = width >= 1100 ? 5 : width >= 840 ? 4 : width >= 600 ? 3 : 2;
  const cardWidth = Math.floor((width - 24 - (numCols - 1) * 12) / numCols);
  const styles = createStyles(theme, insets, cardWidth);

  const [allBooks, setAllBooks] = useState([]);
  const [userInterests, setUserInterests] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadInterestBooks = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const session = await getSession();
      const token = session?.token;

      // 1. Fetch user interests from Koha backend or local storage
      let interests = [];
      if (token) {
        interests = await getInterests(token).catch(() => []);
      }
      if (!Array.isArray(interests) || interests.length === 0) {
        const rawLocal = await AsyncStorage.getItem('@user_interests');
        interests = rawLocal ? JSON.parse(rawLocal) : [];
      }

      setUserInterests(interests);

      if (!Array.isArray(interests) || interests.length === 0) {
        setAllBooks([]);
        return;
      }

      // 2. Fetch direct recommendations from backend
      let backendRecs = [];
      if (token) {
        backendRecs = await getInterestRecommendations(token).catch(() => []);
      }

      // 3. For ALL user interests, fetch books from OPAC catalog
      const bookMap = new Map();

      // Seed map with backend recommendations
      if (Array.isArray(backendRecs)) {
        for (const item of backendRecs) {
          const id = item.biblio_id || item.id || item.biblionumber;
          const topic = item.topic || (interests[0]?.subject_name || interests[0]?.name) || '';
          if (id) {
            const sId = String(id);
            bookMap.set(sId, {
              biblio_id: id,
              title: item.title || 'Untitled',
              author: item.author || '',
              topics: topic ? [topic] : [],
            });
          }
        }
      }

      // Fetch books across each interest topic
      await Promise.all(
        interests.map(async (interest) => {
          const topicName = interest.subject_name || interest.name || '';
          const queries = [
            topicName.split('&')[0].trim(),
            topicName.split('&')[1]?.trim(),
            topicName,
            interest.ddc_code,
          ].filter(Boolean);

          for (const q of queries) {
            try {
              const res = await searchBooks(q, { limit: 25 }).catch(() => null);
              const found = Array.isArray(res?.books) ? res.books : [];
              if (found.length > 0) {
                found.forEach((b) => {
                  const bId = String(b.biblio_id || b.id || b.biblionumber);
                  if (bId && bId !== 'undefined') {
                    if (bookMap.has(bId)) {
                      const existing = bookMap.get(bId);
                      if (!existing.topics.includes(topicName)) {
                        existing.topics.push(topicName);
                      }
                    } else {
                      bookMap.set(bId, {
                        biblio_id: bId,
                        title: b.title || 'Untitled',
                        author: b.author || b.creator || '',
                        topics: [topicName],
                      });
                    }
                  }
                });
                break; // Found results for this interest topic
              }
            } catch {}
          }
        })
      );

      const aggregatedBooks = Array.from(bookMap.values());
      setAllBooks(aggregatedBooks);
    } catch (err) {
      console.warn('Error loading all interest books:', err);
      setError(err.message || 'Could not load interest recommendations.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInterestBooks();
  }, []);

  // Filter books based on active topic filter pill
  const filteredBooks = useMemo(() => {
    if (selectedTopic === 'ALL') {
      return allBooks;
    }
    return allBooks.filter((book) => book.topics && book.topics.includes(selectedTopic));
  }, [allBooks, selectedTopic]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard');
    }
  };

  const renderBook = ({ item }) => {
    const primaryTopic = (selectedTopic !== 'ALL' && item.topics?.includes(selectedTopic))
      ? selectedTopic
      : (item.topics?.find((t) => t !== 'Recommended') || item.topics?.[0]);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/book-detail', params: { biblioId: item.biblio_id } })}
      >
        <Image
          source={{ uri: coverUrl(item.biblio_id) }}
          style={styles.cover}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          {primaryTopic ? (
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText} numberOfLines={1}>
                {primaryTopic}
              </Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.author ? (
            <Text style={styles.author} numberOfLines={1}>
              {item.author}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton} accessibilityLabel="Back">
            <MaterialIcons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t.basedOnYourInterests || 'Based on your interests'}
          </Text>
          <View style={{ width: 42 }} />
        </View>
      </View>

      {/* Topic Filter Pills (When user has interests) */}
      {userInterests.length > 0 && !isLoading && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterPill, selectedTopic === 'ALL' && styles.filterPillActive]}
              onPress={() => setSelectedTopic('ALL')}
            >
              <Text style={[styles.filterPillText, selectedTopic === 'ALL' && styles.filterPillTextActive]}>
                {t.allInterests || 'All Interests'} ({allBooks.length})
              </Text>
            </TouchableOpacity>

            {userInterests.map((interest, idx) => {
              const name = interest.subject_name || interest.name || `Topic ${idx + 1}`;
              const count = allBooks.filter((b) => b.topics?.includes(name)).length;
              const isSelected = selectedTopic === name;

              return (
                <TouchableOpacity
                  key={interest.ddc_code || name || idx}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => setSelectedTopic(name)}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {name} {count > 0 ? `(${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Content State */}
      {isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <MaterialIcons name="error-outline" size={44} color={theme.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => loadInterestBooks(false)}>
            <Text style={styles.actionBtnText}>{t.retry || 'Try Again'}</Text>
          </TouchableOpacity>
        </View>
      ) : userInterests.length === 0 ? (
        <View style={styles.centerFill}>
          <View style={styles.emptyIconCircle}>
            <MaterialIcons name="bookmark-border" size={48} color={theme.accent} />
          </View>
          <Text style={styles.emptyTitle}>
            {t.noInterestsSelected || 'No Academic Interests Selected'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t.noInterestsDesc ||
              'Select your academic & research interests in your profile to see personalized book recommendations across all your subjects.'}
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/profile')}>
            <MaterialIcons name="tune" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>{t.selectInterestsBtn || 'Choose Academic Topics'}</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.centerFill}>
          <MaterialIcons name="search-off" size={44} color={theme.textSecondary} />
          <Text style={styles.emptyTitle}>{t.noResults || 'No books found'}</Text>
          <Text style={styles.emptySubtitle}>
            No catalog results currently matched this topic. Try selecting another topic or update your interests.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item, index) => String(item.biblio_id ? `${item.biblio_id}-${index}` : index)}
          renderItem={renderBook}
          key={numCols}
          numColumns={numCols}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadInterestBooks(true)}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme, insets, cardWidth) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.primary,
    },
    headerSafeArea: {
      backgroundColor: theme.primary,
      paddingTop: insets?.top || 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: theme.text,
      fontSize: 17,
      fontWeight: 'bold',
    },
    filterContainer: {
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.06)',
      backgroundColor: theme.primary,
    },
    filterScroll: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    filterPillActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    filterPillTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    centerFill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${theme.accent}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
      maxWidth: 320,
    },
    errorText: {
      color: theme.textSecondary,
      marginTop: 12,
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 13,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
    },
    actionBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    grid: {
      padding: 12,
      paddingBottom: 24,
    },
    row: {
      gap: 12,
      marginBottom: 12,
    },
    card: {
      width: cardWidth,
      backgroundColor: theme.backgroundElement,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    cover: {
      width: '100%',
      aspectRatio: 2 / 3,
      backgroundColor: theme.backgroundSelected,
    },
    cardContent: {
      padding: 10,
    },
    topicBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: `${theme.accent}20`,
      marginBottom: 6,
    },
    topicBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.accent,
    },
    title: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    author: {
      color: theme.textSecondary,
      fontSize: 11,
      marginTop: 4,
    },
  });
