import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logout, getMe, getReadingHabits, getAccountLines, getLeaderboard, getReadNextRecommendations, getInterestRecommendations, getEvents, getNotifications, getRecommendations, getInterests } from '../../services/kohaApi';
import { clearSession, getSession } from '../../services/session';
import {
  getFacultyPublications,
  getMostBorrowedThisMonth,
  getRecentBooks,
  getSubjectBooks,
  getSubjects,
  searchBooks,
} from '../../services/webopacApi';
import { useTheme } from '../constants/ThemeContext';
import ProfileScreen from './profile'; // Import ProfileScreen to embed in Account tab

// Import modular tabs
import HomeTab from '../components/tabs/HomeTab';
import MenuTab from '../components/tabs/MenuTab';
import SearchTab from '../components/tabs/SearchTab';
import EventsTab from '../components/tabs/EventsTab';

// Import modular modals
import SettingsModal from '../components/modals/SettingsModal';
import SearchTypeModal from '../components/modals/SearchTypeModal';

// Import translations
import { translations, getSavedLanguage, saveLanguageSetting } from '../constants/translations';

// Import widgets
import YearlyGoalsCard from '../components/YearlyGoalsCard';
import { sendInstantNotification, registerForPushNotificationsAsync } from '../utils/notifications';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = Math.min(screenWidth - 80, 300);
const CARD_MARGIN = 15;

const newsItems = [
  {
    id: '1',
    title: 'AIDL 2026 - Symposium',
    date: 'March 6-7, 2026',
    description: 'Join us for the AIDL 2026 - Symposium on Accessible and Inclusive Digital Library. AIDL-2026 will provide a platform to discuss on the above themes along with related issues and challenges and probable solutions to overcome risks associated with the future of different types of libraries to make it inclusive for all communities.',
    bgColor: '#4e4ef9',
    textColor: '#070707',
    accentColor: '#4A4ED4',
    link: 'https://library.iith.ac.in/events/aidl2026/',
  },
  {
    id: '2',
    title: 'Book Exhibition - 2026',
    date: 'January 23-24, 2026',
    description: 'Explore a wide selection of academic, technical, and popular titles at the Book Exhibition — discover new releases, monographs, and course texts. Meet exhibiting publishers and vendors. Venue: KRC, IIT Hyderabad. Dates : January 23-24,2026.',
    bgColor: '#FF5B7F',
    textColor: '#FFFFFF',
    accentColor: '#E0486C',
    link: 'https://library.iith.ac.in/events/be2026/index.html',
  },
];

const FEATURED_SUBJECT_KEYS = ['literature-communication', 'philosophy-psychology'];
let savedActiveTab = 'home';

const searchTypes = [
  { value: 'title', label: 'Title', placeholder: 'books, journals, articles...' },
  { value: 'author', label: 'Author', placeholder: 'author name...' },
  { value: 'isbn', label: 'ISBN', placeholder: 'ISBN number...' },
  { value: 'bc', label: 'Accession No', placeholder: 'accession number...' },
];

