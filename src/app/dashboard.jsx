import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
// No WebBrowser import needed
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import ProfileScreen from './profile'; // Import ProfileScreen to embed in Account tab

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = Math.min(screenWidth - 80, 300);
const CARD_MARGIN = 15;

// Updated Mock data based on the user's provided images
const newsItems = [
  {
    id: '1',
    title: 'AIDL 2026 - Symposium',
    date: 'March 6-7, 2026',
    description: 'Join us for the AIDL 2026 - Symposium on Accessible and Inclusive Digital Library. AIDL-2026 will provide a platform to discuss on the above themes along with related issues and challenges and probable solutions to overcome risks associated with the future of different types of libraries to make it inclusive for all communities.',
    bgColor: '#4e4ef9', // Styled purple-blue gradient representation
    textColor: '#070707',
    accentColor: '#4A4ED4',
    link: 'https://library.iith.ac.in/events/aidl2026/',
  },
  {
    id: '2',
    title: 'Book Exhibition - 2026',
    date: 'January 23-24, 2026',
    description: 'Explore a wide selection of academic, technical, and popular titles at the Book Exhibition — discover new releases, monographs, and course texts. Meet exhibiting publishers and vendors. Venue: KRC, IIT Hyderabad. Dates : January 23-24,2026.',
    bgColor: '#FF5B7F', // Styled pink-red gradient representation
    textColor: '#FFFFFF',
    accentColor: '#E0486C',
    link: 'https://library.iith.ac.in/events/be2026/index.html',
  },
];

const digitalBooks = [
  {
    id: '1',
    title: 'I like the sun',
    author: 'Nelson, Sarah,',
    image: 'https://picsum.photos/seed/qebook1/120/180',
  },
  {
    id: '2',
    title: 'كل المسوفين يكذبون ( سيرة قصصية )',
    author: 'جولادين، سيت',
    image: 'https://picsum.photos/seed/qebook2/120/180',
  },
  {
    id: '3',
    title: 'Earth song',
    author: 'Reed, Susan,',
    image: 'https://picsum.photos/seed/qebook3/120/180',
  },
  {
    id: '4',
    title: 'Changing Affinities',
    author: 'Sarma, Abhishruti',
    image: 'https://picsum.photos/seed/qebook4/120/180',
  },
];

const bestBooks = [
  {
    id: '1',
    title: 'Hair dos and hair don\'ts',
    author: 'O\'Connor, Jane.',
    image: 'https://picsum.photos/seed/qaudio1/120/180',
  },
  {
    id: '2',
    title: 'His dark materials',
    author: 'Pullman, Philip,',
    image: 'https://picsum.photos/seed/qaudio2/120/180',
  },
  {
    id: '3',
    title: 'The republic',
    author: 'Plato,',
    image: 'https://picsum.photos/seed/qaudio3/120/180',
  },
  {
    id: '4',
    title: 'Design your thinking',
    author: 'Soni, Pavan',
    image: 'https://picsum.photos/seed/qaudio4/120/180',
  },
];

const historicalFictionImages = [
  'https://picsum.photos/seed/hist1/60/90',
  'https://picsum.photos/seed/hist2/60/90',
  'https://picsum.photos/seed/hist3/60/90',
  'https://picsum.photos/seed/hist4/60/90',
];

const mentalHealthImages = [
  'https://picsum.photos/seed/ment1/60/90',
  'https://picsum.photos/seed/ment2/60/90',
  'https://picsum.photos/seed/ment3/60/90',
  'https://picsum.photos/seed/ment4/60/90',
];

// Events use the same updated data
const events = [...newsItems];

// Store the active tab state in module scope so that it persists when navigating to other screens and back
let savedActiveTab = 'home';

const sourceOptions = [
  { id: 'all', name: 'All', icon: 'travel-explore', description: 'Search across all digital and physical catalogs.', placeholder: 'all library resources' },
  { id: 'opac', name: 'OPAC', icon: 'menu-book', description: 'Search Koha catalog for physical books and journals.', placeholder: 'physical library catalog' },
  { id: 'doi', name: 'DOI', icon: 'science', description: 'Resolve research papers and metadata by DOI code.', placeholder: 'by DOI (e.g. 10.1038/...)' },
  { id: 'repository', name: 'Repository', icon: 'dns', description: 'Search institutional publications and thesis.', placeholder: 'institutional repository' },
  { id: 'eresources', name: 'E-Resources', icon: 'auto-stories', description: 'Search Summon databases and e-journals.', placeholder: 'databases & e-journals' },
  { id: 'news', name: 'News', icon: 'newspaper', description: 'Search daily newspapers and periodicals.', placeholder: 'magazines & newspapers' },
];

