import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../constants/ThemeContext';
import { getAccountLines, getCheckouts } from '../../services/kohaApi';
import { clearSession } from '../../services/session';

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
  const [isLoadingCirculation, setIsLoadingCirculation] = useState(true);
  const [circulationError, setCirculationError] = useState('');

  useEffect(() => {
    if (!session?.token) {
      setIsLoadingCirculation(false);
      return;
    }
    (async () => {
      setIsLoadingCirculation(true);
      setCirculationError('');
      try {
        const [checkoutData, accountData] = await Promise.all([
          getCheckouts(session.token),
          getAccountLines(session.token),
        ]);
        setCheckouts(Array.isArray(checkoutData) ? checkoutData : []);
        setAccountLines(Array.isArray(accountData) ? accountData : []);
      } catch (err) {
        setCirculationError(err.message || 'Could not load your library account.');
      } finally {
        setIsLoadingCirculation(false);
      }
    })();
  }, [session]);

  const totalFines = accountLines.reduce(
    (sum, line) => sum + Number(line.amount_outstanding ?? line.amountoutstanding ?? 0),
    0
  );
  const patron = session?.patron;
  const patronName = patron ? `${patron.firstname ?? ''} ${patron.surname ?? ''}`.trim() || patron.userid : 'My Account';
  const patronMeta = patron?.cardnumber ? `Card No. ${patron.cardnumber}` : '';

  // Review Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewingBook, setReviewingBook] = useState('');

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

  const openReviewModal = (title) => {
    setReviewingBook(title);
    setReviewText('');
    setRating(5);
    setReviewModalVisible(true);
  };

  const submitReview = () => {
    alert(`Review for "${reviewingBook}" submitted! It is now pending admin approval.`);
    setReviewModalVisible(false);
  };

  const BorrowedItem = ({ title, dueDate, statusColor, statusIcon }) => (
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
      <TouchableOpacity style={[styles.renewButton, { borderColor: theme.accent }]} onPress={() => openReviewModal(title)}>
        <Text style={[styles.renewText, { color: theme.accent }]}>Review</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={{ height: 20 }} />
      
      <View style={styles.header}>
        <Text style={styles.name}>{patronName}</Text>
        <View style={{ height: 4 }} />
        <Text style={styles.course}>{patronMeta}</Text>
      </View>
      <View style={{ height: 25 }} />

      <View style={styles.qrContainer}>
        <View style={styles.qrIconWrap}>
          <MaterialIcons name="qr-code-2" size={80} color={theme.primary} />
        </View>
        <View style={{ height: 12 }} />
        <Text style={styles.qrText}>Tap to enlarge ID for Kiosk</Text>
      </View>
      <View style={{ height: 30 }} />


      <View style={styles.statsContainer}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatCard icon="menu-book" value={String(checkouts.length)} label="Borrowed" iconColor={theme.accent} iconBgColor="rgba(212, 160, 23, 0.1)" />
        </View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatCard icon="account-balance-wallet" value={`₹${totalFines.toFixed(2)}`} label="Total Fines" iconColor={totalFines > 0 ? '#f87171' : '#4ade80'} iconBgColor={totalFines > 0 ? 'rgba(248, 113, 113, 0.1)' : 'rgba(74, 222, 128, 0.1)'} />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard icon="history" value={String(accountLines.length)} label="Account Lines" iconColor="#4ade80" iconBgColor="rgba(74, 222, 128, 0.1)" />
        </View>
      </View>
      <View style={{ height: 30 }} />

      <View style={styles.borrowedSection}>
        <View style={styles.borrowedHeader}>
          <Text style={styles.borrowedHeaderTitle}>Currently Borrowed</Text>
          <Text style={styles.borrowedCount}>{checkouts.length} Items</Text>
        </View>
        <View style={{ height: 20 }} />

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
      <View style={{ height: 10 }} />
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

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent={true} onRequestClose={() => setReviewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>for {reviewingBook}</Text>
            
            <View style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <MaterialIcons 
                    name={star <= rating ? "star" : "star-border"} 
                    size={32} 
                    color={theme.accent} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="What did you think of this book?"
              placeholderTextColor={theme.textSecondary}
              multiline
              value={reviewText}
              onChangeText={setReviewText}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={submitReview}>
              <Text style={styles.submitBtnText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (theme, activeTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.primary },
  header: { alignItems: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  course: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
  qrContainer: { marginHorizontal: 40, paddingVertical: 20, paddingHorizontal: 30, backgroundColor: theme.backgroundElement, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  qrIconWrap: { padding: 12, backgroundColor: theme.text, borderRadius: 15 },
  qrText: { fontSize: 12, color: theme.textSecondary },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20 },
  statCard: { paddingHorizontal: 8, paddingVertical: 12, backgroundColor: theme.backgroundElement, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statIconContainer: { padding: 8, borderRadius: 12, marginRight: 6 },
  statTextContainer: { flex: 1 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  statLabel: { fontSize: 10, color: theme.textSecondary },
  borrowedSection: { paddingHorizontal: 20 },
  borrowedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  borrowedHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
  borrowedCount: { fontSize: 14, fontWeight: 'bold', color: theme.accent },
  borrowedItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.backgroundElement, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  borrowedIcon: { width: 48, height: 64, backgroundColor: theme.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  borrowedTextContainer: { flex: 1, marginHorizontal: 16 },
  borrowedTitle: { fontSize: 15, fontWeight: 'bold', color: theme.text },
  borrowedDue: { fontSize: 12, fontWeight: '600' },
  renewButton: { borderWidth: 1, borderColor: theme.backgroundSelected, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  renewText: { color: theme.text },
  errorText: { color: '#f87171', textAlign: 'center', paddingVertical: 12 },
  emptyText: { color: theme.textSecondary, textAlign: 'center', paddingVertical: 12 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.backgroundElement, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
  modalSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 4, marginBottom: 20 },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 8 },
  reviewInput: { backgroundColor: theme.primary, borderRadius: 12, padding: 16, color: theme.text, minHeight: 100, textAlignVertical: 'top', marginBottom: 24, borderWidth: 1, borderColor: theme.backgroundSelected },
  submitBtn: { backgroundColor: theme.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: theme.primary, fontWeight: 'bold', fontSize: 16 },
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