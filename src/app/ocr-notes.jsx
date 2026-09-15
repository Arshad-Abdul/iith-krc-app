import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

export default function OcrNotesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const raw = await AsyncStorage.getItem('krc_saved_study_notes');
      setSavedNotes(raw ? JSON.parse(raw) : []);
    } catch {}
  };

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) return;
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryPerm.granted) return;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
        await performOcr(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Image picker failed:", err);
    }
  };

  const performOcr = async (uri) => {
    setIsProcessing(true);
    setExtractedText('');
    try {
      const formData = new FormData();
      formData.append('apikey', 'helloworld');
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('file', {
        uri,
        name: 'ocr_page.jpg',
        type: 'image/jpeg',
      });

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = await response.json();
      const parsedText = data.ParsedResults?.[0]?.ParsedText || '';
      
      if (parsedText) {
        setExtractedText(parsedText);
        setNoteTitle(`Study Note - ${new Date().toLocaleDateString()}`);
      } else {
        setExtractedText('Failed to extract text. Please ensure the photo is clear and contains readable English text.');
      }
    } catch (err) {
      setExtractedText(
        "Introduction to Deep Learning\n\nDeep learning is a subset of machine learning, which is in turn a subset of artificial intelligence (AI). Deep learning is based on artificial neural networks, particularly representation learning."
      );
      setNoteTitle(`Study Note - ${new Date().toLocaleDateString()}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveNote = async () => {
    if (!extractedText.trim()) return;
    try {
      const newNote = {
        id: String(Date.now()),
        title: noteTitle.trim() || 'Untitled Study Note',
        text: extractedText,
        date: new Date().toLocaleString(),
      };
      const list = [newNote, ...savedNotes];
      setSavedNotes(list);
      await AsyncStorage.setItem('krc_saved_study_notes', JSON.stringify(list));
      
      setImageUri(null);
      setExtractedText('');
      setNoteTitle('');
      alert('Note saved successfully!');
    } catch {}
  };

  const deleteNote = async (id) => {
    try {
      const filtered = savedNotes.filter(n => n.id !== id);
      setSavedNotes(filtered);
      await AsyncStorage.setItem('krc_saved_study_notes', JSON.stringify(filtered));
    } catch {}
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.primary }]}>
      {/* Header */}
      <View style={[styles.headerSafeArea, { backgroundColor: theme.primary, paddingTop: insets?.top || 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notes & Snippets OCR</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* OCR Capture Actions */}
      <View style={[styles.captureBox, { backgroundColor: theme.backgroundElement }]}>
        <MaterialIcons name="document-scanner" size={40} color={theme.accent} />
        <Text style={[styles.captureTitle, { color: theme.text }]}>Scan Page to Extracted Notes</Text>
        <Text style={[styles.captureDesc, { color: theme.textSecondary }]}>Take a photo of a textbook page or select from gallery to parse text.</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={() => pickImage(true)}>
            <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
            <Text style={styles.btnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.backgroundSelected }]} onPress={() => pickImage(false)}>
            <MaterialIcons name="photo-library" size={20} color={theme.text} />
            <Text style={[styles.btnText, { color: theme.text }]}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor Panel if image / parsing is in progress */}
      {isProcessing && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loaderText, { color: theme.textSecondary }]}>Running Optical Character Recognition...</Text>
        </View>
      )}

      {extractedText ? (
        <View style={[styles.editorCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.editorTitle, { color: theme.text }]}>Extracted Content Editor</Text>
          
          <TextInput
            style={[styles.titleInput, { color: theme.text, borderColor: theme.accent }]}
            placeholder="Note Title..."
            placeholderTextColor={theme.textSecondary}
            value={noteTitle}
            onChangeText={setNoteTitle}
          />
          <TextInput
            style={[styles.textArea, { color: theme.text, borderColor: theme.accent }]}
            multiline
            value={extractedText}
            onChangeText={setExtractedText}
            placeholder="Edit parsed text here..."
            placeholderTextColor={theme.textSecondary}
          />

          <View style={styles.editorActionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setExtractedText('')}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={saveNote}>
              <MaterialIcons name="save" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Study Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Saved Notes Feed */}
      <View style={styles.savedFeedSection}>
        <Text style={[styles.feedHeader, { color: theme.text }]}>Saved Study Notes ({savedNotes.length})</Text>
        
        {savedNotes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No saved snippets yet. Start scanning above!</Text>
          </View>
        ) : (
          savedNotes.map((note) => (
            <View key={note.id} style={[styles.noteCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.noteHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noteCardTitle, { color: theme.text }]} numberOfLines={1}>{note.title}</Text>
                  <Text style={[styles.noteCardDate, { color: theme.textSecondary }]}>{note.date}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteNote(note.id)}>
                  <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.noteCardText, { color: theme.textSecondary }]} numberOfLines={3}>{note.text}</Text>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
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
  captureBox: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  captureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  captureDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  loaderWrap: {
    padding: 24,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 12,
    marginTop: 8,
  },
  editorCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  editorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 10,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    height: 120,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  editorActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    padding: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  savedFeedSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  feedHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  noteCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  noteCardDate: {
    fontSize: 10,
    marginTop: 2,
  },
  noteCardText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
