import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSession } from '../../services/session';
import { getDdsRequests, submitDdsRequest, deleteDdsRequest } from '../../services/kohaApi';
import { useTheme } from '../constants/ThemeContext';

const REQUEST_TYPES = [
  { id: 'article', label: 'Journal Article' },
  { id: 'book_chapter', label: 'Book Chapter' },
  { id: 'book_ill', label: 'Complete Book (ILL)' },
  { id: 'thesis_paper', label: 'Thesis / Conference' },
];

export default function DdsIllScreen() {
  const { theme, activeTheme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [requestType, setRequestType] = useState('article');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [journalOrBook, setJournalOrBook] = useState('');
  const [year, setYear] = useState('');
  const [volumeIssue, setVolumeIssue] = useState('');
  const [pages, setPages] = useState('');
  const [doiOrIsbn, setDoiOrIsbn] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    const s = await getSession();
    if (!s?.token) {
      router.replace('/login');
      return;
    }
    setSession(s);
    try {
      const data = await getDdsRequests(s.token);
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to load DDS:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter the title of the document or book.');
      return;
    }
    setSubmitting(true);
    try {
      await submitDdsRequest(session.token, {
        request_type: requestType,
        title: title.trim(),
        author: author.trim(),
        journal_or_book: journalOrBook.trim(),
        year: year.trim(),
        volume_issue: volumeIssue.trim(),
        pages: pages.trim(),
        doi_or_isbn: doiOrIsbn.trim(),
        notes: notes.trim(),
      });
      Alert.alert('Request Submitted', 'Your Document Delivery request has been received. Library staff will process it shortly.');
      // Reset form
      setTitle('');
      setAuthor('');
      setJournalOrBook('');
      setYear('');
      setVolumeIssue('');
      setPages('');
      setDoiOrIsbn('');
      setNotes('');
      setActiveTab('list');
      loadData();
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = (r) => {
    const isRejected = r.status === 'rejected';
    const actionTitle = isRejected ? 'Delete Record' : 'Cancel Request';
    const actionMsg = isRejected
      ? `Do you want to remove this rejected request ("${r.title}") from your list?`
      : `Are you sure you want to cancel your request for "${r.title}"?`;

    Alert.alert(
      actionTitle,
      actionMsg,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: isRejected ? 'Delete' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDdsRequest(session.token, r.id);
              loadData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not remove request.');
            }
          },
        },
      ]
    );
  };

  const isDark = activeTheme === 'dark';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'fulfilled':
        return { label: 'Ready to Download', bg: 'rgba(16,185,129,0.15)', text: '#10B981', icon: 'check-circle' };
      case 'requested_from_partner':
        return { label: 'Requested from IIT Partner', bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6', icon: 'sync' };
      case 'in_review':
        return { label: 'Under Verification', bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', icon: 'hourglass-empty' };
      case 'rejected':
        return { label: 'Not Available', bg: 'rgba(239,68,68,0.15)', text: '#EF4444', icon: 'cancel' };
      default:
        return { label: 'Pending Review', bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', icon: 'schedule' };
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#090D16' : '#F8FAFC' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.headerSafeArea, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderBottomColor: isDark ? '#1F2937' : '#E2E8F0', paddingTop: insets?.top || 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{t.ddsIll || 'Document Delivery (DDS)'}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {t.ddsIllDesc || 'Request articles & chapters from partner IITs.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: isDark ? '#1F2937' : '#E2E8F0' }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('list')}
          style={[
            styles.tabItem,
            activeTab === 'list' && { borderBottomColor: theme.accent, borderBottomWidth: 3 },
          ]}
        >
          <MaterialIcons name="list-alt" size={18} color={activeTab === 'list' ? theme.accent : theme.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'list' ? theme.accent : theme.textSecondary }]}>
            {t.myRequests || 'My Requests'} ({requests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('new')}
          style={[
            styles.tabItem,
            activeTab === 'new' && { borderBottomColor: theme.accent, borderBottomWidth: 3 },
          ]}
        >
          <MaterialIcons name="add-circle-outline" size={18} color={activeTab === 'new' ? theme.accent : theme.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? theme.accent : theme.textSecondary }]}>
            {t.newRequest || 'New Request'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'list' ? (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            {/* Info Banner */}
            <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1E293B' : '#EBF8FF', borderColor: theme.accent }]}>
              <MaterialIcons name="info" size={20} color={theme.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                KRC IIT Hyderabad procures articles and book chapters from consortia partners (INFLIBNET, IIT Bombay, IIT Madras, DELCON).
              </Text>
            </View>

            {requests.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="cloud-download" size={56} color={theme.textSecondary} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No requests submitted</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Need a paper or book chapter not found in KRC? Tap &apos;New Request&apos; above.
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('new')}
                  style={[styles.createBtn, { backgroundColor: theme.accent }]}
                >
                  <Text style={styles.createBtnText}>+ Create Request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              requests.map((r) => {
                const badge = getStatusBadge(r.status);
                return (
                  <View
                    key={r.id}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isDark ? '#111827' : '#FFFFFF',
                        borderColor: isDark ? '#1F2937' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: badge.bg,
                        }}
                      >
                        <MaterialIcons name={badge.icon} size={14} color={badge.text} style={{ marginRight: 4 }} />
                        <Text style={{ color: badge.text, fontSize: 12, fontWeight: '600' }}>
                          {badge.label}
                        </Text>
                      </View>
                      <Text style={[styles.reqType, { color: theme.textSecondary }]}>
                        {r.request_type ? r.request_type.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                      </Text>
                    </View>

                    <Text style={[styles.cardTitle, { color: theme.text }]}>{r.title}</Text>
                    {r.author ? <Text style={[styles.cardAuthor, { color: theme.textSecondary }]}>Author: {r.author}</Text> : null}
                    {r.journal_or_book ? <Text style={[styles.cardJournal, { color: isDark ? '#9CA3AF' : '#64748B' }]}>Source: {r.journal_or_book} {r.year ? `(${r.year})` : ''}</Text> : null}
                    {r.doi_or_isbn ? <Text style={[styles.cardDoi, { color: theme.accent }]}>DOI/ISBN: {r.doi_or_isbn}</Text> : null}

                    {r.status_message ? (
                      <View style={[styles.statusMsgBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Text style={[styles.statusMsgText, { color: theme.text }]}>
                          <Text style={{ fontWeight: '700' }}>Staff Note: </Text>
                          {r.status_message}
                        </Text>
                      </View>
                    ) : null}

                    {r.delivered_document_url ? (
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: '/web-view', params: { url: r.delivered_document_url, title: r.title } })}
                        style={[styles.downloadBtn, { backgroundColor: '#10B981' }]}
                      >
                        <MaterialIcons name="cloud-download" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.downloadBtnText}>View Delivered Document</Text>
                      </TouchableOpacity>
                    ) : null}

                    <View
                      style={[
                        styles.cardBottomRow,
                        { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' },
                      ]}
                    >
                      <Text style={[styles.timeText, { color: isDark ? '#6B7280' : '#94A3B8' }]}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>

                      {(r.status === 'pending' || r.status === 'rejected') && (
                        <TouchableOpacity
                          onPress={() => handleCancelRequest(r)}
                          style={[
                            styles.userCancelBtn,
                            {
                              backgroundColor: r.status === 'rejected'
                                ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEE2E2')
                                : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                              borderColor: r.status === 'rejected'
                                ? 'rgba(239,68,68,0.25)'
                                : (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'),
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name={r.status === 'rejected' ? 'delete-outline' : 'close'}
                            size={14}
                            color={r.status === 'rejected' ? '#EF4444' : theme.textSecondary}
                            style={{ marginRight: 3 }}
                          />
                          <Text
                            style={[
                              styles.userCancelBtnText,
                              { color: r.status === 'rejected' ? '#EF4444' : theme.textSecondary },
                            ]}
                          >
                            {r.status === 'rejected' ? 'Delete' : 'Cancel'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )
      ) : (
        /* New Request Form */
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.formCard,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#1F2937' : '#E2E8F0' },
            ]}
          >
            <Text style={[styles.formHeader, { color: theme.text }]}>Request Document / Article</Text>

            {/* Type selector */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Resource Type *</Text>
            <View style={styles.typeRow}>
              {REQUEST_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setRequestType(t.id)}
                  style={[
                    styles.typeChip,
                    requestType === t.id && { backgroundColor: theme.accent, borderColor: theme.accent },
                    requestType !== t.id && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#374151' : '#CBD5E1' },
                  ]}
                >
                  <Text style={[styles.typeText, { color: requestType === t.id ? '#FFFFFF' : theme.text }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Article / Book Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: isDark ? '#374151' : '#CBD5E1' }]}
              placeholder="Full title of the paper or book..."
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            {/* Author */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Author(s)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: isDark ? '#374151' : '#CBD5E1' }]}
              placeholder="e.g. John Doe, Jane Smith"
              placeholderTextColor={theme.textSecondary}
              value={author}
              onChangeText={setAuthor}
            />

            {/* Journal / Source */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Journal / Book / Conference Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: isDark ? '#374151' : '#CBD5E1' }]}
              placeholder="e.g. IEEE Transactions on Neural Networks"
              placeholderTextColor={theme.textSecondary}
              value={journalOrBook}
              onChangeText={setJournalOrBook}
            />

            {/* Grid: Year, Volume, Pages */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Year</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: isDark ? '#374151' : '#CBD5E1' }]}
                  placeholder="2024"
                  placeholderTextColor={theme.textSecondary}
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Vol / Issue</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: isDark ? '#374151' : '#CBD5E1' }]}
                  placeholder="Vol 12, Issue 4"
                  placeholderTextColor={theme.textSecondary}
                  value={volumeIssue}
                  onChangeText={setVolumeIssue}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Pages</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: isDark ? '#374151' : '#CBD5E1' }]}
                  placeholder="pp. 120-145"
                  placeholderTextColor={theme.textSecondary}
                  value={pages}
                  onChangeText={setPages}
                />
              </View>
            </View>

            {/* DOI or ISBN */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>DOI or ISBN (Speeds up fulfillment)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: isDark ? '#374151' : '#CBD5E1' }]}
              placeholder="10.1109/TNNLS.2023..."
              placeholderTextColor={theme.textSecondary}
              value={doiOrIsbn}
              onChangeText={setDoiOrIsbn}
            />

            {/* Additional Notes */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Additional Notes / Reason</Text>
            <TextInput
              style={[styles.input, { height: 75, backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: isDark ? '#374151' : '#CBD5E1', textAlignVertical: 'top' }]}
              placeholder="Required for BTech project thesis / course reference..."
              placeholderTextColor={theme.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, { backgroundColor: theme.accent }]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Document Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSafeArea: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { paddingRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  createBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  reqType: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardAuthor: { fontSize: 13, marginBottom: 2 },
  cardJournal: { fontSize: 12, marginBottom: 2 },
  cardDoi: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  statusMsgBox: { padding: 10, borderRadius: 8, marginVertical: 8 },
  statusMsgText: { fontSize: 12, lineHeight: 16 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginVertical: 8 },
  downloadBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  timeText: { fontSize: 11 },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  userCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  userCancelBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
  formHeader: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  typeChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  typeText: { fontSize: 12, fontWeight: '600' },
  input: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 14, marginBottom: 4 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
