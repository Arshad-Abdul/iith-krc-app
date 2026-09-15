import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { getSession } from '../../services/session';
import { getNotifications, deleteNotification, clearAllNotifications, getRecommendations, deleteRecommendation } from '../../services/kohaApi';
import { useTheme } from '../constants/ThemeContext';
import * as Notifications from 'expo-notifications';

export default function NotificationsScreen() {
  const { theme, activeTheme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams();
  const [session, setSession] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(tab === 'recommendation' ? 'recommendation' : 'all');

  const load = async () => {
    const s = await getSession();
    if (!s?.token) {
      router.replace('/login');
      return;
    }
    setSession(s);
    try {
      const [notifsData, recsData] = await Promise.all([
        getNotifications(s.token).catch(() => []),
        getRecommendations(s.token).catch(() => []),
      ]);
      
      const formattedRecs = (Array.isArray(recsData) ? recsData : []).map((r) => ({
        id: `rec_${r.id}`,
        rawId: r.id,
        type: 'recommendation',
        title: r.title,
        message: `${r.sender_patron_name} shared: "${r.note || 'Thought you might find this useful!'}"`,
        color: '#3B82F6',
        icon: 'thumb-up',
        target_screen: 'book-detail',
        target_id: r.biblio_id,
        timestamp: r.created_at,
        is_recommendation: true,
        author: r.author,
        sender_name: r.sender_patron_name,
        note: r.note,
        biblio_id: r.biblio_id,
      }));

      const combined = [
        ...formattedRecs,
        ...(Array.isArray(notifsData) ? notifsData : []),
      ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      setNotifications(combined);
      Notifications.setBadgeCountAsync(0).catch(() => {});
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleDelete = async (item) => {
    if (!session?.token) return;
    setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    try {
      if (item.is_recommendation && item.rawId) {
        await deleteRecommendation(session.token, item.rawId);
      } else {
        await deleteNotification(session.token, item.id);
      }
    } catch (e) {
      console.warn('Failed to delete notification:', e.message);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to dismiss all current notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const list = [...notifications];
            setNotifications([]);
            if (session?.token) {
              const keys = list.map((n) => n.id);
              await clearAllNotifications(session.token, keys).catch(() => {});
            }
            Notifications.setBadgeCountAsync(0).catch(() => {});
          },
        },
      ]
    );
  };

  const handlePressNotification = (item) => {
    if (item.target_screen === 'book-detail' && item.target_id) {
      router.push({ pathname: '/book-detail', params: { biblioId: item.target_id } });
    } else if (item.target_screen === 'profile' || item.target_screen === 'checkouts') {
      router.push('/profile');
    } else if (item.target_screen === 'dds-ill') {
      router.push('/dds-ill');
    } else if (item.target_screen === 'occupancy') {
      router.push('/library-occupancy');
    } else {
      router.push('/dashboard');
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'dds') return n.type === 'dds';
    if (filter === 'new_arrival') return n.type === 'new_arrival';
    if (filter === 'recommendation') return n.type === 'recommendation';
    if (filter === 'announcement') return n.type === 'announcement';
    return true;
  });

  const isDark = activeTheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090D16' : '#F8FAFC' }]}>
      {/* Header */}
      <View style={[styles.headerSafeArea, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderBottomColor: isDark ? '#1F2937' : '#E2E8F0', paddingTop: insets?.top || 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{t.notifications || 'Notifications'}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {notifications.length} {t.items || 'items'}
            </Text>
          </View>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>{t.clearAll || 'Clear All'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { borderBottomColor: isDark ? '#1F2937' : '#E2E8F0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
          {[
            { id: 'all', label: t.all || 'All' },
            { id: 'dds', label: 'ILL / DDS' },
            { id: 'new_arrival', label: 'New Arrivals' },
            { id: 'recommendation', label: t.recommendations || 'Recommendations' },
            { id: 'announcement', label: t.announcements || 'Announcements' },
          ].map((tabItem) => (
            <TouchableOpacity
              key={tabItem.id}
              onPress={() => setFilter(tabItem.id)}
              style={[
                styles.filterPill,
                filter === tabItem.id && { backgroundColor: theme.accent, borderColor: theme.accent },
                filter !== tabItem.id && { backgroundColor: isDark ? '#1E293B' : '#EDF2F7', borderColor: 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === tabItem.id && { color: '#FFFFFF', fontWeight: 'bold' },
                  filter !== tabItem.id && { color: theme.textSecondary },
                ]}
              >
                {tabItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.muted, { color: theme.textSecondary, marginTop: 12 }]}>Loading notifications…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <MaterialIcons name="notifications-none" size={48} color={theme.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                You are all caught up! ILL/DDS updates, new arrivals, due date alerts, and book recommendations will appear here.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => handlePressNotification(item)}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: isDark ? '#111827' : '#FFFFFF',
                    borderColor: isDark ? '#1F2937' : '#E2E8F0',
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: item.color ? `${item.color}20` : 'rgba(59,130,246,0.15)' },
                  ]}
                >
                  <MaterialIcons name={item.icon || 'notifications'} size={24} color={item.color || theme.accent} />
                </View>

                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={[styles.notifTitle, { color: theme.text, flex: 1 }]}>{item.title}</Text>
                    {item.is_recommendation && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${theme.accent}20` }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: theme.accent }}>Friend Rec</Text>
                      </View>
                    )}
                    {item.type === 'dds' && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: item.color ? `${item.color}20` : 'rgba(16,185,129,0.15)' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: item.color || '#10B981' }}>{item.status ? item.status.toUpperCase() : 'DDS'}</Text>
                      </View>
                    )}
                    {item.type === 'new_arrival' && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(139,92,246,0.15)' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#8B5CF6' }}>NEW ARRIVAL</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.notifMessage, { color: theme.textSecondary }]}>{item.message}</Text>
                  
                  {item.is_recommendation && item.author ? (
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Author: {item.author}</Text>
                  ) : null}

                  {/* Contextual Quick Actions */}
                  {item.type === 'dds' && item.download_url ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(item.download_url).catch(() => Alert.alert('Error', 'Could not open document link.'))}
                      style={{
                        marginTop: 8,
                        alignSelf: 'flex-start',
                        backgroundColor: '#10B981',
                        paddingVertical: 5,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MaterialIcons name="file-download" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>Download Document</Text>
                    </TouchableOpacity>
                  ) : item.type === 'dds' ? (
                    <TouchableOpacity
                      onPress={() => handlePressNotification(item)}
                      style={{
                        marginTop: 8,
                        alignSelf: 'flex-start',
                        backgroundColor: `${theme.accent}15`,
                        borderColor: theme.accent,
                        borderWidth: 1,
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>View DDS Request Status →</Text>
                    </TouchableOpacity>
                  ) : item.type === 'new_arrival' ? (
                    <TouchableOpacity
                      onPress={() => handlePressNotification(item)}
                      style={{
                        marginTop: 8,
                        alignSelf: 'flex-start',
                        backgroundColor: 'rgba(139,92,246,0.15)',
                        borderColor: '#8B5CF6',
                        borderWidth: 1,
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '700' }}>Check Availability & Rack Location →</Text>
                    </TouchableOpacity>
                  ) : item.is_recommendation ? (
                    <TouchableOpacity
                      onPress={() => handlePressNotification(item)}
                      style={{
                        marginTop: 8,
                        alignSelf: 'flex-start',
                        backgroundColor: theme.accent,
                        paddingVertical: 4,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>View Book Details →</Text>
                    </TouchableOpacity>
                  ) : null}

                  <Text style={[styles.notifTime, { color: isDark ? '#6B7280' : '#94A3B8', marginTop: 6 }]}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    {item.sent_by ? ` • ${item.sent_by}` : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
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
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  clearBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
    elevation: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  notifMessage: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11 },
  deleteBtn: { padding: 4 },
});
