import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../constants/ThemeContext';

const PRESETS = [
  { id: 'paper', label: 'Research Paper', pages: 30, icon: 'article' },
  { id: 'chapter', label: 'Book Chapter', pages: 60, icon: 'menu-book' },
  { id: 'textbook', label: 'Full Textbook', pages: 320, icon: 'auto-stories' },
  { id: 'custom', label: 'Custom', pages: 200, icon: 'tune' },
];

export default function ReadingSpeedTimer({ initialPages = 300, theme: propTheme }) {
  const { theme: ctxTheme, activeTheme, t } = useTheme();
  const theme = propTheme || ctxTheme;
  const isDark = activeTheme === 'dark';

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pagesRead, setPagesRead] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('textbook');
  const [totalPages, setTotalPages] = useState('320');
  const [ppm, setPpm] = useState(0.5); // Default: 0.5 pages per minute
  const [totalSessionsLogged, setTotalSessionsLogged] = useState(0);
  const [lastSessionPpm, setLastSessionPpm] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    // Load saved metrics
    AsyncStorage.getItem('krc_reading_speed_ppm').then((val) => {
      if (val) setPpm(parseFloat(val));
    });
    AsyncStorage.getItem('krc_reading_sessions_count').then((val) => {
      if (val) setTotalSessionsLogged(parseInt(val, 10));
    });
  }, []);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.id);
    setTotalPages(String(preset.pages));
  };

  const currentPagesNum = Math.max(parseFloat(totalPages) || 1, 1);
  const currentPpm = Math.max(ppm || 0.5, 0.1);
  const estimatedTotalMinutes = Math.round(currentPagesNum / currentPpm);
  const estimatedHours = Math.floor(estimatedTotalMinutes / 60);
  const estimatedRemainingMins = estimatedTotalMinutes % 60;

  const startSession = () => {
    setIsActive(true);
    setIsPaused(false);
    setSeconds(0);
    setPagesRead('');
  };

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const cancelSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setIsPaused(false);
    setSeconds(0);
    setPagesRead('');
  };

  const finishSession = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const pages = parseInt(pagesRead, 10);
    if (!isNaN(pages) && pages > 0 && seconds >= 10) {
      const minutes = Math.max(seconds / 60, 0.1);
      const sessionSpeed = Math.round((pages / minutes) * 100) / 100;
      
      // Moving average
      const updatedPpm = Math.round(((currentPpm * 2 + sessionSpeed) / 3) * 100) / 100;
      setPpm(updatedPpm);
      setLastSessionPpm(sessionSpeed);
      
      const newCount = totalSessionsLogged + 1;
      setTotalSessionsLogged(newCount);

      await AsyncStorage.setItem('krc_reading_speed_ppm', String(updatedPpm));
      await AsyncStorage.setItem('krc_reading_sessions_count', String(newCount));

      const message = `Pace logged at ${sessionSpeed} pages/min (${Math.round(sessionSpeed * 60)} pages/hour). Your updated academic average is ${updatedPpm} pages/min.`;
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Reading Session Logged!', message);
      }
    } else if (isNaN(pages) || pages <= 0) {
      const message = 'Please enter how many pages you completed during this session.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Enter Pages', message);
      return;
    }

    setIsActive(false);
    setIsPaused(false);
    setSeconds(0);
    setPagesRead('');
  };

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${hrs}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
        },
      ]}
    >
      {/* Header Badge & Title */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.badge, { backgroundColor: `${theme.accent}14` }]}>
            <MaterialIcons name="speed" size={13} color={theme.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: theme.accent }]}>STUDY UTILITY</Text>
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t.readingSpeedTracker || 'Reading Speed & Pacing Tracker'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Calculate reading pace, calibrate comprehension speed, and estimate completion time.
          </Text>
        </View>

        <View style={[styles.heroIconBox, { backgroundColor: `${theme.accent}12` }]}>
          <MaterialIcons name="timer" size={26} color={theme.accent} />
        </View>
      </View>

      {/* Metrics Row */}
      <View style={[styles.metricGrid, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>YOUR PACE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text style={[styles.metricValue, { color: theme.text }]}>{currentPpm}</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>pg/min</Text>
          </View>
          <Text style={[styles.metricSub, { color: theme.textSecondary }]}>
            ~{Math.round(currentPpm * 60)} pages/hr
          </Text>
        </View>

        <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]} />

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>EST. COMPLETION</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text style={[styles.metricValue, { color: theme.accent }]}>
              {estimatedHours > 0 ? `${estimatedHours}h ${estimatedRemainingMins}m` : `${estimatedRemainingMins}m`}
            </Text>
          </View>
          <Text style={[styles.metricSub, { color: theme.textSecondary }]}>
            For {currentPagesNum} total pages
          </Text>
        </View>

        <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]} />

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>SESSIONS</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>{totalSessionsLogged}</Text>
          <Text style={[styles.metricSub, { color: theme.textSecondary }]}>Calibrated</Text>
        </View>
      </View>

      {/* Presets / Target Selector */}
      {!isActive && (
        <View style={styles.targetSection}>
          <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
            Select or customize reading target:
          </Text>
          <View style={styles.presetsRow}>
            {PRESETS.map((p) => {
              const isSel = selectedPreset === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => handleSelectPreset(p)}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: isSel
                        ? `${theme.accent}14`
                        : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : '#FFFFFF',
                      borderColor: isSel ? theme.accent : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={p.icon}
                    size={15}
                    color={isSel ? theme.accent : theme.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.presetText,
                      { color: isSel ? theme.accent : theme.text, fontWeight: isSel ? '700' : '500' },
                    ]}
                  >
                    {p.label} ({p.pages}p)
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom pages input if custom is selected */}
          {selectedPreset === 'custom' && (
            <View style={styles.customInputRow}>
              <Text style={[styles.customInputLabel, { color: theme.textSecondary }]}>Custom Page Target:</Text>
              <TextInput
                style={[
                  styles.customInput,
                  {
                    color: theme.text,
                    borderColor: theme.accent,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                  },
                ]}
                value={totalPages}
                onChangeText={setTotalPages}
                keyboardType="number-pad"
                placeholder="Pages"
                placeholderTextColor={theme.textSecondary}
              />
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>pages</Text>
            </View>
          )}
        </View>
      )}

      {/* Active Session Console */}
      {isActive ? (
        <View
          style={[
            styles.activeSessionBox,
            {
              backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
              borderColor: 'rgba(239,68,68,0.25)',
            },
          ]}
        >
          {/* Status Indicator */}
          <View style={styles.activeStatusRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={[
                  styles.pulseDot,
                  { backgroundColor: isPaused ? '#F59E0B' : '#EF4444' },
                ]}
              />
              <Text
                style={[
                  styles.activeStatusText,
                  { color: isPaused ? '#F59E0B' : '#EF4444' },
                ]}
              >
                {isPaused ? 'SESSION PAUSED' : 'RECORDING FOCUS SESSION'}
              </Text>
            </View>

            <TouchableOpacity onPress={cancelSession} style={styles.cancelBtn}>
              <MaterialIcons name="close" size={16} color={theme.textSecondary} />
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 2 }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Digital Clock */}
          <View style={styles.clockContainer}>
            <Text style={[styles.clockDigits, { color: theme.text }]}>
              {formatTimer(seconds)}
            </Text>
          </View>

          {/* Input & Controls */}
          <View style={styles.finishFormRow}>
            <TextInput
              style={[
                styles.pagesReadInput,
                {
                  color: theme.text,
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
                },
              ]}
              placeholder="Pages completed..."
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              value={pagesRead}
              onChangeText={setPagesRead}
            />

            <TouchableOpacity
              onPress={togglePause}
              style={[
                styles.pauseBtn,
                {
                  backgroundColor: isPaused ? `${theme.accent}18` : isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  borderColor: isPaused ? theme.accent : isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                },
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isPaused ? 'play-arrow' : 'pause'}
                size={18}
                color={isPaused ? theme.accent : theme.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={finishSession}
              style={[styles.finishBtn, { backgroundColor: '#10B981' }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.finishBtnText}>Save & Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Standby Trigger Button */
        <TouchableOpacity
          onPress={startSession}
          style={[styles.startSessionBtn, { backgroundColor: theme.accent }]}
          activeOpacity={0.85}
        >
          <MaterialIcons name="play-circle-filled" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.startSessionBtnText}>{t.startSession || 'Start Timed Reading Session'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 36,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  metricSub: {
    fontSize: 10,
    marginTop: 2,
  },
  targetSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  customInputLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  customInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
  },
  startSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  startSessionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  activeSessionBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 14,
  },
  clockDigits: {
    fontSize: 38,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 3,
  },
  finishFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pagesReadInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  pauseBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
