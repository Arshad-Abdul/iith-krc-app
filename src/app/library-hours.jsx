import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

export default function LibraryHoursScreen() {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>KRC Opening Hours</Text>
      <View style={{ height: 20 }} />

      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.headerCell, { flex: 3 }]}>Name of the Service</Text>
          <Text style={[styles.cell, styles.headerCell, { flex: 2 }]}>Timings</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Monday to Friday</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.cell, { flex: 3 }]}>All Reading Areas</Text>
          <Text style={[styles.cell, styles.timingCell, { flex: 2 }]}>9:00 AM - 1:50 AM</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cell, { flex: 3 }]}>Ground Floor (after 1:50 AM)</Text>
          <Text style={[styles.cell, styles.timingCell, { flex: 2 }]}>24x5*</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cell, { flex: 3 }]}>Circulation Section</Text>
          <Text style={[styles.cell, styles.timingCell, { flex: 2 }]}>9:00 AM - 8:30 PM</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cell, { flex: 3 }]}>Learning commons (Lab-1)</Text>
          <Text style={[styles.cell, styles.timingCell, { flex: 2 }]}>9:00 AM - 11:00 PM</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cell, { flex: 3 }]}>Research Commons (Lab-2)</Text>
          <Text style={[styles.cell, styles.timingCell, { flex: 2 }]}>9:00 AM - 8:30 PM</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Weekend & Holidays</Text>
        </View>

        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={[styles.cell, { flex: 3 }]}>All Reading Areas</Text>
          <Text style={[styles.cell, styles.timingCell, { flex: 2 }]}>9:00 AM - 2:00 AM</Text>
        </View>
      </View>

      <View style={{ height: 20 }} />
      <Text style={styles.footerText}>
        *On every Saturday and Sunday library will be closed between 6:30 AM to 09:00 AM
      </Text>
    </ScrollView>
  );
}

const createStyles = (theme, activeTheme) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.accent },
    table: { 
      backgroundColor: theme.backgroundElement, 
      borderRadius: 12, 
      overflow: 'hidden', 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 5 }, 
      shadowOpacity: isDark ? 0.3 : 0.05, 
      shadowRadius: 10, 
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.backgroundSelected,
    },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected },
    headerRow: { backgroundColor: isDark ? theme.backgroundSelected : '#e8eaf6' },
    cell: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14, color: theme.text },
    headerCell: { fontWeight: 'bold', color: theme.accent, fontSize: 16 },
    timingCell: { color: theme.textSecondary },
    sectionHeader: { backgroundColor: isDark ? theme.backgroundSelected : '#5c6bc0', paddingVertical: 12, paddingHorizontal: 16 },
    sectionHeaderText: { color: isDark ? theme.text : 'white', fontWeight: 'bold', fontSize: 16 },
    footerText: { fontSize: 12, fontStyle: 'italic', color: theme.textSecondary },
  });
};
