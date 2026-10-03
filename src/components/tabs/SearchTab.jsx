import React from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { coverUrl } from '../../../services/webopacApi';
import { useTheme } from '../../constants/ThemeContext';

export default function SearchTab({
  currentLanguage = 'en',
  theme: propTheme,
  styles,
  searchQuery,
  setSearchQuery,
  searchType,
  setSearchType,
  setIsTypeModalVisible,
  getSelectedType,
  handleClearSearch,
  handleSearchSubmit,
  isSearchingCatalog,
  catalogSearchError,
  catalogResults,
  pagination,
  openBookDetail,
  handleCatalogSearch,
  searchHistory,
  clearSearchHistory,
}) {
  const { theme, t } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.tabHeading}>{t.searchHeading}</Text>
      <Text style={styles.tabSubheading}>{t.searchSub}</Text>

      {/* Search Input Bar with integrated options */}
      <View style={styles.searchBarContainer}>
        <TouchableOpacity
          style={styles.searchSourceSelector}
          onPress={() => setIsTypeModalVisible(true)}
        >
          <Text style={styles.searchSourceText}>{getSelectedType(searchType).label}</Text>
          <MaterialIcons name="arrow-drop-down" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={styles.searchSeparator} />

        <TextInput
          style={styles.searchBarInput}
          placeholder={`Search by ${getSelectedType(searchType).label.toLowerCase()}...`}
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />

        {/* OCR Camera Barcode Scanner Shortcut */}
        <TouchableOpacity 
          onPress={() => router.push('/ocr-scanner')} 
          style={{ padding: 6, marginRight: 4 }}
        >
          <MaterialIcons name="qr-code-scanner" size={22} color={theme.accent} />
        </TouchableOpacity>

        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={handleClearSearch} style={{ padding: 4, marginRight: 4 }}>
            <MaterialIcons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchSubmitButton}>
          <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {(isSearchingCatalog || Boolean(catalogSearchError) || catalogResults !== null) ? (
        <View style={styles.catalogResultsContainer}>
          <View style={styles.resultsHeaderRow}>
            <Text style={styles.resultsHeaderTitle}>
              {catalogResults ? `${t.results || 'Results'} (${pagination.total ?? catalogResults.length})` : (t.searchHeading || 'Search Results')}
            </Text>
            {(catalogResults !== null || Boolean(catalogSearchError)) ? (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearResultsBtn}>
                <MaterialIcons name="close" size={16} color={theme.accent} />
                <Text style={styles.clearResultsText}>{t.clear || 'Clear'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isSearchingCatalog ? (
            <ActivityIndicator size="small" color={theme.accent} style={{ paddingVertical: 24 }} />
          ) : Boolean(catalogSearchError) ? (
            <Text style={styles.catalogResultsError}>{catalogSearchError}</Text>
          ) : catalogResults && catalogResults.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16 }}>
              <Text style={styles.catalogResultsEmpty}>
                {searchType === 'bc'
                  ? `No book found with Accession No "${searchQuery}".`
                  : searchType === 'isbn'
                  ? `No book found with ISBN "${searchQuery}".`
                  : t.noResults || 'No results found.'}
              </Text>
              {(searchType === 'title' || searchType === 'author') && /^(?:[A-Za-z]?[0-9]{4,8}|97[89][0-9]{10}|[0-9]{10})$/.test(searchQuery.trim()) && typeof setSearchType === 'function' ? (
                <TouchableOpacity
                  onPress={() => {
                    const newType = /^(?:97[89][0-9]{10}|[0-9]{10})$/.test(searchQuery.trim()) ? 'isbn' : 'bc';
                    setSearchType(newType);
                    handleCatalogSearch(searchQuery, newType, 0);
                  }}
                  style={{ marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.accent + '20', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <MaterialIcons name="swap-horiz" size={18} color={theme.accent} />
                  <Text style={{ fontSize: 13, color: theme.accent, fontWeight: '600' }}>
                    Search as {/^(?:97[89][0-9]{10}|[0-9]{10})$/.test(searchQuery.trim()) ? 'ISBN' : 'Accession No'} instead
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : catalogResults ? (
            <>
              {catalogResults.map((item, index) => (
                <TouchableOpacity
                  key={item.biblio_id ?? index}
                  style={styles.catalogResultItem}
                  onPress={() => openBookDetail(item.biblio_id)}
                >
                  <Image source={{ uri: coverUrl(item.biblio_id) }} style={styles.catalogResultCover} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogResultTitle} numberOfLines={2}>{item.title}</Text>
                    {item.author ? <Text style={styles.catalogResultAuthor} numberOfLines={1}>{item.author}</Text> : null}
                    {typeof item.available_count === 'number' ? (
                      <Text style={styles.catalogResultAvailability}>
                        {item.available_count > 0 ? `${item.available_count} ${t.available || 'available'}` : (t.checkedOut || 'Not available')}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}

              {pagination.totalPages && pagination.totalPages > 1 ? (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.paginationButton, !pagination.canGoBack && styles.paginationButtonDisabled]}
                    disabled={!pagination.canGoBack || isSearchingCatalog}
                    onPress={() => handleCatalogSearch(searchQuery, searchType, Math.max(0, pagination.offset - pagination.limit))}
                  >
                    <Text style={[styles.paginationButtonText, !pagination.canGoBack && styles.paginationButtonTextDisabled]}>
                      {t.previous || '← Previous'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.paginationLabel}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[styles.paginationButton, !pagination.hasMore && styles.paginationButtonDisabled]}
                    disabled={!pagination.hasMore || isSearchingCatalog}
                    onPress={() => handleCatalogSearch(searchQuery, searchType, pagination.offset + pagination.limit)}
                  >
                    <Text style={[styles.paginationButtonText, !pagination.hasMore && styles.paginationButtonTextDisabled]}>
                      {t.next || 'Next →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : (
        <View style={{ width: '100%', marginTop: 24 }}>
          {/* Search History */}
          {searchHistory.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.historySectionTitle}>{t.recentSearches || "Recent Searches"}</Text>
                <TouchableOpacity onPress={clearSearchHistory}>
                  <Text style={{ fontSize: 12, color: theme.accent, fontWeight: 'bold' }}>{t.clearAll || "Clear All"}</Text>
                </TouchableOpacity>
              </View>
              {searchHistory.map((histQuery, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.historyItemRow}
                  onPress={() => {
                    setSearchQuery(histQuery);
                    handleCatalogSearch(histQuery, searchType, 0);
                  }}
                >
                  <MaterialIcons name="history" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 13, color: theme.text, flex: 1 }}>{histQuery}</Text>
                  <MaterialIcons name="north-west" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Search Trends */}
          <Text style={[styles.historySectionTitle, { marginBottom: 12 }]}>{t.trendingTopics}</Text>
          <View style={styles.trendsRow}>
            {[
              "Artificial Intelligence",
              "Machine Learning",
              "Algorithms",
              "Quantum Computing",
              "Signal Processing",
              "Mathematics",
              "Data Structures",
              "Robotics"
            ].map((trend, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.trendTag}
                onPress={() => {
                  setSearchQuery(trend);
                  handleCatalogSearch(trend, searchType, 0);
                }}
              >
                <Text style={styles.trendTagText}>{trend}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
