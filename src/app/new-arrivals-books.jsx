import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useTheme } from '../constants/ThemeContext';
import { coverUrl, getRecentBooks } from '../../services/webopacApi';

// Color palettes for fallback book covers
const FALLBACK_PALETTES = [
  { bg: '#0369A1', border: '#0284C7', accent: '#38BDF8' }, // Sky Blue
  { bg: '#0F766E', border: '#14B8A6', accent: '#2DD4BF' }, // Teal
  { bg: '#4338CA', border: '#6366F1', accent: '#A5B4FC' }, // Indigo
  { bg: '#B45309', border: '#D97706', accent: '#FDE68A' }, // Amber
  { bg: '#BE185D', border: '#DB2777', accent: '#F472B6' }, // Rose
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Latest Added', icon: 'schedule' },
  { id: 'title', label: 'Title A–Z', icon: 'sort-by-alpha' },
  { id: 'author', label: 'Author A–Z', icon: 'person' },
];

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\s*\/+\s*$/, '').replace(/\s*,\s*$/, '').trim();
}

function formatDate(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

function NewArrivalCard({ item, cardWidth, theme, isDark }) {
  const [imageFailed, setImageFailed] = useState(false);

  const title = cleanText(item.title) || 'Untitled Acquisition';
  const author = cleanText(item.author) || 'Unknown Author';
  const year = item.copyrightdate ? String(item.copyrightdate) : null;
  const accessionDate = formatDate(item.dateaccessioned);

  const palette = useMemo(() => {
    const seed = (item.biblio_id || 0) % FALLBACK_PALETTES.length;
    return FALLBACK_PALETTES[seed];
  }, [item.biblio_id]);

  const initials = useMemo(() => {
    return title
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
  }, [title]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: theme.backgroundElement,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
        },
      ]}
      onPress={() => router.push({ pathname: '/book-detail', params: { biblioId: item.biblio_id } })}
      activeOpacity={0.82}
    >
      {/* Book Cover Container */}
      <View style={[styles.coverContainer, { backgroundColor: palette.bg }]}>
        {!imageFailed ? (
          <Image
            source={{ uri: coverUrl(item.biblio_id) }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          /* High-end Academic Fallback Cover */
          <View style={[styles.fallbackCover, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={styles.fallbackSpine} />
            <View style={styles.fallbackContent}>
              <View style={[styles.fallbackIconWrap, { backgroundColor: `${palette.accent}20` }]}>
                <MaterialIcons name="auto-stories" size={24} color={palette.accent} />
              </View>
              <Text style={[styles.fallbackInitials, { color: palette.accent }]}>{initials}</Text>
              <Text style={styles.fallbackKrcLabel}>KRC NEW</Text>
            </View>
          </View>
        )}

        {/* Badges Over Cover */}
        <View style={styles.coverBadgeRow}>
          <View style={styles.newPill}>
            <MaterialIcons name="auto-awesome" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.newPillText}>NEW</Text>
          </View>
          {year && (
            <View style={styles.yearPill}>
              <Text style={styles.yearPillText}>{year}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Book Information */}
      <View style={styles.bookInfo}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.authorRow}>
          <MaterialIcons name="person-outline" size={13} color={theme.accent} style={{ marginRight: 3, marginTop: 1 }} />
          <Text style={[styles.author, { color: theme.textSecondary }]} numberOfLines={1}>
            {author}
          </Text>
        </View>

        {/* Footer info: Accession date */}
        <View style={[styles.footerMeta, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
          <Text style={[styles.accessionText, { color: theme.textSecondary }]} numberOfLines={1}>
            {accessionDate ? `Added ${accessionDate}` : 'Recent Arrival'}
          </Text>
          <View style={[styles.viewChip, { backgroundColor: `${theme.accent}14` }]}>
            <Text style={[styles.viewChipText, { color: theme.accent }]}>View</Text>
            <MaterialIcons name="chevron-right" size={12} color={theme.accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NewArrivalsBooksScreen() {
  const { theme, activeTheme, t } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Responsive column calculation
  const numCols = width >= 1100 ? 5 : width >= 840 ? 4 : width >= 600 ? 3 : 2;
  const gap = 14;
  const horizontalPadding = 16;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - (numCols - 1) * gap) / numCols);

  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const fetchRecentBooks = async () => {
    try {
      setError('');
      const data = await getRecentBooks(100);
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load new arrivals.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecentBooks();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRecentBooks();
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard');
    }
  };

  // Filtered and sorted books
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const authorMatch = (item.author || '').toLowerCase().includes(q);
        const yearMatch = String(item.copyrightdate || '').includes(q);
        return titleMatch || authorMatch || yearMatch;
      });
    }

    // Sort order
    if (sortBy === 'newest') {
      result.sort((a, b) => {
        const dateA = a.dateaccessioned ? new Date(a.dateaccessioned).getTime() : 0;
        const dateB = b.dateaccessioned ? new Date(b.dateaccessioned).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'author') {
      result.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    }

    return result;
  }, [books, searchQuery, sortBy]);

  // Render header component of the list
  const renderListHeader = () => (
    <View style={styles.listHeaderContainer}>
      {/* Executive Showcase Banner */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF',
            borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE',
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={[styles.heroBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE' }]}>
            <MaterialIcons name="auto-awesome" size={13} color={theme.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.heroBadgeText, { color: theme.accent }]}>
              RECENT CATALOG ACQUISITIONS
            </Text>
          </View>
          <View style={[styles.krcSealWrap, { backgroundColor: `${theme.accent}18` }]}>
            <MaterialIcons name="library-add" size={20} color={theme.accent} />
          </View>
        </View>

        <Text style={[styles.heroTitle, { color: theme.text }]}>
          New Arrivals at KRC
        </Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          Newly processed print volumes, reference works, and academic literature recently accessioned into the IIT Hyderabad collection.
        </Text>

        {/* Micro-metrics Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
            <MaterialIcons name="verified" size={13} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={[styles.statPillText, { color: theme.text }]}>
              {books.length} Fresh Additions
            </Text>
          </View>

          <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
            <MaterialIcons name="local-library" size={13} color={theme.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.statPillText, { color: theme.text }]}>
              Available on Shelf
            </Text>
          </View>
        </View>
      </View>

      {/* Modern Search Bar */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
          },
        ]}
      >
        <MaterialIcons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search new arrivals by title, author, year..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
            <MaterialIcons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sorting and Result Summary Bar */}
      <View style={styles.resultSummaryBar}>
        <Text style={[styles.resultCountText, { color: theme.textSecondary }]}>
          Showing <Text style={{ color: theme.text, fontWeight: '700' }}>{filteredBooks.length}</Text> of {books.length} acquisitions
        </Text>

        {/* Sort selector pill */}
        <View style={styles.sortPillGroup}>
          {SORT_OPTIONS.map((opt) => {
            const isOptActive = sortBy === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSortBy(opt.id)}
                style={[
                  styles.sortPill,
                  {
                    backgroundColor: isOptActive
                      ? `${theme.accent}18`
                      : 'transparent',
                    borderColor: isOptActive
                      ? theme.accent
                      : 'transparent',
                  },
                ]}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={12}
                  color={isOptActive ? theme.accent : theme.textSecondary}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    styles.sortPillText,
                    {
                      color: isOptActive ? theme.accent : theme.textSecondary,
                      fontWeight: isOptActive ? '700' : '500',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Navigation Top Header */}
      <View
        style={[
          styles.headerSafeArea,
          {
            backgroundColor: theme.primary,
            paddingTop: insets?.top || 0,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={[
              styles.backButton,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <MaterialIcons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {t.newArrivals || 'New Arrivals'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Recently Accessioned Catalog
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleRefresh}
            style={[
              styles.headerActionBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <MaterialIcons name="refresh" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading New Acquisitions...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <View style={[styles.errorIconBox, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <MaterialIcons name="error-outline" size={38} color="#EF4444" />
          </View>
          <Text style={[styles.errorTitle, { color: theme.text }]}>Unable to Load New Arrivals</Text>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.accent }]}
            onPress={fetchRecentBooks}
          >
            <MaterialIcons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => String(item.biblio_id)}
          renderItem={({ item }) => (
            <NewArrivalCard
              item={item}
              cardWidth={cardWidth}
              theme={theme}
              isDark={isDark}
            />
          )}
          key={numCols}
          numColumns={numCols}
          contentContainerStyle={[styles.grid, { paddingHorizontal: horizontalPadding }]}
          columnWrapperStyle={[styles.row, { gap }]}
          ListHeaderComponent={renderListHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
                <MaterialIcons name="search-off" size={42} color={theme.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No New Arrivals Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {searchQuery
                  ? `No books matched "${searchQuery}". Try searching with different keywords.`
                  : 'No new arrivals found.'}
              </Text>
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={[styles.resetFilterBtn, { borderColor: theme.accent }]}
                  onPress={() => setSearchQuery('')}
                >
                  <MaterialIcons name="restart-alt" size={16} color={theme.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.resetFilterBtnText, { color: theme.accent }]}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSafeArea: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderContainer: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  krcSealWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  resultSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 8,
  },
  resultCountText: {
    fontSize: 12,
  },
  sortPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 11,
  },
  grid: {
    paddingBottom: 40,
  },
  row: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  fallbackCover: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    position: 'relative',
  },
  fallbackSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fallbackContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  fallbackIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  fallbackInitials: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  fallbackKrcLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.4)',
  },
  coverBadgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  yearPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  yearPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  bookInfo: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    letterSpacing: -0.1,
    minHeight: 34,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  author: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
  },
  accessionText: {
    fontSize: 9.5,
    fontWeight: '500',
    flex: 1,
    marginRight: 4,
  },
  viewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 14,
    fontWeight: '500',
  },
  errorIconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: 280,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  resetFilterBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
