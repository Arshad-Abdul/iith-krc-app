import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export const PATRON_CATEGORIES = [
  { id: 'ALL', label: 'All Readers' },
  { id: 'UG', label: 'Graduate Students (UG)' },
  { id: 'PG', label: 'Postgraduate Students (PG)' },
  { id: 'RS', label: 'Research Scholars / PDF' },
  { id: 'PS', label: 'Project Staff' },
  { id: 'STF', label: 'Staff' },
  { id: 'FAC', label: 'Faculty' },
  { id: 'O', label: 'Officers' },
  { id: 'LI', label: 'Library Interns' },
];

export default function CategoryDropdownModal({
  visible,
  onClose,
  onSelect,
  currentCategory,
  theme,
  activeTheme
}) {
  const isDark = activeTheme === 'dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            {PATRON_CATEGORIES.map((category) => {
              const isSelected = currentCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryRow,
                    isSelected && { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(32, 138, 239, 0.08)' }
                  ]}
                  onPress={() => {
                    if (typeof onSelect === 'function') {
                      onSelect(category.id);
                    }
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.categoryLabel, 
                    { color: isSelected ? theme.accent : theme.text },
                    isSelected && { fontWeight: 'bold' }
                  ]}>
                    {category.label}
                  </Text>
                  {isSelected && (
                    <MaterialIcons name="check" size={20} color={theme.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.05)',
  },
  categoryLabel: {
    fontSize: 16,
  },
});
