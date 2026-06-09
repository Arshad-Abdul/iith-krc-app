import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

export default function AdminDashboardScreen() {
  const { theme, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, activeTheme, insets);

  // Strict route guard
  useEffect(() => {
    if (!global.isAdmin) {
      Alert.alert("Access Denied", "Only administrators have access to this screen.");
      router.replace('/login');
    }
  }, []);

  // Stateful features for interactivity
  const [modalType, setModalType] = useState(null); // 'issue', 'return', 'addBook'
  const [rollNo, setRollNo] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [isbn, setIsbn] = useState('');

  // Sample static lists with local state for actions
  const [procurements, setProcurements] = useState([
    { id: '1', title: 'Pattern Recognition and Machine Learning', requester: 'CS20BTECH11001', date: 'May 16' },
    { id: '2', title: 'Designing Data-Intensive Applications', requester: 'EE20BTECH11005', date: 'May 18' },
  ]);

  // Mock state for pending student book reviews
  const [pendingReviews, setPendingReviews] = useState([
    { id: '1', bookTitle: 'Introduction to Algorithms', student: 'CS20BTECH11001', rating: 4, review: 'Great book, but the exercises are very tough.' },
  ]);

  const [recentLogs, setRecentLogs] = useState([
    { id: '1', type: 'issue', text: 'Issued "Introduction to Algorithms" to CS20BTECH11001', time: '10 mins ago' },
    { id: '2', type: 'fine', text: 'Alex paid overdue fine of ₹200', time: '1 hour ago' },
    { id: '3', type: 'return', text: 'Returned "Deep Learning" by ME20BTECH11004', time: '2 hours ago' },
  ]);

  // Handle simulated actions
  const handleIssueBook = () => {
    if (!rollNo || !bookTitle) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    const newLog = {
      id: String(recentLogs.length + 1),
      type: 'issue',
      text: `Issued "${bookTitle}" to ${rollNo.toUpperCase()}`,
      time: 'Just now'
    };
    setRecentLogs([newLog, ...recentLogs]);
    setRollNo('');
    setBookTitle('');
    setModalType(null);
    Alert.alert("Success", `Successfully issued "${bookTitle}" to student!`);
  };

  const handleReturnBook = () => {
    if (!rollNo || !bookTitle) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    const newLog = {
      id: String(recentLogs.length + 1),
      type: 'return',
      text: `Returned "${bookTitle}" from ${rollNo.toUpperCase()}`,
      time: 'Just now'
    };
    setRecentLogs([newLog, ...recentLogs]);
    setRollNo('');
    setBookTitle('');
    setModalType(null);
    Alert.alert("Success", `Successfully returned "${bookTitle}" to inventory!`);
  };

  const handleAddBook = () => {
    if (!bookTitle || !isbn) {
      Alert.alert("Error", "Please fill in book title and ISBN.");
      return;
    }
    const newLog = {
      id: String(recentLogs.length + 1),
      type: 'add',
      text: `Added new book "${bookTitle}" [ISBN: ${isbn}]`,
      time: 'Just now'
    };
    setRecentLogs([newLog, ...recentLogs]);
    setBookTitle('');
    setIsbn('');
    setModalType(null);
    Alert.alert("Success", `"${bookTitle}" has been added to the library database!`);
  };

  const handleProcurement = (id, approved) => {
    setProcurements(procurements.filter(item => item.id !== id));
    const target = procurements.find(item => item.id === id);
    const newLog = {
      id: String(recentLogs.length + 1),
      type: approved ? 'approve' : 'reject',
      text: `${approved ? 'Approved' : 'Rejected'} procurement request: "${target.title}"`,
      time: 'Just now'
    };
    setRecentLogs([newLog, ...recentLogs]);
    Alert.alert(approved ? "Approved" : "Rejected", `Procurement request was successfully processed.`);
  };

  const handleReviewAction = (id, approved) => {
    const target = pendingReviews.find(item => item.id === id);
    setPendingReviews(pendingReviews.filter(item => item.id !== id));
    const newLog = {
      id: String(recentLogs.length + 1),
      type: approved ? 'approve' : 'reject',
      text: `${approved ? 'Approved' : 'Rejected'} student review for "${target.bookTitle}"`,
      time: 'Just now'
    };
    setRecentLogs([newLog, ...recentLogs]);
    Alert.alert(approved ? "Approved" : "Rejected", `Book review was successfully processed.`);
  };

  const handleLogout = () => {
    global.isAdmin = false;
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>KRC Admin Portal</Text>
            <Text style={styles.headerSubtitle}>Library Management Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>
        {/* Core Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons name="people" size={28} color={theme.accent} />
            <Text style={styles.statValue}>1,240</Text>
            <Text style={styles.statLabel}>Active Students</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="menu-book" size={28} color="#e57373" />
            <Text style={styles.statValue}>382</Text>
            <Text style={styles.statLabel}>Books Loaned</Text>
          </View>
          <View style={[styles.statCard, { marginRight: 0 }]}>
            <MaterialIcons name="payments" size={28} color="#4db6ac" />
            <Text style={styles.statValue}>₹4,850</Text>
            <Text style={styles.statLabel}>Pending Fines</Text>
          </View>
        </View>

        {/* Quick Actions Panel */}
        <Text style={styles.sectionTitle}>Quick Operations</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, styles.actionCardBlue]} onPress={() => setModalType('issue')}>
            <View style={[styles.iconWrap, { backgroundColor: '#3f51b5' }]}>
              <MaterialIcons name="outbox" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Issue Book</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, styles.actionCardBrown]} onPress={() => setModalType('return')}>
            <View style={[styles.iconWrap, { backgroundColor: '#795548' }]}>
              <MaterialIcons name="move-to-inbox" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Return Book</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, styles.actionCardTeal, { marginRight: 0 }]} onPress={() => setModalType('addBook')}>
            <View style={[styles.iconWrap, { backgroundColor: '#009688' }]}>
              <MaterialIcons name="library-add" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Add Book</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Student Book Procurement Requests */}
        {procurements.length > 0 && (
          <View style={styles.procureSection}>
            <Text style={styles.sectionTitle}>Procurement Suggestions ({procurements.length})</Text>
            {procurements.map(item => (
              <View key={item.id} style={styles.suggestionCard}>
                <View style={styles.suggestBody}>
                  <Text style={styles.suggestTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.suggestSub}>Requested by {item.requester} • {item.date}</Text>
                </View>
                <View style={styles.suggestButtons}>
                  <TouchableOpacity style={styles.suggestBtnReject} onPress={() => handleProcurement(item.id, false)}>
                    <MaterialIcons name="close" size={20} color="#e53935" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.suggestBtnApprove} onPress={() => handleProcurement(item.id, true)}>
                    <MaterialIcons name="check" size={20} color="#43a047" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending Student Book Reviews */}
        {pendingReviews.length > 0 && (
          <View style={styles.procureSection}>
            <Text style={styles.sectionTitle}>Pending Book Reviews ({pendingReviews.length})</Text>
            {pendingReviews.map(item => (
              <View key={item.id} style={styles.suggestionCard}>
                <View style={styles.suggestBody}>
                  <Text style={styles.suggestTitle} numberOfLines={1}>{item.bookTitle} ({item.rating}/5 ⭐)</Text>
                  <Text style={styles.suggestSub} numberOfLines={2}>&quot;{item.review}&quot; - {item.student}</Text>
                </View>
                <View style={styles.suggestButtons}>
                  <TouchableOpacity style={styles.suggestBtnReject} onPress={() => handleReviewAction(item.id, false)}>
                    <MaterialIcons name="close" size={20} color="#e53935" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.suggestBtnApprove} onPress={() => handleReviewAction(item.id, true)}>
                    <MaterialIcons name="check" size={20} color="#43a047" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Admin Operations Log */}
        <Text style={styles.sectionTitle}>Recent Operations Log</Text>
        <View style={styles.logCard}>
          {recentLogs.map((log) => {
            const getIcon = () => {
              if (log.type === 'issue') return 'outbox';
              if (log.type === 'return') return 'move-to-inbox';
              if (log.type === 'fine') return 'payments';
              if (log.type === 'add') return 'library-add';
              return 'done';
            };
            return (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logIconBox}>
                  <MaterialIcons name={getIcon()} size={20} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logText}>{log.text}</Text>
                  <Text style={styles.logTime}>{log.time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Dynamic Stateful Action Modals */}
      <Modal animationType="slide" transparent={true} visible={modalType !== null} onRequestClose={() => setModalType(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {modalType === 'issue' && 'Issue Library Book'}
                {modalType === 'return' && 'Process Book Return'}
                {modalType === 'addBook' && 'Add New Catalog Book'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)}>
                <MaterialIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Input Forms */}
            {modalType !== 'addBook' ? (
              <>
                <Text style={styles.fieldLabel}>Student Roll Number</Text>
                <TextInput 
                  placeholder="e.g. CS20BTECH11001" 
                  placeholderTextColor={theme.textSecondary}
                  value={rollNo} 
                  onChangeText={setRollNo} 
                  style={styles.modalInput} 
                  autoCapitalize="characters"
                />

                <Text style={styles.fieldLabel}>Book Title</Text>
                <TextInput 
                  placeholder="e.g. Introduction to Algorithms" 
                  placeholderTextColor={theme.textSecondary}
                  value={bookTitle} 
                  onChangeText={setBookTitle} 
                  style={styles.modalInput}
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Book Title</Text>
                <TextInput 
                  placeholder="e.g. Pattern Recognition" 
                  placeholderTextColor={theme.textSecondary}
                  value={bookTitle} 
                  onChangeText={setBookTitle} 
                  style={styles.modalInput}
                />

                <Text style={styles.fieldLabel}>ISBN Code</Text>
                <TextInput 
                  placeholder="e.g. 978-0134670905" 
                  placeholderTextColor={theme.textSecondary}
                  value={isbn} 
                  onChangeText={setIsbn} 
                  style={styles.modalInput}
                />
              </>
            )}

            <View style={{ height: 24 }} />

            <TouchableOpacity 
              style={styles.modalSubmitBtn}
              onPress={() => {
                if (modalType === 'issue') handleIssueBook();
                if (modalType === 'return') handleReturnBook();
                if (modalType === 'addBook') handleAddBook();
              }}
            >
              <Text style={styles.modalSubmitText}>SUBMIT TRANSACTION</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme, activeTheme, insets) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    headerSafeArea: {
      backgroundColor: theme.primary,
      paddingTop: insets?.top || 0,
      zIndex: 10,
    },
    header: { 
      backgroundColor: theme.primary, 
      paddingHorizontal: 20, 
      paddingVertical: 18, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4,
    },
    headerTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    headerSubtitle: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
    logoutBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10 },
    body: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    
    // Stats overview grid
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    statCard: { 
      flex: 1, 
      backgroundColor: theme.backgroundElement, 
      padding: 14, 
      borderRadius: 16, 
      marginRight: 10,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.02,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.backgroundSelected,
    },
    statValue: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginTop: 8 },
    statLabel: { fontSize: 10, color: theme.textSecondary, textAlign: 'center', marginTop: 2 },

    // Operations actions grid
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 12, marginTop: 12 },
    actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    actionCard: { 
      flex: 1, 
      padding: 16, 
      borderRadius: 16, 
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      minHeight: 110,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
    },
    actionCardBlue: { backgroundColor: isDark ? 'rgba(63, 81, 181, 0.12)' : '#e8eaf6' },
    actionCardBrown: { backgroundColor: isDark ? 'rgba(121, 85, 72, 0.12)' : '#efebe9' },
    actionCardTeal: { backgroundColor: isDark ? 'rgba(0, 150, 136, 0.12)' : '#e0f2f1' },
    iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    actionText: { fontSize: 12, fontWeight: 'bold', color: theme.text },

    // Procurement Suggestions
    procureSection: { marginBottom: 24 },
    suggestionCard: { 
      flexDirection: 'row', 
      backgroundColor: theme.backgroundElement, 
      padding: 14, 
      borderRadius: 16, 
      marginBottom: 10, 
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.01,
      shadowRadius: 4,
      elevation: 1,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.backgroundSelected,
    },
    suggestBody: { flex: 1, marginRight: 12 },
    suggestTitle: { fontSize: 14, fontWeight: 'bold', color: theme.text },
    suggestSub: { fontSize: 11, color: theme.textSecondary, marginTop: 4 },
    suggestButtons: { flexDirection: 'row', alignItems: 'center' },
    suggestBtnApprove: { backgroundColor: isDark ? 'rgba(67, 160, 71, 0.15)' : '#e8f5e9', padding: 8, borderRadius: 8, marginLeft: 8 },
    suggestBtnReject: { backgroundColor: isDark ? 'rgba(229, 57, 53, 0.15)' : '#ffebee', padding: 8, borderRadius: 8 },

    // Logging Card list
    logCard: { 
      backgroundColor: theme.backgroundElement, 
      borderRadius: 18, 
      paddingHorizontal: 16, 
      paddingTop: 12, 
      paddingBottom: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.02,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.backgroundSelected,
    },
    logRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected, paddingVertical: 12 },
    logIconBox: { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#e8eaf6', padding: 8, borderRadius: 10, marginRight: 12 },
    logText: { fontSize: 13, color: theme.text, lineHeight: 18 },
    logTime: { fontSize: 10, color: theme.textSecondary, marginTop: 4 },

    // Stateful Modals Style
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { 
      backgroundColor: theme.backgroundElement, 
      borderRadius: 20, 
      padding: 24, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 10 }, 
      shadowOpacity: 0.2, 
      shadowRadius: 20, 
      elevation: 10,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.backgroundSelected,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
    fieldLabel: { fontSize: 13, fontWeight: 'bold', color: theme.text, marginTop: 14, marginBottom: 6 },
    modalInput: { 
      borderWidth: 1, 
      borderColor: theme.backgroundSelected, 
      paddingVertical: 12, 
      paddingHorizontal: 16, 
      borderRadius: 12, 
      fontSize: 14, 
      color: theme.text, 
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa' 
    },
    modalSubmitBtn: { backgroundColor: theme.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    modalSubmitText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  });
};
