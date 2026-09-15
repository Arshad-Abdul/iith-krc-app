import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SearchTypeModal({
  isTypeModalVisible,
  setIsTypeModalVisible,
  searchTypes,
  searchType,
  setSearchType,
  theme,
  styles,
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isTypeModalVisible}
      onRequestClose={() => setIsTypeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sourceModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search By</Text>
            <TouchableOpacity onPress={() => setIsTypeModalVisible(false)} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.sourceOptionsList}>
            {searchTypes.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sourceOptionItem,
                  searchType === opt.value && styles.sourceOptionItemActive
                ]}
                onPress={() => {
                  setSearchType(opt.value);
                  setIsTypeModalVisible(false);
                }}
              >
                <View style={{ flex: 1, paddingVertical: 4 }}>
                  <Text style={[
                    styles.sourceItemName,
                    searchType === opt.value && styles.sourceItemNameActive
                  ]}>{opt.label}</Text>
                </View>
                {searchType === opt.value && (
                  <MaterialIcons name="check" size={20} color={theme.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
