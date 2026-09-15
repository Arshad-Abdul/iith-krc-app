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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { getSession } from '../../services/session';
import {
  getOccupancy,
  getMyOccupancyStatus,
  checkInOccupancy,
  getCheckouts,
} from '../../services/kohaApi';
import { useTheme } from '../constants/ThemeContext';

export default function LibraryOccupancyScreen() {
  const { theme, activeTheme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('ground');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    const s = await getSession();
    if (!s?.token) {
      router.replace('/login');
      return;
    }
    setSession(s);
    try {
      const [occData, myStatus, coData] = await Promise.all([
        getOccupancy(),
        getMyOccupancyStatus(s.token),
        getCheckouts(s.token).catch(() => []),
      ]);
      setOccupancy(occData);
      setActiveSession(myStatus?.active_session || null);
      setBorrowedBooks(Array.isArray(coData) ? coData : []);
    } catch (e) {
      console.warn('Failed to load occupancy:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCheckIn = async (floorId) => {
    if (!session?.token) return;
    setProcessing(true);
    try {
      await checkInOccupancy(session.token, floorId);
      Alert.alert('Checked In', `Welcome to KRC! You are checked in at the library.`);
      loadData();
    } catch (err) {
      Alert.alert('Check-in Failed', err.message);
    } finally {
      setProcessing(false);
    }
  };

  const isDark = activeTheme === 'dark';

  const getDensityColor = (percentage) => {
    if (percentage > 85) return '#EF4444'; // Busy
    if (percentage > 55) return '#F59E0B'; // Moderate
    return '#10B981'; // Calm
  };

  const getDensityLabel = (percentage) => {
    if (percentage > 85) return 'Crowded / Limited Seats';
    if (percentage > 55) return 'Moderate Activity';
    return 'Plenty of Seats Available';
  };

  const formatElapsed = (checkinTime) => {
    if (!checkinTime) return '—';
    const diff = Math.max(0, Math.floor((Date.now() - new Date(checkinTime)) / 60000));
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090D16' : '#F8FAFC' }]}>
      {/* Header */}
      <View style={[styles.headerSafeArea, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderBottomColor: isDark ? '#1F2937' : '#E2E8F0', paddingTop: insets?.top || 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{t.liveOccupancy || 'Live Library Occupancy'}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {t.liveOccupancyDesc || 'Real-time seating density & digital turnstile gate'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
            <MaterialIcons name="refresh" size={20} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
        >
          {/* ── Gate-first 3-state check-in panel ─────────────────────────────── */}
          {activeSession && !activeSession.is_gate_only ? (
            // STATE 3: Checked in on a real floor — show "checked in" banner
            <View
              style={[
                styles.activeCard,
                { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: '#10B981' },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                  YOU ARE CURRENTLY CHECKED IN
                </Text>
              </View>
              <Text style={[styles.activeLocation, { color: theme.text }]}>
                {activeSession.floor_name || 'KRC Library'}
              </Text>
              <Text style={[styles.activeTimer, { color: theme.textSecondary }]}>
                Stay Duration: {formatElapsed(activeSession.checkin_time)} • Checked in at{' '}
                {new Date(activeSession.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.08)', padding: 12, borderRadius: 10, marginTop: 10 }}>
                <MaterialIcons name="door-sliding" size={20} color="#10B981" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1, lineHeight: 17 }}>
                  To check out, scan your ID card at the physical KRC Exit Kiosk Gate when leaving the library.
                </Text>
              </View>
            </View>

          ) : activeSession && activeSession.is_gate_only ? (
            // STATE 2: Gate scan detected but no floor selected yet — show floor picker
            <View
              style={[
                styles.checkinCard,
                { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: '#10B981', borderWidth: 1.5 },
              ]}
            >
              {/* Gate detected badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, alignSelf: 'flex-start' }}>
                <View style={[styles.pulseDot, { backgroundColor: '#10B981', marginRight: 6 }]} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>
                  KIOSK GATE SCAN DETECTED
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialIcons name="meeting-room" size={22} color={theme.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.checkinCardTitle, { color: theme.text }]}>
                  Which floor are you on?
                </Text>
              </View>
              <Text style={[styles.checkinCardSubtitle, { color: theme.textSecondary }]}>
                {"You're in the building! Optionally tell us which floor you're sitting on:"}
              </Text>

              <View style={styles.floorPickerRow}>
                {occupancy?.floors?.map((f) => (
                  <TouchableOpacity
                    key={f.floor_id}
                    onPress={() => setSelectedFloor(f.floor_id)}
                    style={[
                      styles.floorChip,
                      selectedFloor === f.floor_id && { backgroundColor: theme.accent, borderColor: theme.accent },
                      selectedFloor !== f.floor_id && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#374151' : '#CBD5E1' },
                    ]}
                  >
                    <Text
                      style={[styles.floorChipText, { color: selectedFloor === f.floor_id ? '#FFFFFF' : theme.text }]}
                      numberOfLines={1}
                    >
                      {f.floor_name ? f.floor_name.split('(')[0].trim() : 'Unknown'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => handleCheckIn(selectedFloor)}
                disabled={processing}
                style={[styles.checkinBtn, { backgroundColor: theme.accent }]}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.checkinBtnText}>Confirm My Floor</Text>
                )}
              </TouchableOpacity>
            </View>

          ) : (
            // STATE 1: No gate session — show locked state (view only)
            <View
              style={[
                styles.checkinCard,
                { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E2E8F0' },
              ]}
            >
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MaterialIcons name="sensors-off" size={26} color={isDark ? '#64748B' : '#94A3B8'} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 6 }}>
                  Not Checked In
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 }}>
                  To use the digital floor tracker, scan your ID card at the{' '}
                  <Text style={{ fontWeight: '700', color: theme.text }}>physical KRC Kiosk Gate</Text>{' '}
                  when entering the library.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? '#374151' : '#E2E8F0' }}>
                  <MaterialIcons name="qr-code-scanner" size={16} color={isDark ? '#64748B' : '#94A3B8'} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', fontWeight: '600' }}>
                    Gate scan required to unlock floor selection
                  </Text>
                </View>
              </View>
            </View>
          )}
          {/* ────────────────────────────────────────────────────────────────── */}

          {/* Overall Meter */}
          <View
            style={[
              styles.meterCard,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#1F2937' : '#E2E8F0' },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.meterTitle, { color: theme.text }]}>Overall Building Occupancy</Text>
              <View
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor: `${getDensityColor(occupancy?.overall?.percentage || 0)}20`,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: getDensityColor(occupancy?.overall?.percentage || 0) }}>
                  {occupancy?.overall?.percentage || 0}% Full
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, occupancy?.overall?.percentage || 0)}%`,
                    backgroundColor: getDensityColor(occupancy?.overall?.percentage || 0),
                  },
                ]}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={[styles.statItem, { color: theme.textSecondary }]}>
                Occupied:{' '}
                <Text style={{ fontWeight: '700', color: theme.text }}>
                  {occupancy?.overall?.total_occupants || 0}
                </Text>
              </Text>
              <Text style={[styles.statItem, { color: theme.textSecondary }]}>
                Available Seats:{' '}
                <Text style={{ fontWeight: '700', color: '#10B981' }}>
                  {occupancy?.overall?.available_capacity || 0}
                </Text>
              </Text>
              <Text style={[styles.statItem, { color: theme.textSecondary }]}>
                Capacity:{' '}
                <Text style={{ fontWeight: '700', color: theme.text }}>
                  {occupancy?.overall?.total_capacity || 0}
                </Text>
              </Text>
            </View>

            <Text style={[styles.densitySub, { color: getDensityColor(occupancy?.overall?.percentage || 0) }]}>
              ● {getDensityLabel(occupancy?.overall?.percentage || 0)}
            </Text>
          </View>

          {/* Floor-by-Floor Cards */}
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>FLOOR BREAKDOWN</Text>

          {occupancy?.floors?.map((f) => {
            const color = getDensityColor(f.percentage);
            return (
              <View
                key={f.floor_id}
                style={[
                  styles.floorCard,
                  { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#1F2937' : '#E2E8F0' },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.floorName, { color: theme.text }]}>{f.floor_name}</Text>
                  <Text style={[styles.floorPercentage, { color }]}>{f.percentage}%</Text>
                </View>

                {f.description ? (
                  <Text style={[styles.floorDesc, { color: theme.textSecondary }]}>{f.description}</Text>
                ) : null}

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', height: 8, marginVertical: 8 }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, f.percentage)}%`, backgroundColor: color },
                    ]}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Available:{' '}
                    <Text style={{ fontWeight: '700', color: '#10B981' }}>{f.available_seats} seats</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Capacity: {f.total_seats}
                  </Text>
                </View>
              </View>
            );
          })}
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  activeCard: { padding: 18, borderRadius: 16, borderWidth: 1.5, marginBottom: 16 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  activeLocation: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  activeTimer: { fontSize: 13, marginBottom: 4 },
  checkinCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  checkinCardTitle: { fontSize: 16, fontWeight: '700' },
  checkinCardSubtitle: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  floorPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  floorChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  floorChipText: { fontSize: 12, fontWeight: '600' },
  checkinBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  checkinBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  meterCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  meterTitle: { fontSize: 16, fontWeight: '700' },
  progressTrack: { width: '100%', height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  statItem: { fontSize: 12 },
  densitySub: { fontSize: 12, fontWeight: '600', marginTop: 10 },
  sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  floorCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  floorName: { fontSize: 14, fontWeight: '700' },
  floorPercentage: { fontSize: 14, fontWeight: '700' },
  floorDesc: { fontSize: 11, marginTop: 2 },
});
