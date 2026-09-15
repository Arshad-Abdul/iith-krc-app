import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

export default function YearlyGoalsCard({ finishedCount, theme }) {
  const [goal, setGoal] = useState(12);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState('12');

  useEffect(() => {
    AsyncStorage.getItem('krc_yearly_reading_goal').then((val) => {
      if (val) {
        setGoal(parseInt(val, 10));
        setTempGoal(val);
      }
    });
  }, []);

  const saveGoal = async () => {
    const parsed = parseInt(tempGoal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setGoal(parsed);
      await AsyncStorage.setItem('krc_yearly_reading_goal', String(parsed));
    }
    setIsEditing(false);
  };

  const percentage = Math.min(Math.round((finishedCount / goal) * 100), 100);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <MaterialIcons name="emoji-events" size={22} color="#FBBF24" />
          <Text style={[styles.title, { color: theme.text }]}>Yearly Reading Goal</Text>
        </View>
        
        {isEditing ? (
          <TouchableOpacity onPress={saveGoal} style={styles.editBtn}>
            <Text style={{ color: theme.accent, fontWeight: 'bold', fontSize: 13 }}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editBtn}>
            <MaterialIcons name="edit" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {isEditing ? (
          <View style={styles.editInputRow}>
            <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>Set your goal for 2026: </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.accent }]}
              keyboardType="number-pad"
              value={tempGoal}
              onChangeText={setTempGoal}
              autoFocus
            />
          </View>
        ) : (
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            You finished <Text style={{ color: theme.text, fontWeight: 'bold' }}>{finishedCount}</Text> of{' '}
            <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{goal}</Text> books this year!
          </Text>
        )}

        {/* Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: theme.accent }]} />
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.percentageText, { color: theme.accent }]}>{percentage}% Completed</Text>
          <TouchableOpacity
            onPress={() => router.push('/tools')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <MaterialIcons name="timer" size={13} color={theme.accent} />
            <Text style={{ fontSize: 12, color: theme.accent, fontWeight: '600' }}>Speed Tracker →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  editBtn: {
    padding: 4,
  },
  content: {
    marginTop: 2,
  },
  progressText: {
    fontSize: 13,
    marginBottom: 12,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 13,
  },
  input: {
    width: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
