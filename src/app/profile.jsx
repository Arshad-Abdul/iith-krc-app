import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../constants/ThemeContext';
import { getAccountLines, getCheckouts, getCheckoutHistory, getReadingHabits, updateReadingStatus, getPatronImageUrl, getInterests, saveInterests } from '../../services/kohaApi';
import { clearSession } from '../../services/session';
import { getCache, saveCache } from '../../services/cache';
import { coverUrl } from '../../services/webopacApi';
import { getWishlist, removeFromWishlist } from '../../services/wishlist';
import { DDC_SUBJECTS } from '../constants/ddc_subjects';

const daysUntil = (dateString) => {
  if (!dateString) return null;
  const diffMs = new Date(dateString).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export default function ProfileScreen({ session }) {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);

  const [checkouts, setCheckouts] = useState([]);
  const [accountLines, setAccountLines] = useState([]);
  const [history, setHistory] = useState([]);
  const [readingHabits, setReadingHabits] = useState([]);
  const [isLoadingCirculation, setIsLoadingCirculation] = useState(true);
  const [circulationError, setCirculationError] = useState('');
  const [cacheTs, setCacheTs] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [interests, setInterests] = useState([]);
  const [isInterestsModalVisible, setIsInterestsModalVisible] = useState(false);
  const [selectedDdcCodes, setSelectedDdcCodes] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    getWishlist().then(setWishlist).catch(() => {});
  }, []);

  const loadProfileData = async (forceFresh = false) => {
    if (!session?.token) {
      setIsLoadingCirculation(false);
      setIsRefreshing(false);
      return;
    }

    if (!forceFresh) {
      const cached = await getCache(`profile_${session.patron?.patron_id}`);
      if (cached) {
        setCheckouts(cached.data.checkouts ?? []);
        setAccountLines(cached.data.accountLines ?? []);
        setHistory(cached.data.history ?? []);
        setReadingHabits(cached.data.habits ?? []);
        setCacheTs(cached.ts);
        setIsLoadingCirculation(false);
      } else {
        setIsLoadingCirculation(true);
      }
    } else {
      setIsRefreshing(true);
    }

    try {
      const [checkoutData, accountData, historyData, habitsData, interestsData] = await Promise.all([
        getCheckouts(session.token).catch(() => []),
        getAccountLines(session.token).catch(() => []),
        getCheckoutHistory(session.token).catch(() => []),
        getReadingHabits(session.token).catch(() => []),
        getInterests(session.token).catch(() => []),
      ]);
      const co = Array.isArray(checkoutData) ? checkoutData : [];
      const ac = Array.isArray(accountData) ? accountData : [];
      const hist = Array.isArray(historyData) ? historyData : [];
      const habits = Array.isArray(habitsData) ? habitsData : [];
      const myInterests = Array.isArray(interestsData) ? interestsData : [];
      setCheckouts(co);
      setAccountLines(ac);
      setHistory(hist);
      setReadingHabits(habits);
      setInterests(myInterests);
      setSelectedDdcCodes(myInterests.map((i) => i.ddc_code));
      setCacheTs(null);
      await saveCache(`profile_${session.patron?.patron_id}`, { checkouts: co, accountLines: ac, history: hist, habits });
    } catch (err) {
      setCirculationError('Could not sync some library records.');
    } finally {
      setIsLoadingCirculation(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [session]);

  const getBadges = () => {
    const finishedCount = readingHabits.filter(h => h.status === 'finished').length;
    const isMLPioneer = readingHabits.filter(h => {
      if (h.status !== 'finished') return false;
      const t = (h.title || '').toLowerCase();
      const a = (h.author || '').toLowerCase();
      return t.includes('machine learning') || t.includes('neural') || t.includes('artificial') || t.includes('deep learning') || t.includes('python');
    }).length >= 3;

    const hasFines = accountLines.reduce((sum, line) => sum + Number(line.amount_outstanding ?? line.amountoutstanding ?? 0), 0) > 0;
    const hasOverdue = checkouts.some(item => daysUntil(item.date_due ?? item.due_date) < 0);
    const isPerfectRecord = checkouts.length > 0 && !hasFines && !hasOverdue;

    return [
      {
        id: 'first_step',
        title: 'First Step',
        description: 'Completed your first book reference',
        icon: 'check-circle',
        color: '#10B981',
        unlocked: finishedCount >= 1,
      },
      {
        id: 'bibliophile',
        title: 'Bibliophile',
        description: 'Completed 5+ reference books',
        icon: 'auto-stories',
        color: '#3B82F6',
        unlocked: finishedCount >= 5,
      },
      {
        id: 'ml_pioneer',
        title: 'ML Pioneer',
        description: 'Completed 3 books on AI/ML or Python',
        icon: 'psychology',
        color: '#8B5CF6',
        unlocked: isMLPioneer,
      },
      {
        id: 'perfect_record',
        title: 'Perfect Record',
        description: 'No active fines or overdue items',
        icon: 'verified',
        color: '#F59E0B',
        unlocked: isPerfectRecord,
      },
      {
        id: 'curator',
        title: 'Wishlist Curator',
        description: 'Saved 3+ books for future reading',
        icon: 'collections-bookmark',
        color: '#EC4899',
        unlocked: wishlist.length >= 3,
      },
    ];
  };

  const handleUpdateReadingStatus = async (book, newStatus) => {
    if (!session?.token) return;
    try {
      await updateReadingStatus(session.token, {
        biblio_id: book.biblio_id,
        title: book.title || book.biblio_title || `Book #${book.biblio_id}`,
        author: book.author || "",
        status: newStatus
      });
      const updatedHabits = await getReadingHabits(session.token);
      setReadingHabits(Array.isArray(updatedHabits) ? updatedHabits : []);
    } catch (err) {
      console.warn("Could not update reading status:", err.message);
    }
  };

  const totalFines = accountLines.reduce(
    (sum, line) => sum + Number(line.amount_outstanding ?? line.amountoutstanding ?? 0),
    0
  );
  const patron = session?.patron;
  const patronName = patron ? `${patron.firstname ?? ''} ${patron.surname ?? ''}`.trim() || patron.userid : 'My Account';
  const categoryTitle = patron?.category_name || patron?.category_description || patron?.category_id || patron?.categorycode || '';
  const patronMeta = [
    patron?.cardnumber ? `Card No. ${patron.cardnumber}` : '',
    categoryTitle ? `Category: ${categoryTitle}` : ''
  ].filter(Boolean).join(' • ');

  const StatCard = ({ icon, value, label, iconColor, iconBgColor }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: iconBgColor }]}>
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );

  const BorrowedItem = ({ item, title, dueDate, statusColor, statusIcon }) => {
    const habit = readingHabits.find(h => Number(h.biblio_id) === Number(item.biblio_id));
    const status = habit ? habit.status : 'issued';
    
    return (
      <View style={styles.borrowedItemContainer}>
        <View style={styles.borrowedItem}>
          <View style={styles.borrowedIcon}>
            <MaterialIcons name="book" color="white" size={24} />
          </View>
          <View style={styles.borrowedTextContainer}>
            <Text style={styles.borrowedTitle}>{title}</Text>
            <View style={{ height: 6 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name={statusIcon} size={14} color={statusColor} />
              <Text style={[styles.borrowedDue, { color: statusColor }]}> {dueDate}</Text>
            </View>
          </View>
          <View style={[
            styles.habitTag,
            status === 'reading' ? styles.habitTagReading : status === 'finished' ? styles.habitTagFinished : styles.habitTagIssued
          ]}>
            <Text style={[
              styles.habitTagText,
              status === 'reading' ? styles.habitTagTextReading : status === 'finished' ? styles.habitTagTextFinished : styles.habitTagTextIssued
            ]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
        {status !== 'finished' && (
          <View style={styles.habitActionRow}>
            {status === 'issued' ? (
              <TouchableOpacity 
                style={styles.habitActionBtn} 
                onPress={() => handleUpdateReadingStatus(item, 'reading')}
              >
                <MaterialIcons name="play-arrow" size={16} color="#FFFFFF" />
                <Text style={styles.habitActionBtnText}>Start Reading</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.habitActionBtn, { backgroundColor: '#10B981' }]} 
                onPress={() => handleUpdateReadingStatus(item, 'finished')}
              >
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
                <Text style={styles.habitActionBtnText}>Mark as Finished</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadProfileData(true)}
          tintColor={theme.accent}
          colors={[theme.accent]}
        />
      }
    >
      <View style={{ height: 20 }} />
      
      <View style={styles.profileHeaderRow}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.name}>{patronName}</Text>
          <View style={{ height: 4 }} />
          <Text style={styles.course}>{patronMeta}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarInitials}>
            <Text style={styles.avatarInitialsText}>
              {patronName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
            </Text>
          </View>
          {session?.token && (
            <Image
              source={{
                uri: getPatronImageUrl(),
                headers: {
                  Authorization: `Bearer ${session.token}`,
                },
              }}
              style={styles.avatarImage}
            />
          )}
        </View>
      </View>
      <View style={{ height: 25 }} />

      <TouchableOpacity
        style={styles.qrContainer}
        onPress={() => setIsQrModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.qrIconWrap}>
          {patron?.cardnumber ? (
            <Image 
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${patron.cardnumber}` }} 
              style={{ width: 100, height: 100, borderRadius: 8 }}
            />
          ) : (
            <MaterialIcons name="qr-code-2" size={80} color={theme.primary} />
          )}
        </View>
        <View style={{ height: 12 }} />
        <Text style={styles.qrText}>Tap to enlarge ID for Kiosk</Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />

      {/* Enlarged QR Code Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isQrModalVisible}
        onRequestClose={() => setIsQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Library Digital ID</Text>
              <TouchableOpacity onPress={() => setIsQrModalVisible(false)} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={{ height: 16 }} />
            <Text style={styles.qrModalPatronName}>{patronName}</Text>
            {patronMeta ? <Text style={styles.qrModalPatronMeta}>{patronMeta}</Text> : null}
            <View style={{ height: 24 }} />
            
            <View style={styles.enlargedQrCard}>
              {patron?.cardnumber ? (
                <View style={{ alignItems: 'center', gap: 20 }}>
                  <Image 
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${patron.cardnumber}&color=000000` }} 
                    style={{ width: 220, height: 220 }}
                    resizeMode="contain"
                  />
                  <Image 
                    source={{ uri: `https://bwipjs-api.metafloor.com/?bcid=code128&text=${patron.cardnumber}&scale=2&rotate=N&includetext` }} 
                    style={{ width: 240, height: 70 }}
                    resizeMode="contain"
                  />
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000000', marginTop: -5 }}>
                    {patron.cardnumber}
                  </Text>
                </View>
              ) : (
                <MaterialIcons name="qr-code-2" size={200} color="#000000" />
              )}
            </View>
            <View style={{ height: 16 }} />
            <Text style={styles.qrModalNotice}>Scan at KRC Circulation Desk or Self-Kiosk</Text>
            <View style={{ height: 24 }} />
            
            <TouchableOpacity 
              style={styles.closeQrBtn}
              onPress={() => setIsQrModalVisible(false)}
            >
              <Text style={styles.closeQrBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.statsContainer}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatCard icon="menu-book" value={String(checkouts.length)} label="Borrowed" iconColor={theme.accent} iconBgColor={activeTheme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(32, 138, 239, 0.1)'} />
        </View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatCard icon="account-balance-wallet" value={`₹${totalFines.toFixed(2)}`} label="Total Fines" iconColor={totalFines > 0 ? '#f87171' : '#4ade80'} iconBgColor={totalFines > 0 ? 'rgba(248, 113, 113, 0.1)' : 'rgba(74, 222, 128, 0.1)'} />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard icon="history" value={String(accountLines.length)} label="Account Lines" iconColor="#4ade80" iconBgColor="rgba(74, 222, 128, 0.1)" />
        </View>
      </View>
      <View style={{ height: 30 }} />

      {/* Literary Achievements / Badges Section */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 12 }}>Literary Achievements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
          {getBadges().map((badge) => (
            <View
              key={badge.id}
              style={{
                width: 140,
                backgroundColor: theme.backgroundCard,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                opacity: badge.unlocked ? 1 : 0.4,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: badge.unlocked ? `${badge.color}15` : theme.border, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons name={badge.icon} size={24} color={badge.unlocked ? badge.color : theme.textSecondary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, textAlign: 'center' }} numberOfLines={1}>
                {badge.title}
              </Text>
              <Text style={{ fontSize: 10, color: theme.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 12 }} numberOfLines={2}>
                {badge.description}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Academic & Research Interests Section */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>Academic & Research Interests</Text>
          <TouchableOpacity onPress={() => setIsInterestsModalVisible(true)}>
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>Edit Topics</Text>
          </TouchableOpacity>
        </View>

        {interests.length === 0 ? (
          <TouchableOpacity
            onPress={() => setIsInterestsModalVisible(true)}
            style={{
              padding: 14,
              backgroundColor: theme.backgroundCard,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="local-offer" size={20} color={theme.accent} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }}>
              Select your academic disciplines to personalize catalog suggestions.
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {interests.map((it) => (
              <View
                key={it.ddc_code}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: `${theme.accent}15`,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.accent }}>
                  {it.subject_name}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 4 }}>({it.ddc_code})</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* DDC Interests Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isInterestsModalVisible}
        onRequestClose={() => setIsInterestsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.qrModalContent, { maxHeight: '80%' }]}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Select Research Interests</Text>
              <TouchableOpacity onPress={() => setIsInterestsModalVisible(false)} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: theme.textSecondary, marginVertical: 8 }}>
              Standard Dewey Decimal Classification (DDC) subjects matching IIT Hyderabad catalog records:
            </Text>

            <ScrollView style={{ maxHeight: 350, marginVertical: 10 }}>
              {DDC_SUBJECTS.map((s) => {
                const isSelected = selectedDdcCodes.includes(s.ddc);
                return (
                  <TouchableOpacity
                    key={s.ddc}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedDdcCodes(selectedDdcCodes.filter((c) => c !== s.ddc));
                      } else {
                        setSelectedDdcCodes([...selectedDdcCodes, s.ddc]);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <MaterialIcons
                      name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={isSelected ? theme.accent : theme.textSecondary}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '500', color: theme.text }}>
                        {s.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        DDC: {s.ddc} • {s.category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={async () => {
                const selectedItems = DDC_SUBJECTS.filter((s) => selectedDdcCodes.includes(s.ddc)).map((s) => ({
                  ddc_code: s.ddc,
                  subject_name: s.name,
                }));
                setInterests(selectedItems);
                setIsInterestsModalVisible(false);
                if (session?.token) {
                  await saveInterests(session.token, selectedItems).catch(() => {});
                }
              }}
              style={{
                backgroundColor: theme.accent,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Save Interests</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.borrowedSection}>
        <View style={styles.borrowedHeader}>
          <Text style={styles.borrowedHeaderTitle}>Currently Borrowed</Text>
          <Text style={styles.borrowedCount}>{checkouts.length} Items</Text>
        </View>
        <View style={{ height: 20 }} />

        {cacheTs && (
          <Text style={[styles.emptyText, { marginBottom: 8 }]}>
            Showing cached data · last updated {new Date(cacheTs).toLocaleTimeString()}
          </Text>
        )}
        {isLoadingCirculation ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : circulationError ? (
          <Text style={styles.errorText}>{circulationError}</Text>
        ) : checkouts.length === 0 ? (
          <Text style={styles.emptyText}>You have no items checked out.</Text>
        ) : (
          checkouts.map((item, index) => {
            const remaining = daysUntil(item.date_due ?? item.due_date);
            const overdue = remaining !== null && remaining < 0;
            return (
              <View key={item.checkout_id ?? index}>
                <BorrowedItem
                  item={item}
                  title={item.title ?? item.biblio_title ?? `Item #${item.item_id ?? index}`}
                  dueDate={
                    remaining === null
                      ? 'Due date unavailable'
                      : overdue
                        ? `Overdue by ${Math.abs(remaining)} day(s)`
                        : `Due in ${remaining} day(s)`
                  }
                  statusColor={overdue ? '#f87171' : '#4ade80'}
                  statusIcon={overdue ? 'error-outline' : 'access-time'}
                />
                <View style={{ height: 15 }} />
              </View>
            );
          })
        )}
      </View>
      <View style={{ height: 24 }} />

      {/* My List / Wishlist */}
      <TouchableOpacity
        style={[styles.borrowedHeader, { paddingHorizontal: 20 }]}
        onPress={() => setShowWishlist((v) => !v)}
      >
        <Text style={styles.borrowedHeaderTitle}>My List</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.borrowedCount}>{wishlist.length} Saved</Text>
          <MaterialIcons
            name={showWishlist ? 'expand-less' : 'expand-more'}
            size={20}
            color={theme.accent}
          />
        </View>
      </TouchableOpacity>

      {showWishlist && (
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          {wishlist.length === 0 ? (
            <Text style={styles.emptyText}>No saved books yet. Tap the bookmark icon on any book to save it.</Text>
          ) : (
            wishlist.map((book) => (
              <View key={book.biblio_id} style={[styles.borrowedItemContainer, { marginBottom: 12 }]}>
                <View style={styles.borrowedItem}>
                  <Image
                    source={{ uri: coverUrl(book.biblio_id) }}
                    style={{ width: 44, height: 60, borderRadius: 6, backgroundColor: theme.backgroundSelected }}
                    resizeMode="cover"
                  />
                  <View style={styles.borrowedTextContainer}>
                    <Text style={styles.borrowedTitle} numberOfLines={2}>{book.title}</Text>
                    {book.author ? <Text style={[styles.borrowedDue, { color: theme.textSecondary }]}>{book.author}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={styles.renewButton}
                    onPress={() => router.push({ pathname: '/book-detail', params: { biblioId: book.biblio_id } })}
                  >
                    <Text style={[styles.renewText, { color: theme.accent }]}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={async () => {
                      await removeFromWishlist(book.biblio_id);
                      setWishlist((prev) => prev.filter((b) => b.biblio_id !== book.biblio_id));
                    }}
                  >
                    <MaterialIcons name="close" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Reading / Checkout History Section */}
      <View style={{ height: 24 }} />
      <View style={[styles.borrowedHeader, { paddingHorizontal: 20 }]}>
        <Text style={styles.borrowedHeaderTitle}>Reading History</Text>
        <Text style={styles.borrowedCount}>{history.length} Books</Text>
      </View>
      <View style={{ height: 16 }} />
      
      {history.length === 0 ? (
        <Text style={styles.emptyText}>No checkout history records found.</Text>
      ) : (
        <View style={styles.historyContainer}>
          {history.map((item, index) => (
            <TouchableOpacity
              key={item.issue_id ?? item.checkout_id ?? index}
              style={styles.historyItem}
              onPress={() => {
                if (item.biblio_id) {
                  router.push({ pathname: '/book-detail', params: { biblioId: item.biblio_id } });
                }
              }}
              activeOpacity={0.75}
            >
              <View style={styles.historyItemIcon}>
                <MaterialIcons name="assignment-turned-in" size={20} color={theme.accent} />
              </View>
              <View style={styles.historyItemContent}>
                <Text style={styles.historyItemTitle} numberOfLines={1}>
                  {(item.title || '').replace(/\s*\/+\s*$/, '').trim() || `Book #${item.biblio_id}`}
                </Text>
                <Text style={styles.historyItemAuthor} numberOfLines={1}>
                  {item.author ? item.author.replace(/\s*[,/]+\s*$/, '').trim() : 'Unknown Author'}
                </Text>
                <Text style={styles.historyItemDate}>
                  Returned on {item.checkin_date ? new Date(item.checkin_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 20 }} />
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await clearSession();
          router.replace('/login');
        }}
      >
        <MaterialIcons name="logout" size={20} color="#EF4444" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />

    </ScrollView>
  );
}

const createStyles = (theme, activeTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.primary },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: theme.accent,
    backgroundColor: theme.backgroundElement,
  },
  avatarInitials: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.backgroundSelected,
  },
  avatarInitialsText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.accent,
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
  },
  header: { alignItems: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  course: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
  qrContainer: { marginHorizontal: 40, paddingVertical: 20, paddingHorizontal: 30, backgroundColor: theme.backgroundElement, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  qrIconWrap: { padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12 },
  qrText: { fontSize: 12, color: theme.textSecondary },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20 },
  statCard: { flex: 1, paddingHorizontal: 8, paddingVertical: 12, backgroundColor: theme.backgroundElement, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statIconContainer: { padding: 8, borderRadius: 12, marginRight: 6 },
  statTextContainer: { flex: 1 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  statLabel: { fontSize: 10, color: theme.textSecondary },
  borrowedSection: { paddingHorizontal: 20 },
  borrowedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  borrowedHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
  borrowedCount: { fontSize: 14, fontWeight: 'bold', color: theme.accent },
  borrowedItemContainer: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  borrowedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  borrowedIcon: { width: 48, height: 64, backgroundColor: theme.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  borrowedTextContainer: { flex: 1, marginHorizontal: 16 },
  borrowedTitle: { fontSize: 14, fontWeight: 'bold', color: theme.text },
  borrowedDue: { fontSize: 11, fontWeight: '600' },
  renewButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(32, 138, 239, 0.1)', borderRadius: 8 },
  renewText: { fontSize: 12, fontWeight: 'bold' },
  errorText: { color: '#f87171', textAlign: 'center', paddingVertical: 12 },
  emptyText: { color: theme.textSecondary, textAlign: 'center', paddingVertical: 12 },
  habitTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
  },
  habitTagIssued: { backgroundColor: 'rgba(156, 163, 175, 0.15)' },
  habitTagReading: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  habitTagFinished: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  habitTagText: { fontSize: 10, fontWeight: 'bold' },
  habitTagTextIssued: { color: '#9CA3AF' },
  habitTagTextReading: { color: theme.accent },
  habitTagTextFinished: { color: '#10B981' },
  habitActionRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  habitActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  habitActionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  historyContainer: { paddingHorizontal: 20 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.backgroundElement,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  historyItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(32, 138, 239, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyItemContent: { flex: 1 },
  historyItemTitle: { fontSize: 14, fontWeight: 'bold', color: theme.text },
  historyItemAuthor: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  historyItemDate: { fontSize: 11, color: theme.textSecondary, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    width: '90%',
    backgroundColor: theme.backgroundElement,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  modalCloseButton: { padding: 4 },
  qrModalPatronName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
  },
  qrModalPatronMeta: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  enlargedQrCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  qrModalNotice: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  closeQrBtn: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  closeQrBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});