const getSelectedSourceName = (sourceId) => {
  const option = sourceOptions.find(opt => opt.id === sourceId);
  return option ? option.name : 'All';
};

const getSelectedSourcePlaceholder = (sourceId) => {
  const option = sourceOptions.find(opt => opt.id === sourceId);
  return option ? option.placeholder : 'all resources';
};

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState(savedActiveTab);

  useEffect(() => {
    savedActiveTab = activeTab;
  }, [activeTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const { activeTheme, setActiveTheme, theme } = useTheme();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [searchSource, setSearchSource] = useState('all');
  const [isSourceModalVisible, setIsSourceModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const styles = createStyles(theme, insets);

  const handleLogout = () => {
    setIsSettingsVisible(false);
    router.replace('/login');
  };

  const handleSearchSubmit = () => {
    const query = searchQuery.trim();
    if (!query) {
      alert('Please enter a search query.');
      return;
    }
    
    switch (searchSource) {
      case 'opac':
        router.push({ 
          pathname: '/web-view', 
          params: { 
            url: `https://opac.krc.iith.ac.in/cgi-bin/koha/opac-search.pl?q=${encodeURIComponent(query)}`, 
            title: 'OPAC Catalog Search' 
          } 
        });
        break;
      case 'doi':
        router.push({ 
          pathname: '/doi-search', 
          params: { query: query } 
        });
        break;
      case 'repository':
        router.push({ 
          pathname: '/web-view', 
          params: { 
            url: `https://raiith.krc.iith.ac.in/discover?query=${encodeURIComponent(query)}`, 
            title: 'Repository Search' 
          } 
        });
        break;
      case 'eresources':
        router.push({ 
          pathname: '/web-view', 
          params: { 
            url: `https://iith.summon.serialssolutions.com/?#!/search?pn=1&ho=t&include.ft.matches=t&l=en&q=${encodeURIComponent(query)}`, 
            title: 'E-Resources Search' 
          } 
        });
        break;
      case 'news':
        router.push({ 
          pathname: '/web-view', 
          params: { 
            url: `https://www.edzter.com/login/email`,
            title: 'Edzter News & Magazines' 
          } 
        });
        break;
      case 'all':
      default:
        router.push({ 
          pathname: '/web-view', 
          params: { 
            url: `https://opac.krc.iith.ac.in/cgi-bin/koha/opac-search.pl?q=${encodeURIComponent(query)}`, 
            title: 'Catalog Search' 
          } 
        });
        break;
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'menu': return 'Library Menu';
      case 'search': return 'Search Catalog';
      case 'events': return 'Library Events';
      case 'account': return 'My Account';
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

  // 1. HOME TAB VIEW
  const renderHomeTab = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>

      {/* New Arrivals */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>New Arrivals</Text>
        <TouchableOpacity style={styles.moreButton} onPress={() => setActiveTab('search')}>
          <Text style={styles.moreText}>More</Text>
          <MaterialIcons name="arrow-forward" size={16} color={theme.accent} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {digitalBooks.map((item) => (
          <View key={item.id} style={styles.bookCard}>
            <Image source={{ uri: item.image }} style={styles.bookCover} />
            <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Best Books of the Week */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Best Books of the Week</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreText}>More</Text>
          <MaterialIcons name="arrow-forward" size={16} color={theme.accent} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {bestBooks.map((item) => (
          <View key={item.id} style={styles.bookCard}>
            <Image source={{ uri: item.image }} style={styles.bookCover} />
            <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Featured Collections */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Collections</Text>
      </View>
      <View style={styles.featuredCollectionsRow}>
        <View style={styles.featuredCard}>
          <Text style={styles.featuredCardTitle}>Historical Fiction</Text>
          <View style={styles.featuredGrid}>
            {historicalFictionImages.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.featuredGridImage} />
            ))}
          </View>
        </View>
        <View style={styles.featuredCard}>
          <Text style={styles.featuredCardTitle}>Mental Health</Text>
          <View style={styles.featuredGrid}>
            {mentalHealthImages.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.featuredGridImage} />
            ))}
          </View>
        </View>
      </View>

      {/* Events */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Events</Text>
        <TouchableOpacity style={styles.moreButton} onPress={() => setActiveTab('events')}>
          <Text style={styles.moreText}>More</Text>
          <MaterialIcons name="arrow-forward" size={16} color={theme.accent} />
        </TouchableOpacity>
      </View>
      <ScrollView 
        horizontal 
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.horizontalScroll}
      >
        {events.map((item) => renderCard(item, true))}
      </ScrollView>

      {/* Social Media Row */}
      <View style={styles.socialsContainer}>
        <Text style={styles.socialsTitle}>Follow us on</Text>
        <View style={styles.socialsRow}>
          <TouchableOpacity style={styles.socialButton} onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://youtube.com', title: 'YouTube' } })}>
            <FontAwesome name="youtube-play" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://twitter.com', title: 'Twitter' } })}>
            <FontAwesome name="twitter" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://instagram.com', title: 'Instagram' } })}>
            <FontAwesome name="instagram" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://facebook.com', title: 'Facebook' } })}>
            <FontAwesome name="facebook" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>



      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // 2. MENU TAB VIEW
  const renderMenuTab = () => (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.tabHeading}>Library Services & Access</Text>
      <Text style={styles.tabSubheading}>Quick access to essential library operations and support systems.</Text>
      
      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuCard} onPress={() => handleMenuPress('/library-hours')}>
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="access-time" size={32} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>Library Hours</Text>
          <Text style={styles.menuCardDesc}>View current KRC opening hours & session timings.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => handleMenuPress('/library-services')}>
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="menu-book" size={32} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>Library Services</Text>
          <Text style={styles.menuCardDesc}>Similarity checks, delivery services, and discussion rooms.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => handleMenuPress('/off-campus-access')}>
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="vpn-lock" size={32} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>Off-Campus Access</Text>
          <Text style={styles.menuCardDesc}>Access database and digital journals from home securely.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => handleMenuPress('/institutional-resources')}>
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="dns" size={32} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>Institutional Resources</Text>
          <Text style={styles.menuCardDesc}>Browse local repositories, publications, and papers.</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // 3. SEARCH TAB VIEW
  const renderSearchTab = () => (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.tabHeading}>Search Catalog</Text>
      <Text style={styles.tabSubheading}>Find physical books, journals, e-resources, or search research papers.</Text>
      
      {/* Search Input Bar with integrated options */}
      <View style={styles.searchBarContainer}>
        <TouchableOpacity 
          style={styles.searchSourceSelector}
          onPress={() => setIsSourceModalVisible(true)}
        >
          <Text style={styles.searchSourceText}>{getSelectedSourceName(searchSource)}</Text>
          <MaterialIcons name="arrow-drop-down" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={styles.searchSeparator} />
        
        <TextInput
          style={styles.searchBarInput}
          placeholder={`Search ${getSelectedSourcePlaceholder(searchSource)}...`}
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4, marginRight: 4 }}>
            <MaterialIcons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchSubmitButton}>
          <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 1. OPAC Search (Hero Card) */}
      <View style={styles.searchPageCard}>
        <View style={styles.searchPageIconWrap}>
          <MaterialIcons name="menu-book" size={40} color={theme.accent} />
        </View>
        <Text style={styles.searchPageCardTitle}>OPAC Catalog Search</Text>
        <Text style={styles.searchPageCardDesc}>
          Search the physical library catalog for books, printed journals, dissertations, and check real-time shelf availability.
        </Text>
        <TouchableOpacity 
          style={[styles.searchPageButton, { backgroundColor: theme.accent }]} 
          onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://opac.krc.iith.ac.in/', title: 'OPAC Catalog' } })}
        >
          <MaterialIcons name="search" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={[styles.searchPageButtonText, { color: '#FFFFFF' }]}>OPEN OPAC CATALOG</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Grid of other searches */}
      <View style={styles.searchGrid}>
        
        {/* DOI Search */}
        <TouchableOpacity style={styles.searchGridCard} onPress={() => handleMenuPress('/doi-search')}>
          <View style={styles.searchGridIconWrap}>
            <MaterialIcons name="science" size={24} color={theme.accent} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.searchGridCardTitle}>DOI Search</Text>
            <Text style={styles.searchGridCardDesc} numberOfLines={2}>Resolve journals & academic papers.</Text>
          </View>
        </TouchableOpacity>

        {/* Institutional Repository Search */}
        <TouchableOpacity style={styles.searchGridCard} onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://raiith.krc.iith.ac.in/home?tl.page=1', title: 'Institutional Repository' } })}>
          <View style={styles.searchGridIconWrap}>
            <MaterialIcons name="dns" size={24} color={theme.accent} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.searchGridCardTitle}>Inst. Repository</Text>
            <Text style={styles.searchGridCardDesc} numberOfLines={2}>Faculty & student publications.</Text>
          </View>
        </TouchableOpacity>
 
        {/* E-Resources Search */}
        <TouchableOpacity style={styles.searchGridCard} onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://iith.summon.serialssolutions.com/?#!/search?pn=1&ho=t&include.ft.matches=t&l=en', title: 'E-Resources' } })}>
          <View style={styles.searchGridIconWrap}>
            <MaterialIcons name="auto-stories" size={24} color={theme.accent} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.searchGridCardTitle}>E-Resources</Text>
            <Text style={styles.searchGridCardDesc} numberOfLines={2}>Search journals, databases & articles.</Text>
          </View>
        </TouchableOpacity>
 
        {/* Newspapers and Magazines Search */}
        <TouchableOpacity style={styles.searchGridCard} onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://www.edzter.com/login/email', title: 'Edzter News & Magazines' } })}>
          <View style={styles.searchGridIconWrap}>
            <MaterialIcons name="newspaper" size={24} color={theme.accent} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.searchGridCardTitle}>News & Magazines</Text>
            <Text style={styles.searchGridCardDesc} numberOfLines={2}>Read daily newspapers & periodicals.</Text>
          </View>
        </TouchableOpacity>

      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // 4. EVENTS TAB VIEW
  const renderEventsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.tabHeading}>Library Events</Text>
      <Text style={styles.tabSubheading}>Stay updated with webinars, book fairs, and academic workshops at the library.</Text>
      
      <View style={styles.eventsList}>
        {events.map((item) => renderCard(item, false))}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundStyle} />
      
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {activeTab !== 'home' && (
              <TouchableOpacity onPress={() => setActiveTab('home')} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>
          {activeTab === 'home' ? (
            <Image 
              source={require('../../assets/images/download.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
          ) : (
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          )}
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="notifications-none" size={28} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSettingsVisible(true)}>
              <MaterialIcons name="settings" size={26} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Settings Modal */}
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

      {/* Search Source Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isSourceModalVisible}
        onRequestClose={() => setIsSourceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sourceModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Resource</Text>
              <TouchableOpacity onPress={() => setIsSourceModalVisible(false)} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sourceOptionsList}>
              {sourceOptions.map((opt) => (
                <TouchableOpacity 
                  key={opt.id} 
                  style={[
                    styles.sourceOptionItem, 
                    searchSource === opt.id && styles.sourceOptionItemActive
                  ]} 
                  onPress={() => {
                    setSearchSource(opt.id);
                    setIsSourceModalVisible(false);
                  }}
                >
                  <View style={[
                    styles.sourceIconBox,
                    searchSource === opt.id && styles.sourceIconBoxActive
                  ]}>
                    <MaterialIcons 
                      name={opt.icon} 
                      size={20} 
                      color={searchSource === opt.id ? '#FFFFFF' : theme.textSecondary} 
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[
                      styles.sourceItemName,
                      searchSource === opt.id && styles.sourceItemNameActive
                    ]}>{opt.name} Search</Text>
                    <Text style={styles.sourceItemDesc}>{opt.description}</Text>
                  </View>
                  {searchSource === opt.id && (
                    <MaterialIcons name="check" size={20} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.contentContainer}>
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'menu' && renderMenuTab()}
        {activeTab === 'search' && renderSearchTab()}
        {activeTab === 'events' && renderEventsTab()}
        {activeTab === 'account' && <ProfileScreen />}
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
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}>Home</Text>
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
          <Text style={[styles.tabLabel, activeTab === 'menu' && styles.activeTabLabel]}>Menu</Text>
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
          <Text style={[styles.tabLabel, activeTab === 'search' && styles.activeTabLabel]}>Search</Text>
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
          <Text style={[styles.tabLabel, activeTab === 'events' && styles.activeTabLabel]}>Events</Text>
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
          <Text style={[styles.tabLabel, activeTab === 'account' && styles.activeTabLabel]}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme, insets) => {
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
      zIndex: 10
    },
    header: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 16, 
      height: 60, 
      borderBottomWidth: 1, 
      borderBottomColor: 'rgba(255,255,255,0.05)' 
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
    backgroundColor: 'rgba(212, 160, 23, 0.1)',
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
    backgroundColor: 'rgba(212, 160, 23, 0.08)',
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
    backgroundColor: 'rgba(212, 160, 23, 0.08)',
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
    backgroundColor: 'rgba(212, 160, 23, 0.08)',
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
});
}
