import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchBooks } from '../../services/webopacApi';
import { useTheme } from '../constants/ThemeContext';

export default function OcrScannerScreen() {
  const { theme, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualIsbn, setManualIsbn] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.primary }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.primary }]}>
        <MaterialIcons name="camera-alt" size={64} color={theme.textSecondary} />
        <Text style={[styles.permissionText, { color: theme.text }]}>We need camera access to scan barcodes.</Text>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accent }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || isSearching) return;
    setScanned(true);
    await lookupBarcodeOrIsbn(data);
  };

  const lookupBarcodeOrIsbn = async (rawCode) => {
    if (!rawCode || !rawCode.trim()) return;
    setIsSearching(true);
    setErrorMsg('');
    const code = rawCode.trim();

    try {
      // 1. Try querying as Accession Number (Barcode 'bc' in Koha)
      // Keeps prefixes like 'G' in 'G13131'
      const cleanBc = code.toUpperCase();
      let results = await searchBooks(cleanBc, { type: 'bc', limit: 5 });
      let book = results?.books?.find((b) => b?.biblio_id);

      // 2. If not found, try as ISBN (for publisher barcodes on book back)
      if (!book) {
        const cleanIsbn = code.replace(/[^0-9X]/gi, '');
        if (cleanIsbn.length >= 8) {
          results = await searchBooks(cleanIsbn, { type: 'isbn', limit: 5 });
          book = results?.books?.find((b) => b?.biblio_id);
        }
      }

      if (book?.biblio_id) {
        router.replace({ pathname: '/book-detail', params: { biblioId: book.biblio_id } });
      } else {
        setErrorMsg(`Book with code "${code}" not found in KRC catalog.`);
        setScanned(false);
      }
    } catch (_err) {
      setErrorMsg('Could not query catalog server. Please try again.');
      setScanned(false);
    } finally {
      setIsSearching(false);
    }
  };

  const isDark = activeTheme === 'dark';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#090D16' : '#F8FAFC' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={[styles.headerSafeArea, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderBottomColor: isDark ? '#1F2937' : '#E2E8F0', paddingTop: insets?.top || 0 }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Scan Book Barcode</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        {/* Camera Scanner Panel */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'qr', 'code128'],
            }}
          >
            <View style={styles.overlayFrame}>
              <View style={[styles.targetBox, { borderColor: theme.accent }]} />
              <Text style={styles.instruction}>Position barcode inside the frame</Text>
            </View>
          </CameraView>
        </View>

        {/* Manual Input Backup */}
        <View style={[styles.manualPanel, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#1F2937' : '#E2E8F0' }]}>
          <Text style={[styles.manualTitle, { color: theme.text }]}>Or enter Accession No / ISBN manually</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#090D16' : '#F8FAFC', color: theme.text, borderColor: theme.accent }]}
              placeholder="e.g. G13131 or 9780131103627"
              placeholderTextColor={theme.textSecondary}
              value={manualIsbn}
              onChangeText={setManualIsbn}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: theme.accent }]}
              onPress={() => lookupBarcodeOrIsbn(manualIsbn)}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="search" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  headerSafeArea: {
    borderBottomWidth: 1,
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
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  overlayFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  targetBox: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  manualPanel: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
    elevation: 4,
  },
  manualTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
