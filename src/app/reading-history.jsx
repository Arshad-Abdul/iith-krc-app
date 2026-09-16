import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useTheme } from '../constants/ThemeContext';
import { getCheckoutHistory } from '../../services/kohaApi';
import { getSession } from '../../services/session';
import { getCache, saveCache } from '../../services/cache';

export default function ReadingHistoryScreen() {
  const { theme, activeTheme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = activeTheme === 'dark';

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const session = await getSession();
      if (!session?.token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Check cache first for instant load
      if (!isRefresh) {
        const cached = await getCache(`profile_${session.patron?.patron_id}`);
        if (cached?.data?.history) {
          setHistory(cached.data.history);
          setLoading(false);
        }
      }

      const freshHistory = await getCheckoutHistory(session.token).catch(() => []);
      if (Array.isArray(freshHistory)) {
        setHistory(freshHistory);
        // Update cache
        const cached = await getCache(`profile_${session.patron?.patron_id}`);
        if (cached?.data) {
          await saveCache(`profile_${session.patron?.patron_id}`, {
            ...cached.data,
            history: freshHistory,
          });
        }
      }
    } catch (err) {
      console.warn('Could not load checkout history:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extract available years from history
  const availableYears = useMemo(() => {
    const years = new Set();
    history.forEach((item) => {
      const itemDate = item.checkin_date || item.issuedate;
      if (itemDate) {
        const y = new Date(itemDate).getFullYear();
        if (!isNaN(y) && y > 2000) years.add(String(y));
      }
    });
    return ['ALL', ...Array.from(years).sort((a, b) => Number(b) - Number(a))];
  }, [history]);

  // Filter history by search query and selected year
  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return history.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const author = (item.author || '').toLowerCase();
      const barcode = (item.barcode || '').toLowerCase();

      const matchesSearch = !query || title.includes(query) || author.includes(query) || barcode.includes(query);
      if (!matchesSearch) return false;

      if (selectedYear !== 'ALL') {
        const itemDate = item.checkin_date || item.issuedate || item.date_due;
        if (!itemDate) return false;
        const year = String(new Date(itemDate).getFullYear());
        return year === selectedYear;
      }
      return true;
    });
  }, [history, searchQuery, selectedYear]);

  const renderHistoryItem = ({ item, index }) => {
    const cleanTitle = (item.title || '').replace(/\s*\/+\s*$/, '').trim() || `Book #${item.biblio_id}`;
    const cleanAuthor = item.author ? item.author.replace(/\s*[,/]+\s*$/, '').trim() : 'Unknown Author';
    const returnDate = item.checkin_date
      ? new Date(item.checkin_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Recently';

    return (
      <TouchableOpacity
        key={item.issue_id ?? item.checkout_id ?? index}
        style={[
          styles.itemCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
          },
        ]}
        onPress={() => {
          if (item.biblio_id) {
            router.push({ pathname: '/book-detail', params: { biblioId: item.biblio_id } });
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.itemIconWrap, { backgroundColor: isDark ? 'rgba(32,138,239,0.12)' : '#EFF6FF' }]}>
          <MaterialIcons name="assignment-turned-in" size={20} color={theme.accent} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
            {cleanTitle}
          </Text>
          <Text style={[styles.itemAuthor, { color: theme.textSecondary }]} numberOfLines={1}>
            {cleanAuthor}
          </Text>
          <View style={styles.itemMetaRow}>
            <MaterialIcons name="event-available" size={13} color={theme.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.itemDate, { color: theme.textSecondary }]}>
              Returned on {returnDate}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t.readingHistory || 'Reading History'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {history.length} {history.length === 1 ? 'Book' : 'Books'} Total
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
          <MaterialIcons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by title, author, or barcode..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Year Filter Pills */}
      {availableYears.length > 2 && (
        <View style={styles.pillsScrollWrap}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={availableYears}
            keyExtractor={(y) => y}
            contentContainerStyle={styles.pillsContent}
            renderItem={({ item: yr }) => {
              const count = yr === 'ALL'
                ? history.length
                : history.filter(h => {
                    const d = h.checkin_date || h.issuedate;
                    return d && String(new Date(d).getFullYear()) === yr;
                  }).length;
              const isSelected = selectedYear === yr;

              return (
                <TouchableOpacity
                  onPress={() => setSelectedYear(yr)}
                  style={[
                    styles.yearPill,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.backgroundElement,
                      borderColor: isSelected ? theme.accent : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.yearPillText,
                      { color: isSelected ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {yr === 'ALL' ? 'All Years' : yr}
                  </Text>
                  <View
                    style={[
                      styles.pillBadge,
                      { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillBadgeText,
                        { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading reading archive...
          </Text>
        </View>
      ) : filteredHistory.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
            <MaterialIcons name="menu-book" size={40} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {searchQuery ? 'No matching books' : 'No Reading History'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {searchQuery
              ? `No records matching "${searchQuery}". Try a different keyword.`
              : 'Completed borrowing records will appear here after returning books to KRC.'}
          </Text>
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={[styles.clearFilterBtn, { backgroundColor: theme.accent }]}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearFilterBtnText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item, index) => String(item.issue_id ?? item.checkout_id ?? `${item.biblio_id}-${index}`)}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          ListHeaderComponent={
            <View style={styles.listStatsHeader}>
              <Text style={[styles.listStatsCount, { color: theme.textSecondary }]}>
                Showing {filteredHistory.length} of {history.length} books
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  pillsScrollWrap: {
    paddingBottom: 8,
  },
  pillsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  yearPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listStatsHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  listStatsCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  itemIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  itemAuthor: {
    fontSize: 12,
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  clearFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearFilterBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