const getSelectedType = (typeValue) => {
  return searchTypes.find(t => t.value === typeValue) || searchTypes[0];
};

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState(savedActiveTab);
  const { activeTheme, setActiveTheme, theme, currentLanguage, setLanguage: setGlobalLanguage, t } = useTheme();
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [searchType, setSearchType] = useState('title');
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [newArrivals, setNewArrivals] = useState([]);
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [facultyPublications, setFacultyPublications] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [catalogResults, setCatalogResults] = useState(null);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [catalogSearchError, setCatalogSearchError] = useState('');
  const [pagination, setPagination] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const [finishedBooksCount, setFinishedBooksCount] = useState(0);
  const [totalFines, setTotalFines] = useState(0);
  const [readNextBooks, setReadNextBooks] = useState([]);
  const [interestRecommendations, setInterestRecommendations] = useState([]);
  const [peerRecommendations, setPeerRecommendations] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardCategory, setLeaderboardCategory] = useState('ALL');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('month');
  const [eventsList, setEventsList] = useState(newsItems);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleLanguageChange = async (lang) => {
    if (typeof setGlobalLanguage === 'function') {
      await setGlobalLanguage(lang);
    }
  };

  useEffect(() => {
    savedActiveTab = activeTab;
    if (activeTab === 'home') {
      const activeToken = session?.token;
      if (activeToken) {
        loadFinishedBooksCount(activeToken);
        loadFines(activeToken);
      }
      loadInterestsShelf(activeToken);
    }
  }, [activeTab, session]);

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'home') {
        loadInterestsShelf(session?.token);
      }
    };
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('focus', handleFocus);
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [activeTab, session]);

  useEffect(() => {
    (async () => {
      const stored = await getSession();
      if (!stored?.token) {
        router.replace('/login');
        return;
      }

      // If stored session is expired or invalid, clear and redirect to login cleanly
      try {
        await getMe(stored.token);
      } catch (authErr) {
        if (authErr?.status === 401) {
          await clearSession();
          router.replace('/login');
          return;
        }
      }

      setSession(stored);
      
      const savedLang = await getSavedLanguage();
      if (savedLang && typeof setGlobalLanguage === 'function') {
        setGlobalLanguage(savedLang);
      }

      try {
        const [arrivals, trending, allSubjects, publications, readNext, interestsData, leaderboardData, liveEvents, notifs, myRecs] = await Promise.all([
          getRecentBooks(50),
          getMostBorrowedThisMonth(20),
          getSubjects(),
          getFacultyPublications(10),
          getReadNextRecommendations(stored.token).catch(() => []),
          getInterestRecommendations(stored.token).catch(() => []),
          getLeaderboard('ALL', 'month').catch(() => []),
          getEvents().catch(() => []),
          getNotifications(stored.token).catch(() => []),
          getRecommendations(stored.token).catch(() => []),
        ]);
        setNewArrivals(arrivals);
        setTrendingBooks(trending);
        setFacultyPublications(publications);
        setSubjectsList(allSubjects ?? []);
        setReadNextBooks(readNext || []);

        // Populate interest recommendations, falling back to user's saved interests if needed
        let interestBooks = Array.isArray(interestsData) ? interestsData : [];
        if (interestBooks.length > 0) {
          setInterestRecommendations(interestBooks);
        } else {
          loadInterestsShelf(stored?.token);
        }

        setLeaderboard(leaderboardData || []);
        setUnreadNotifsCount(Array.isArray(notifs) ? notifs.length : 0);

        // Filter out any peer recommendations that were previously dismissed
        const patronId = stored?.patron?.cardnumber || stored?.patron?.userid || 'me';
        const dismissedKey = `@dismissed_peer_recs_${patronId}`;
        const rawDismissed = await AsyncStorage.getItem(dismissedKey);
        const dismissedIds = rawDismissed ? JSON.parse(rawDismissed) : [];
        const activeRecs = (Array.isArray(myRecs) ? myRecs : []).filter((r) => !dismissedIds.includes(r.id));
        setPeerRecommendations(activeRecs);

        // Register push token for OS status bar notifications
        if (stored?.token) {
          registerForPushNotificationsAsync(stored.token).catch(() => {});
        }

        if (Array.isArray(liveEvents) && liveEvents.length > 0) {
          const formatted = liveEvents.map(e => ({
            id: String(e.id),
            title: e.title,
            date: e.event_date ? new Date(e.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + (e.event_time ? ' • ' + e.event_time : '') : 'Upcoming',
            description: e.description || '',
            link: e.cover_image_url || 'https://library.iith.ac.in',
            location: e.location || 'KRC IITH',
            type: e.event_type || 'other'
          }));
          setEventsList(formatted);
        }

        // Fetch User Reading Habits, Fines & check checkouts update notifications
        loadFinishedBooksCount(stored.token);
        loadFines(stored.token);
        checkCheckoutsDiff(stored.token);

        // Cache for offline mode
        const cachePayload = {
          arrivals,
          trending,
          publications,
          allSubjects,
          readNext,
          leaderboardData,
        };
        await AsyncStorage.setItem('krc_catalog_highlights_cache', JSON.stringify(cachePayload));
        setOfflineMode(false);
      } catch (err) {
        console.warn('Network request failed. Loading cached KRC data...', err.message);
        setOfflineMode(true);
        try {
          const cachedRaw = await AsyncStorage.getItem('krc_catalog_highlights_cache');
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            setNewArrivals(cached.arrivals || []);
            setTrendingBooks(cached.trending || []);
            setFacultyPublications(cached.publications || []);
            setSubjectsList(cached.allSubjects || []);
            setReadNextBooks(cached.readNext || []);
            setLeaderboard(cached.leaderboardData || []);
          }
        } catch {}
      }

      try {
        const rawHist = await AsyncStorage.getItem('krc_search_history_v1');
        setSearchHistory(rawHist ? JSON.parse(rawHist) : []);
      } catch { }
    })();
  }, []);

  const loadInterestsShelf = async (token) => {
    try {
      let books = [];
      if (token) {
        const recs = await getInterestRecommendations(token).catch(() => []);
        if (Array.isArray(recs) && recs.length > 0) {
          books = recs;
        }
      }

      // Fallback: If backend query was empty or offline, query OPAC with user's saved interests
      if (books.length === 0) {
        let userInterests = token ? await getInterests(token).catch(() => []) : [];
        if (!Array.isArray(userInterests) || userInterests.length === 0) {
          const rawLocal = await AsyncStorage.getItem('@user_interests');
          userInterests = rawLocal ? JSON.parse(rawLocal) : [];
        }

        if (Array.isArray(userInterests) && userInterests.length > 0) {
          for (const item of userInterests) {
            const rawName = item.subject_name || '';
            const queriesToTry = [
              rawName.split('&')[0].trim(),
              rawName.split('&')[1]?.trim(),
              rawName,
              item.ddc_code,
            ].filter(Boolean);

            for (const q of queriesToTry) {
              const res = await searchBooks(q, { limit: 15 }).catch(() => null);
              const found = Array.isArray(res?.books) ? res.books : [];
              if (found.length > 0) {
                books = found.map(b => ({
                  biblio_id: b.id || b.biblionumber,
                  title: b.title,
                  author: b.author || b.creator || ''
                }));
                break;
              }
            }
            if (books.length > 0) break;
          }
        }
      }

      if (books.length > 0) {
        setInterestRecommendations(books);
      }
    } catch (err) {
      console.warn('Failed to load interests shelf:', err.message);
    }
  };

  const loadFinishedBooksCount = async (token) => {
    try {
      const habits = await getReadingHabits(token);
      if (Array.isArray(habits)) {
        setFinishedBooksCount(habits.filter(h => h.status === 'finished').length);
      }
    } catch {}
  };

  const loadFines = async (token) => {
    try {
      const lines = await getAccountLines(token);
      if (Array.isArray(lines)) {
        const fines = lines.reduce(
          (sum, line) => sum + Number(line.amount_outstanding ?? line.amountoutstanding ?? 0),
          0
        );
        setTotalFines(fines);
      }
    } catch {}
  };

  const checkCheckoutsDiff = async (token) => {
    if (!token) return;
    try {
      const { getCheckouts } = require('../../services/kohaApi');
      const currentList = await getCheckouts(token);
      if (!Array.isArray(currentList)) return;

      const cachedRaw = await AsyncStorage.getItem('krc_active_checkouts_cache');
      const cachedList = cachedRaw ? JSON.parse(cachedRaw) : null;

      if (cachedList !== null) {
        const currentIds = currentList.map(item => String(item.checkout_id ?? item.issue_id ?? item.barcode));
        const cachedIds = cachedList.map(item => String(item.checkout_id ?? item.issue_id ?? item.barcode));

        const newlyCheckedOut = currentList.filter(
          item => !cachedIds.includes(String(item.checkout_id ?? item.issue_id ?? item.barcode))
        );

        const newlyCheckedIn = cachedList.filter(
          item => !currentIds.includes(String(item.checkout_id ?? item.issue_id ?? item.barcode))
        );

        newlyCheckedOut.forEach(book => {
          sendInstantNotification(
            "Book Checked Out",
            `You have successfully borrowed "${book.title || 'Unknown Title'}". Due date: ${book.date_due ? new Date(book.date_due).toLocaleDateString() : 'N/A'}`
          );
        });

        newlyCheckedIn.forEach(book => {
          sendInstantNotification(
            "Book Returned (Checked In)",
            `"${book.title || 'Unknown Title'}" has been checked back in. Thank you!`
          );
        });
      }

      await AsyncStorage.setItem('krc_active_checkouts_cache', JSON.stringify(currentList));
    } catch (err) {
      console.warn("Could not diff checkouts:", err);
    }
  };

  const styles = createStyles(theme, activeTheme, insets);

  const handleLogout = async () => {
    setIsSettingsVisible(false);
    if (session?.token) await logout(session.token);
    await clearSession();
    router.replace('/login');
  };

  const handleCatalogSearch = async (query, type = searchType, offset = 0) => {
    setIsSearchingCatalog(true);
    setCatalogSearchError('');
    try {
      const limit = 20;
      const data = await searchBooks(query, { type, limit, offset });
      const results = data.books ?? [];
      setCatalogResults(results);

      const total = data.total ?? results.length;
      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit) || 1;

      setPagination({
        offset,
        limit,
        total,
        currentPage,
        totalPages,
        hasMore: offset + limit < total,
        canGoBack: offset > 0,
      });
    } catch (err) {
      setCatalogSearchError(err.message || 'Catalog search failed.');
      setCatalogResults([]);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCatalogResults(null);
    setCatalogSearchError('');
    setPagination({});
  };

  const openBookDetail = (biblioId) => {
    router.push({ pathname: '/book-detail', params: { biblioId } });
  };

  const handleSearchSubmit = () => {
    const query = searchQuery.trim();
    if (!query) {
      alert('Please enter a search query.');
      return;
    }
    saveSearchToHistory(query);
    handleCatalogSearch(query, searchType, 0);
  };

  const saveSearchToHistory = async (query) => {
    try {
      let historyList = [...searchHistory];
      historyList = historyList.filter((item) => item !== query);
      historyList.unshift(query);
      if (historyList.length > 5) {
        historyList.pop();
      }
      setSearchHistory(historyList);
      await AsyncStorage.setItem('krc_search_history_v1', JSON.stringify(historyList));
    } catch { }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem('krc_search_history_v1');
    } catch { }
  };

  const getHeaderTitle = () => {
    const t = translations[currentLanguage] || translations.en;
    switch (activeTab) {
      case 'menu': return t.quickAccess;
      case 'search': return t.searchHeading;
      case 'events': return t.events;
      case 'account': return t.account;
      default: return '';
    }
  };

  const handleMenuPress = (path) => {
    router.push(path);
  };

  const renderCard = (item, isHorizontal = false) => (
    <View
      key={item.id}
      style={isHorizontal ? styles.horizontalEventCard : styles.eventVerticalCard}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.cardDateRow}>
          <MaterialIcons name="date-range" size={12} color={theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>
      </View>
      <Text
        style={styles.cardDescription}
        numberOfLines={isHorizontal ? 2 : undefined}
      >
        {item.description}
      </Text>
      <TouchableOpacity
        style={styles.learnMoreBtn}
        onPress={() => router.push({ pathname: '/web-view', params: { url: item.link || 'https://iith.ac.in', title: item.title } })}
      >
        <Text style={styles.learnMoreBtnText}>Learn More</Text>
      </TouchableOpacity>
    </View>
  );

  const extraHomeHeader = (
    <View>
      {/* Fine Accumulation Warnings */}
      {totalFines > 0 && (
        <View style={[styles.warningBanner, { backgroundColor: '#FEE2E2', padding: 12, marginHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#EF4444', marginBottom: 12 }]}>
          <MaterialIcons name="warning" size={20} color="#B91C1C" />
          <Text style={{ color: '#B91C1C', fontWeight: 'bold', fontSize: 13, flex: 1 }}>
            Outstanding Fine: ₹{totalFines}. Please clear it at the desk.
          </Text>
        </View>
      )}

      {/* Yearly Goals Card */}
      <YearlyGoalsCard finishedCount={finishedBooksCount} theme={theme} />
    </View>
  );

  const handleLeaderboardCategoryChange = async (cat) => {
    setLeaderboardCategory(cat);
    try {
      const data = await getLeaderboard(cat, leaderboardPeriod);
      setLeaderboard(data || []);
    } catch {}
  };

  const handleLeaderboardPeriodChange = async (period) => {
    setLeaderboardPeriod(period);
    try {
      const data = await getLeaderboard(leaderboardCategory, period);
      setLeaderboard(data || []);
    } catch {}
  };

  const handleDismissRecommendation = async (recId) => {
    try {
      const stored = await getSession();
      const patronId = stored?.patron?.cardnumber || stored?.patron?.userid || 'me';
      const key = `@dismissed_peer_recs_${patronId}`;
      const raw = await AsyncStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(recId)) {
        list.push(recId);
        await AsyncStorage.setItem(key, JSON.stringify(list));
      }
      setPeerRecommendations((prev) => prev.filter((r) => r.id !== recId));
    } catch (e) {
      console.warn('Failed to dismiss recommendation:', e.message);
      setPeerRecommendations((prev) => prev.filter((r) => r.id !== recId));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundStyle} />

      {offlineMode && (
        <View style={{ backgroundColor: '#EF4444', paddingVertical: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, zIndex: 999 }}>
          <MaterialIcons name="cloud-off" size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>Offline Mode - Viewing Cached Library Data</Text>
        </View>
      )}

      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          {activeTab === 'home' ? (
            <View style={styles.headerHomeLeft}>
              <Image
                source={require('../../assets/images/download.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => setActiveTab('home')} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          )}

          {activeTab !== 'home' && (
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          )}

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
              <MaterialIcons name="notifications-none" size={28} color={theme.text} />
              {unreadNotifsCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    backgroundColor: '#EF4444',
                    borderRadius: 9,
                    minWidth: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSettingsVisible(true)}>
              <MaterialIcons name="settings" size={26} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Settings Modal */}
      <SettingsModal
        isSettingsVisible={isSettingsVisible}
        setIsSettingsVisible={setIsSettingsVisible}
        activeTheme={activeTheme}
        setActiveTheme={setActiveTheme}
        currentLanguage={currentLanguage}
        setCurrentLanguage={handleLanguageChange}
        handleLogout={handleLogout}
        theme={theme}
        styles={styles}
      />

      {/* Search Type Picker Modal */}
      <SearchTypeModal
        isTypeModalVisible={isTypeModalVisible}
        setIsTypeModalVisible={setIsTypeModalVisible}
        searchTypes={searchTypes}
        searchType={searchType}
        setSearchType={setSearchType}
        theme={theme}
        styles={styles}
      />

      <View style={styles.contentContainer}>
        {activeTab === 'home' && (
          <HomeTab
            currentLanguage={currentLanguage}
            newArrivals={newArrivals}
            trendingBooks={trendingBooks}
            subjectsList={subjectsList}
            facultyPublications={facultyPublications}
            readNextBooks={readNextBooks}
            interestRecommendations={interestRecommendations}
            peerRecommendations={peerRecommendations}
            onDismissRecommendation={handleDismissRecommendation}
            leaderboard={leaderboard}
            leaderboardCategory={leaderboardCategory}
            setLeaderboardCategory={handleLeaderboardCategoryChange}
            leaderboardPeriod={leaderboardPeriod}
            setLeaderboardPeriod={handleLeaderboardPeriodChange}
            theme={theme}
            styles={styles}
            openBookDetail={openBookDetail}
            extraHeaderComponent={extraHomeHeader}
          />
        )}
        {activeTab === 'menu' && (
          <MenuTab
            currentLanguage={currentLanguage}
            theme={theme}
            styles={styles}
            handleMenuPress={handleMenuPress}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab
            theme={theme}
            styles={styles}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchType={searchType}
            setIsTypeModalVisible={setIsTypeModalVisible}
            getSelectedType={getSelectedType}
            handleClearSearch={handleClearSearch}
            handleSearchSubmit={handleSearchSubmit}
            isSearchingCatalog={isSearchingCatalog}
            catalogSearchError={catalogSearchError}
            catalogResults={catalogResults}
            pagination={pagination}
            openBookDetail={openBookDetail}
            handleCatalogSearch={handleCatalogSearch}
            searchHistory={searchHistory}
            clearSearchHistory={clearSearchHistory}
          />
        )}
        {activeTab === 'events' && (
          <EventsTab currentLanguage={currentLanguage}
            styles={styles}
            events={eventsList}
            theme={theme}
            renderCard={renderCard}
          />
        )}
        {activeTab === 'account' && <ProfileScreen session={session} currentLanguage={currentLanguage} />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'home' && styles.activeTabButton]}
          onPress={() => setActiveTab('home')}
        >
          <MaterialIcons
            name="home"
            size={24}
            color={activeTab === 'home' ? theme.accent : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}>{t.home}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'menu' && styles.activeTabButton]}
          onPress={() => setActiveTab('menu')}
        >
          <MaterialIcons
            name="grid-view"
            size={24}
            color={activeTab === 'menu' ? theme.accent : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'menu' && styles.activeTabLabel]}>{t.menu}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'search' && styles.activeTabButton]}
          onPress={() => setActiveTab('search')}
        >
          <MaterialIcons
            name="search"
            size={24}
            color={activeTab === 'search' ? theme.accent : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'search' && styles.activeTabLabel]}>{t.search}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'events' && styles.activeTabButton]}
          onPress={() => setActiveTab('events')}
        >
          <MaterialIcons
            name="event"
            size={24}
            color={activeTab === 'events' ? theme.accent : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'events' && styles.activeTabLabel]}>{t.events}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'account' && styles.activeTabButton]}
          onPress={() => setActiveTab('account')}
        >
          <MaterialIcons
            name="person"
            size={24}
            color={activeTab === 'account' ? theme.accent : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'account' && styles.activeTabLabel]}>{t.account}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme, activeTheme, insets) => {
  const isDark = activeTheme === 'dark';
  const tabHeight = 60 + (insets?.bottom || 0);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.primary
    },
    backgroundStyle: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.primary
    },
    headerSafeArea: {
      backgroundColor: theme.primary,
      paddingTop: insets?.top || 0,
      zIndex: 10,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: activeTheme === 'dark' ? 0.4 : 0.08,
      shadowRadius: 8,
      elevation: 6,
      borderBottomWidth: 1,
      borderBottomColor: activeTheme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.05)',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 60,
    },
    headerHomeLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    headerLeft: {
      width: 80,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    iconButton: {
      padding: 8
    },
    logo: {
      width: 100,
      height: 40
    },
    contentContainer: {
      flex: 1,
      marginBottom: tabHeight,
    },
    scrollContent: {
      paddingTop: 20
    },
    searchContainer: {
      backgroundColor: theme.backgroundElement,
      marginHorizontal: 20,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
      marginBottom: 20,
    },
    searchInner: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    searchText: {
      color: theme.textSecondary,
      fontSize: 16
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      borderRadius: 16,
      paddingLeft: 8,
      paddingRight: 10,
      height: 56,
      marginBottom: 24,
    },
    searchBarInput: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      height: '100%',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: 25,
      marginBottom: 15
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text
    },
    moreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    moreText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.accent,
    },

    // Custom Card Styling matching user upload
    horizontalEventCard: {
      width: CARD_WIDTH,
      height: 180,
      marginRight: CARD_MARGIN,
      borderRadius: 16,
      padding: 15,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      backgroundColor: theme.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    eventVerticalCard: {
      backgroundColor: theme.background,
      borderRadius: 16,
      padding: 15,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      marginBottom: 20,
      justifyContent: 'space-between',
      minHeight: 180,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    cardHeader: {
      marginBottom: 6,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    cardDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardDate: {
      color: theme.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    cardDescription: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 10,
    },
    learnMoreBtn: {
      backgroundColor: theme.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: 'flex-start',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    learnMoreBtnText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },

    // Ebooks & Audiobooks styling
    horizontalScroll: {
      paddingHorizontal: 16
    },
    subjectsScroll: {
      paddingHorizontal: 20,
      paddingBottom: 10,
      gap: 12,
    },
    subjectBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundElement,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      gap: 8,
    },
    subjectBadgeIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: activeTheme === 'dark' ? 'rgba(56,189,248,0.1)' : 'rgba(32,138,239,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subjectBadgeText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.text,
    },
    bookCard: {
      width: 130,
      marginRight: 16,
      borderRadius: 16,
      backgroundColor: 'rgba(30, 41, 59, 0.3)',
      padding: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.03)',
    },
    bookCover: {
      width: '100%',
      height: 160,
      borderRadius: 12,
      marginBottom: 8
    },
    emptyShelfText: {
      color: theme.textSecondary,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    bookTitle: {
      fontWeight: 'bold',
      fontSize: 13,
      color: theme.text,
      marginBottom: 4,
      height: 36,
      lineHeight: 18,
    },
    bookAuthor: {
      color: theme.textSecondary,
      fontStyle: 'italic',
      fontSize: 11
    },

    // Featured Collections Grid
    featuredCollectionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      gap: 16,
    },
    featuredCard: {
      flex: 1,
      backgroundColor: theme.backgroundElement,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    featuredCardTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    featuredGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 120,
      height: 180,
      justifyContent: 'space-between',
      alignContent: 'space-between',
    },
    featuredGridImage: {
      width: 56,
      height: 84,
      borderRadius: 4,
    },

    // Faculty Publications Styling
    publicationCard: {
      width: 260,
      backgroundColor: theme.backgroundElement,
      borderRadius: 18,
      padding: 16,
      marginRight: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
      justifyContent: 'space-between',
    },
    pubBadgeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    pubYearBadge: {
      backgroundColor: activeTheme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(32, 138, 239, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    pubYearText: {
      color: theme.accent,
      fontSize: 11,
      fontWeight: 'bold',
    },
    pubTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      lineHeight: 19,
      marginBottom: 8,
    },
    pubAuthors: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
      marginBottom: 4,
    },
    pubJournal: {
      fontSize: 11,
      color: theme.accent,
      fontStyle: 'italic',
    },

    // Socials Styling
    socialsContainer: {
      alignItems: 'center',
      marginTop: 35,
      paddingHorizontal: 20,
    },
    socialsTitle: {
      fontSize: 16,
      color: theme.textSecondary,
      fontWeight: '600',
      marginBottom: 15,
    },
    socialsRow: {
      flexDirection: 'row',
      gap: 16,
    },
    socialButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
    },



    // Generic tab contents
    tabContentContainer: {
      padding: 24,
      paddingTop: 20,
    },
    tabHeading: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 6,
    },
    tabSubheading: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 25,
    },

    // Menu Grid Layout
    menuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    menuCard: {
      width: '47.5%',
      backgroundColor: theme.backgroundElement,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
      minHeight: 180,
      marginBottom: 16,
    },
    menuIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: 'rgba(32, 138, 239, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    menuCardTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 6,
    },
    menuCardDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    campusBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginTop: 2,
      marginBottom: 6,
    },
    campusBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#EF4444',
    },

    catalogResultsContainer: {
      marginBottom: 24,
    },
    catalogResultsError: {
      color: '#f87171',
      textAlign: 'center',
      paddingVertical: 12,
    },
    catalogResultsEmpty: {
      color: theme.textSecondary,
      textAlign: 'center',
      paddingVertical: 12,
    },
    catalogResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundElement,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    catalogResultCover: {
      width: 44,
      height: 64,
      borderRadius: 6,
      backgroundColor: theme.backgroundSelected,
      marginRight: 12,
    },
    catalogResultAvailability: {
      fontSize: 11,
      color: theme.accent,
      marginTop: 2,
      fontWeight: '600',
    },
    catalogResultTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
    },
    catalogResultAuthor: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    resultsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      marginTop: 4,
    },
    resultsHeaderTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },
    clearResultsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(32, 138, 239, 0.1)',
    },
    clearResultsText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.accent,
      marginLeft: 2,
    },
    paginationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
    },
    paginationButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: theme.accent,
    },
    paginationButtonDisabled: {
      backgroundColor: theme.backgroundSelected,
      opacity: 0.5,
    },
    paginationButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 13,
    },
    paginationButtonTextDisabled: {
      color: theme.textSecondary,
    },
    paginationLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },

    // Search Tab Cards
    searchPageCard: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    searchPageIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(32, 138, 239, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    searchPageCardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    searchPageCardDesc: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
    },
    searchPageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      paddingVertical: 14,
      borderRadius: 12,
    },
    searchPageButtonText: {
      color: theme.primary,
      fontWeight: 'bold',
      fontSize: 14,
    },
    searchGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    searchGridCard: {
      width: '47.5%',
      backgroundColor: theme.backgroundElement,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
      minHeight: 160,
      marginBottom: 16,
    },
    searchGridIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(32, 138, 239, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    searchGridCardTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    searchGridCardDesc: {
      fontSize: 11,
      color: theme.textSecondary,
      lineHeight: 15,
    },

    // Events List Tab
    eventsList: {
      gap: 20,
    },

    // Bottom Navigation Bar
    bottomTabBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: tabHeight,
      backgroundColor: '#0B0F19',
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
      paddingBottom: insets?.bottom || 0,
      paddingTop: 8,
      justifyContent: 'space-around',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: 52,
      marginHorizontal: 4,
      borderRadius: 12,
    },
    activeTabButton: {
      backgroundColor: theme.backgroundSelected,
    },
    tabLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '500',
      marginTop: 4,
    },
    activeTabLabel: {
      color: theme.accent,
      fontWeight: 'bold',
    },
    headerRight: {
      width: 80,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    settingsModalContent: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.backgroundElement,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
      paddingBottom: 12,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    settingsSectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
    },
    themeOptionsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    themeOptionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      borderRadius: 16,
      paddingVertical: 14,
    },
    themeOptionActive: {
      backgroundColor: theme.backgroundSelected,
      borderColor: theme.accent,
    },
    themeOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    themeOptionTextActive: {
      color: theme.text,
    },
    logoutOptionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
      borderRadius: 16,
      paddingVertical: 14,
      marginTop: 8,
    },
    logoutOptionText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#EF4444',
    },
    searchSourceSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      height: '100%',
      justifyContent: 'center',
    },
    searchSourceText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.accent,
      marginRight: 2,
    },
    searchSeparator: {
      width: 1,
      height: 24,
      backgroundColor: theme.backgroundSelected,
      marginHorizontal: 8,
    },
    searchSubmitButton: {
      backgroundColor: theme.accent,
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sourceModalContent: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.backgroundElement,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 10,
    },
    sourceOptionsList: {
      gap: 12,
      marginTop: 8,
    },
    sourceOptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      borderRadius: 16,
      padding: 12,
    },
    sourceOptionItemActive: {
      backgroundColor: theme.backgroundSelected,
      borderColor: theme.accent,
    },
    sourceIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(32, 138, 239, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sourceIconBoxActive: {
      backgroundColor: theme.accent,
    },
    sourceItemName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
    },
    sourceItemNameActive: {
      color: theme.accent,
    },
    sourceItemDesc: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
      lineHeight: 14,
    },
    historySectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
    },
    historyItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    trendsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    trendTag: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    trendTagText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
    },
  });
}
