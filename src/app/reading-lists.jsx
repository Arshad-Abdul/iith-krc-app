import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { getWishlist } from '../../services/wishlist';

export default function ReadingListsScreen() {
  const { theme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [wishlist, setWishlist] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  useEffect(() => {
    loadFolders();
    getWishlist().then(setWishlist).catch(() => {});
  }, []);

  const loadFolders = async () => {
    try {
      const raw = await AsyncStorage.getItem('krc_reading_lists_folders');
      setFolders(raw ? JSON.parse(raw) : [
        { id: '1', name: 'Semester 5 Prep', books: [] },
        { id: '2', name: 'Machine Learning Project', books: [] }
      ]);
    } catch {}
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newFolder = {
        id: String(Date.now()),
        name: newFolderName.trim(),
        books: []
      };
      const updated = [...folders, newFolder];
      setFolders(updated);
      await AsyncStorage.setItem('krc_reading_lists_folders', JSON.stringify(updated));
      setNewFolderName('');
      setIsCreating(false);
    } catch {}
  };

  const deleteFolder = async (id) => {
    try {
      const updated = folders.filter(f => f.id !== id);
      setFolders(updated);
      await AsyncStorage.setItem('krc_reading_lists_folders', JSON.stringify(updated));
      if (selectedFolderId === id) setSelectedFolderId(null);
    } catch {}
  };

  const addBookToFolder = async (folderId, book) => {
    try {
      const updated = folders.map(f => {
        if (f.id === folderId) {
          // Prevent duplicates
          if (f.books.some(b => Number(b.biblio_id) === Number(book.biblio_id))) {
            return f;
          }
          return { ...f, books: [...f.books, book] };
        }
        return f;
      });
      setFolders(updated);
      await AsyncStorage.setItem('krc_reading_lists_folders', JSON.stringify(updated));
      alert(`Added to folder successfully!`);
    } catch {}
  };

  const removeBookFromFolder = async (folderId, biblioId) => {
    try {
      const updated = folders.map(f => {
        if (f.id === folderId) {
          return { ...f, books: f.books.filter(b => Number(b.biblio_id) !== Number(biblioId)) };
        }
        return f;
      });
      setFolders(updated);
      await AsyncStorage.setItem('krc_reading_lists_folders', JSON.stringify(updated));
    } catch {}
  };

  const activeFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {/* Header */}
      <View style={[styles.headerSafeArea, { backgroundColor: theme.primary, paddingTop: insets?.top || 0 }]}>
        <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t.readingLists || 'Reading Lists'}</Text>
          <TouchableOpacity onPress={() => setIsCreating(true)} style={styles.addFolderBtn}>
            <MaterialIcons name="create-new-folder" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body}>
        {/* Create Folder Modal Inline */}
        {isCreating && (
          <View style={[styles.createCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>New Folder Name</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.accent }]}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="e.g. Thesis Reference..."
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => setIsCreating(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#EF4444' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createFolder} style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Folders Accordion List */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Folders</Text>
        {folders.map(folder => (
          <View key={folder.id} style={[styles.folderCard, { backgroundColor: theme.backgroundElement }]}>
            <TouchableOpacity 
              style={styles.folderHeader} 
              onPress={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
            >
              <View style={styles.folderTitleGroup}>
                <MaterialIcons name="folder" size={24} color="#FBBF24" />
                <Text style={[styles.folderName, { color: theme.text }]}>{folder.name}</Text>
                <Text style={[styles.countTag, { color: theme.textSecondary }]}>({folder.books.length} books)</Text>
              </View>
              <View style={styles.folderActionGroup}>
                <TouchableOpacity onPress={() => deleteFolder(folder.id)} style={{ padding: 4 }}>
                  <MaterialIcons name="delete" size={18} color="#EF4444" />
                </TouchableOpacity>
                <MaterialIcons 
                  name={selectedFolderId === folder.id ? "expand-less" : "expand-more"} 
                  size={24} 
                  color={theme.textSecondary} 
                />
              </View>
            </TouchableOpacity>

            {selectedFolderId === folder.id && (
              <View style={styles.folderDetailContent}>
                {folder.books.length === 0 ? (
                  <Text style={[styles.emptyFolderText, { color: theme.textSecondary }]}>
                    No books in this folder yet. Assign wishlisted books below!
                  </Text>
                ) : (
                  folder.books.map(book => (
                    <View key={book.biblio_id} style={styles.bookRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={1}>
                          {book.title}
                        </Text>
                        <Text style={[styles.bookAuthor, { color: theme.textSecondary }]} numberOfLines={1}>
                          {book.author || 'Unknown'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeBookFromFolder(folder.id, book.biblio_id)} style={{ padding: 6 }}>
                        <MaterialIcons name="remove-circle-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {/* Add Book Selector list from Wishlist */}
                {wishlist.length > 0 && (
                  <View style={styles.wishlistSelectorSection}>
                    <Text style={[styles.selectorTitle, { color: theme.text }]}>Add from your Saved Books:</Text>
                    {wishlist.map(book => {
                      const alreadyIn = folder.books.some(b => Number(b.biblio_id) === Number(book.biblio_id));
                      return (
                        <TouchableOpacity 
                          key={book.biblio_id} 
                          disabled={alreadyIn}
                          style={[styles.selectorItem, { borderBottomColor: 'rgba(255,255,255,0.05)' }]} 
                          onPress={() => addBookToFolder(folder.id, book)}
                        >
                          <Text style={[styles.selectorBookName, { color: alreadyIn ? theme.textSecondary : theme.text }]} numberOfLines={1}>
                            {book.title}
                          </Text>
                          <MaterialIcons 
                            name={alreadyIn ? "check" : "add-circle"} 
                            size={20} 
                            color={alreadyIn ? '#10B981' : theme.accent} 
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSafeArea: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  addFolderBtn: {
    padding: 8,
  },
  body: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  createCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelBtn: {
    padding: 8,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  folderCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  folderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  countTag: {
    fontSize: 12,
  },
  folderActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderDetailContent: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  emptyFolderText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  bookAuthor: {
    fontSize: 11,
    marginTop: 2,
  },
  wishlistSelectorSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  selectorTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  selectorBookName: {
    flex: 1,
    fontSize: 13,
    marginRight: 10,
  },
});
