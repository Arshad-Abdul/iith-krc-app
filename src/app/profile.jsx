import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

export default function ProfileScreen() {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);
  const [weekOffset, setWeekOffset] = useState(0);

  // Review Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewingBook, setReviewingBook] = useState('');

  const weekData = [
    {
      label: 'This Week (May 11 - May 15)',
      statTitle: 'Today',
      statsTime: '2h 15m',
      progressLabel: 'Daily Goal: 3h',
      progressRight: '75% Completed',
      pctComplete: '75%',
      weeklyLog: [
        { day: 'Mon', pct: '58%' },
        { day: 'Tue', pct: '75%' },
        { day: 'Wed', pct: '16%' },
        { day: 'Thu', pct: '100%' },
        { day: 'Fri', pct: '41%' },
      ]
    },
    {
      label: 'Last Week (May 4 - May 8)',
      statTitle: 'Daily Avg',
      statsTime: '2h 28m',
      progressLabel: 'Avg Daily: 2.5h',
      progressRight: '82% Efficiency',
      pctComplete: '82%',
      weeklyLog: [
        { day: 'Mon', pct: '83%' },
        { day: 'Tue', pct: '100%' },
        { day: 'Wed', pct: '50%' },
        { day: 'Thu', pct: '75%' },
        { day: 'Fri', pct: '100%' },
      ]
    },
    {
      label: '2 Weeks Ago (Apr 27 - May 1)',
      statTitle: 'Daily Avg',
      statsTime: '1h 57m',
      progressLabel: 'Avg Daily: 2.5h',
      progressRight: '65% Efficiency',
      pctComplete: '65%',
      weeklyLog: [
        { day: 'Mon', pct: '33%' },
        { day: 'Tue', pct: '66%' },
        { day: 'Wed', pct: '100%' },
        { day: 'Thu', pct: '41%' },
        { day: 'Fri', pct: '83%' },
      ]
    }
  ];

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
        <Text style={styles.name}>John Doe</Text>
        <View style={{ height: 4 }} />
        <Text style={styles.course}>CS20BTECH11001 • B.Tech CSE</Text>
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

      <View style={styles.activitySection}>
        <Text style={styles.sectionHeaderTitle}>Your Library Activity</Text>
        
        <View style={styles.statsBigCard}>
          {/* Week Selection Control Slider */}
          <View style={styles.weekSelectorRow}>
            <TouchableOpacity 
              disabled={weekOffset >= weekData.length - 1} 
              onPress={() => setWeekOffset(prev => prev + 1)}
              style={[styles.weekNavBtn, weekOffset >= weekData.length - 1 && styles.disabledBtn]}
            >
              <MaterialIcons name="chevron-left" size={24} color={weekOffset >= weekData.length - 1 ? theme.textSecondary : theme.accent} />
            </TouchableOpacity>
            
            <Text style={styles.weekLabel}>{weekData[weekOffset].label}</Text>
            
            <TouchableOpacity 
              disabled={weekOffset === 0} 
              onPress={() => setWeekOffset(prev => prev - 1)}
              style={[styles.weekNavBtn, weekOffset === 0 && styles.disabledBtn]}
            >
              <MaterialIcons name="chevron-right" size={24} color={weekOffset === 0 ? theme.textSecondary : theme.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsTopRow}>
            <View style={styles.statsBadge}>
              <MaterialIcons name="timer" size={20} color={theme.accent} />
              <View style={{ width: 6 }} />
              <Text style={styles.statsTodayText}>{weekData[weekOffset].statTitle}</Text>
            </View>
            <Text style={styles.statsTimeVal}>{weekData[weekOffset].statsTime}</Text>
          </View>

          <View style={{ height: 16 }} />

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: weekData[weekOffset].pctComplete }]} />
          </View>

          <View style={{ height: 8 }} />

          <View style={styles.progressTextRow}>
            <Text style={styles.progressTextLeft}>{weekData[weekOffset].progressLabel}</Text>
            <Text style={styles.progressTextRight}>{weekData[weekOffset].progressRight}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.weeklyTitle}>Weekly Progress Chart</Text>
          <View style={{ height: 8 }} />
          
          <View style={styles.weeklyLogContainer}>
            {weekData[weekOffset].weeklyLog.map((log, index) => (
              <View key={index} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: log.pct }]} />
                </View>
                <Text style={styles.barDayLabel}>{log.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={{ height: 25 }} />

      <View style={styles.statsContainer}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatCard icon="menu-book" value="2" label="Borrowed" iconColor={theme.accent} iconBgColor="rgba(212, 160, 23, 0.1)" />
        </View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <StatCard icon="account-balance-wallet" value="₹0" label="Total Fines" iconColor="#4ade80" iconBgColor="rgba(74, 222, 128, 0.1)" />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard icon="history" value="2" label="History" iconColor="#4ade80" iconBgColor="rgba(74, 222, 128, 0.1)" />
        </View>
      </View>
      <View style={{ height: 30 }} />

      <View style={styles.borrowedSection}>
        <View style={styles.borrowedHeader}>
          <Text style={styles.borrowedHeaderTitle}>Currently Borrowed</Text>
          <Text style={styles.borrowedCount}>2 Items</Text>
        </View>
        <View style={{ height: 20 }} />

        <BorrowedItem 
          title="Introduction to Algorithms" 
          dueDate="Due in 3 days" 
          statusColor="#f59e0b" 
          statusIcon="access-time" 
        />
        <View style={{ height: 15 }} />
        <BorrowedItem 
          title="Deep Learning" 
          dueDate="Due in 14 days" 
          statusColor="#4ade80" 
          statusIcon="access-time" 
        />
      </View>
      <View style={{ height: 10 }} />
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={() => router.replace('/login')}
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

  // Activity stats styling
  activitySection: { paddingHorizontal: 20 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 12 },
  statsBigCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  weekSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: theme.backgroundSelected,
    padding: 6,
    borderRadius: 12,
  },
  weekNavBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: theme.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 1,
  },
  disabledBtn: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.accent,
  },
  statsTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212, 160, 23, 0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  statsTodayText: { fontWeight: 'bold', color: theme.accent, fontSize: 13 },
  statsTimeVal: { fontSize: 26, fontWeight: 'bold', color: theme.text },
  progressBarBg: { height: 10, backgroundColor: theme.backgroundSelected, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.accent, borderRadius: 5 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTextLeft: { fontSize: 12, color: theme.textSecondary, fontWeight: '500' },
  progressTextRight: { fontSize: 12, color: theme.accent, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: theme.backgroundSelected, marginVertical: 16 },
  weeklyTitle: { fontSize: 14, fontWeight: 'bold', color: theme.textSecondary },
  weeklyLogContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 75, paddingTop: 8 },
  barColumn: { alignItems: 'center', flex: 1 },
  barTrack: { height: 45, width: 14, backgroundColor: theme.backgroundSelected, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: theme.accent, borderRadius: 7 },
  barDayLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 6, fontWeight: '500' },

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