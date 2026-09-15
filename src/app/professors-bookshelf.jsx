import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { getProfessorShelves, createProfessorShelf, deleteProfessorShelf, addBookToProfessorShelf, deleteBookFromProfessorShelf } from '../../services/kohaApi';
import { getSession } from '../../services/session';
import { searchBooks } from '../../services/webopacApi';

export default function ProfessorsBookshelf() {
  const { theme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const [shelves, setShelves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Creation State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Book State
  const [isAddBookModalVisible, setIsAddBookModalVisible] = useState(false);
  const [selectedShelfId, setSelectedShelfId] = useState(null);
  const [biblioIdToAdd, setBiblioIdToAdd] = useState('');
  const [bookTitleToAdd, setBookTitleToAdd] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchBooks = async (query) => {
    setBookTitleToAdd(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchBooks(query, { limit: 5 });
      setSearchResults(res.books || []);
    } catch(e) {
      console.warn(e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectBook = (book) => {
    setBiblioIdToAdd(String(book.biblio_id));
    setBookTitleToAdd(book.title);
    setSearchResults([]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [shelvesData, sessionData] = await Promise.all([
        getProfessorShelves(),
        getSession().catch(() => null)
      ]);
      setShelves(shelvesData || []);
      setSession(sessionData);
    } catch (err) {
      console.warn("Could not load bookshelves:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShelf = async () => {
    if (!title.trim()) {
      alert("Please enter a bookshelf title.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createProfessorShelf(session.token, { title: title.trim(), description: description.trim() });
      setTitle('');
      setDescription('');
      setIsModalVisible(false);
      await loadData();
      alert("Bookshelf created successfully!");
    } catch (err) {
      alert(err.message || "Failed to create bookshelf.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShelf = async (shelfId) => {
    try {
      await deleteProfessorShelf(session.token, shelfId);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to delete bookshelf.");
    }
  };

  const handleAddBook = async () => {
    if (!biblioIdToAdd) {
      alert("Please select a book first.");
      return;
    }
    setIsSubmitting(true);
    try {
      await addBookToProfessorShelf(session.token, selectedShelfId, biblioIdToAdd);
      setIsAddBookModalVisible(false);
      setBiblioIdToAdd('');
      setBookTitleToAdd('');
      await loadData();
      alert("Book added to shelf!");
    } catch (err) {
      alert(err.message || "Failed to add book.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async (shelfId, biblioId) => {
    try {
      await deleteBookFromProfessorShelf(session.token, shelfId, biblioId);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to remove book.");
    }
  };

  const openAddBookModal = (shelfId) => {
    setSelectedShelfId(shelfId);
    setBiblioIdToAdd('');
    setBookTitleToAdd('');
    setSearchResults([]);
    setIsAddBookModalVisible(true);
  };

  const renderShelf = ({ item }) => {
    const isOwner = session?.patron?.borrowernumber && item.owner_id === session.patron.borrowernumber;

    return (
      <View style={styles.shelfCard}>
        <View style={styles.shelfHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shelfTitle}>{item.title}</Text>
            {item.description ? <Text style={styles.shelfDesc}>{item.description}</Text> : null}
            <View style={styles.ownerBadge}>
              <MaterialIcons name="school" size={14} color={theme.accent} />
              <Text style={styles.ownerText}>Curated by Prof. {item.owner_name || 'Faculty Member'}</Text>
            </View>
          </View>
          {isOwner && (
            <TouchableOpacity onPress={() => handleDeleteShelf(item.id)} style={styles.deleteShelfBtn}>
              <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Shelf Books Horizontal Scroll */}
        <View style={styles.booksRow}>
          <View style={styles.booksRowHeader}>
            <Text style={styles.booksCountText}>{(item.books || []).length} Recommended Readings</Text>
            {isOwner && (
              <TouchableOpacity onPress={() => openAddBookModal(item.id)} style={styles.addBookBtn}>
                <MaterialIcons name="add" size={16} color={theme.accent} />
                <Text style={styles.addBookBtnText}>Add Book</Text>
              </TouchableOpacity>
            )}
          </View>

          {(!item.books || item.books.length === 0) ? (
            <Text style={styles.emptyShelfText}>No books added to this bookshelf yet.</Text>
          ) : (
            item.books.map((b) => (
              <View key={b.biblio_id} style={styles.bookItem}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => router.push({ pathname: '/book-detail', params: { biblioId: b.biblio_id } })}
                >
                  <MaterialIcons name="menu-book" size={20} color={theme.accent} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookTitle} numberOfLines={1}>{b.title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>{b.author || 'Unknown'}</Text>
                  </View>
                </TouchableOpacity>
                {isOwner && (
                  <TouchableOpacity onPress={() => handleDeleteBook(item.id, b.biblio_id)} style={{ padding: 6 }}>
                    <MaterialIcons name="close" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  const isFaculty = session?.patron?.categorycode?.toUpperCase().includes('F') || session?.patron?.categorycode === 'FAC' || session?.patron?.categorycode === 'FA';

  return (
    <View style={styles.container}>
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.professorsBookshelf || "Professor's Bookshelf"}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={shelves}
          renderItem={renderShelf}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t.noProfessorBookshelves || 'No professor bookshelves recommended yet.'}</Text>
          }
        />
      )}

      {isFaculty && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Add Book Modal */}
      <Modal visible={isAddBookModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Book to Shelf</Text>
              <TouchableOpacity onPress={() => setIsAddBookModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={{fontSize: 12, color: theme.textSecondary, marginBottom: 8}}>Search for a book to add to your shelf:</Text>
            <TextInput
              style={styles.input}
              placeholder="Search Book Title..."
              placeholderTextColor={theme.textSecondary}
              value={bookTitleToAdd}
              onChangeText={handleSearchBooks}
            />
            
            {isSearching && <ActivityIndicator size="small" color={theme.accent} style={{marginBottom: 16}} />}
            
            {searchResults.length > 0 && (
              <View style={{maxHeight: 150, backgroundColor: theme.backgroundCard, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden'}}>
                {searchResults.map(b => (
                  <TouchableOpacity key={b.biblio_id} style={{padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border}} onPress={() => selectBook(b)}>
                    <Text style={{color: theme.text, fontSize: 13, fontWeight: 'bold'}} numberOfLines={1}>{b.title}</Text>
                    {b.author ? <Text style={{color: theme.textSecondary, fontSize: 11}} numberOfLines={1}>{b.author}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
              <View style={{flex: 1, height: 1, backgroundColor: theme.border}} />
              <Text style={{color: theme.textSecondary, fontSize: 12, marginHorizontal: 8}}>OR ENTER MANUALLY</Text>
              <View style={{flex: 1, height: 1, backgroundColor: theme.border}} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Biblio ID (e.g., 12345)..."
              placeholderTextColor={theme.textSecondary}
              value={biblioIdToAdd}
              onChangeText={setBiblioIdToAdd}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddBook}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Add Book</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Bookshelf Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recommend Reading List</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={{fontSize: 12, color: theme.textSecondary, marginBottom: 12, fontStyle: 'italic'}}>Note: You can add specific books to this reading list right after creating it.</Text>

            <TextInput
              style={styles.input}
              placeholder="List Title (e.g., CS3020 References)..."
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Description or notes for students..."
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateShelf}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Publish Bookshelf</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme, insets, cardWidth) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.primary },
    headerSafeArea: { backgroundColor: theme.primary, paddingTop: insets?.top || 0 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      height: 56, paddingHorizontal: 12,
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
    listContent: { padding: 16, paddingBottom: 100 },
    emptyText: { textAlign: 'center', marginTop: 40, color: theme.textSecondary, fontSize: 14 },
    shelfCard: {
      backgroundColor: theme.backgroundCard, borderRadius: 12, padding: 16, marginBottom: 16,
      borderWidth: 1, borderColor: theme.border,
    },
    shelfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    shelfTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    shelfAuthor: { fontSize: 12, color: theme.accent, marginTop: 4, fontWeight: '500' },
    shelfDesc: { fontSize: 13, color: theme.textSecondary, marginTop: 8, lineHeight: 18 },
    booksContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
    booksHeading: { fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 6 },
    emptyBooksText: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' },
    bookRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    bookTitle: { fontSize: 13, color: theme.text, fontWeight: '500' },
    bookAuthorLabel: { fontSize: 12, color: theme.textSecondary },
    fab: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
      borderRadius: 28, backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center',
      boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
      elevation: 5,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: theme.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 24, paddingBottom: 40,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
    input: {
      borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12,
      color: theme.text, fontSize: 14, marginBottom: 16, backgroundColor: theme.backgroundInput,
    },
    submitBtn: {
      backgroundColor: theme.accent, padding: 14, borderRadius: 8, alignItems: 'center',
    },
    submitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  });
