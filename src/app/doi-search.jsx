import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../constants/ThemeContext';

export default function DoiSearchScreen() {
  const { theme, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, activeTheme, insets);

  const params = useLocalSearchParams();
  const [doi, setDoi] = useState(params.query || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const triggerResolve = async (cleanDoi) => {
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Fetch metadata from the official Crossref API
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
      
      if (!response.ok) {
        throw new Error('DOI not found. Please check the code and try again.');
      }

      const json = await response.json();
      
      if (json.status === 'ok' && json.message) {
        const data = json.message;
        
        // Format authors list
        const authorList = data.author
          ? data.author.map(a => `${a.given || ''} ${a.family || ''}`).join(', ')
          : 'Unknown Author';

        // Extract metadata fields
        const docTitle = data.title ? data.title[0] : 'Untitled Document';
        const journal = data['container-title'] ? data['container-title'][0] : 'N/A';
        const publisher = data.publisher || 'N/A';
        const year = data.created && data.created['date-parts']
          ? data.created['date-parts'][0][0]
          : 'N/A';

        setResult({
          title: docTitle,
          authors: authorList,
          journal: journal,
          publisher: publisher,
          year: year,
          url: data.URL || `https://doi.org/${cleanDoi}`
        });
      } else {
        throw new Error('Could not parse metadata.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while resolving DOI.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDoi = async () => {
    const cleanDoi = doi.trim();
    if (!cleanDoi) {
      setError('Please enter a valid DOI code.');
      setResult(null);
      return;
    }
    await triggerResolve(cleanDoi);
  };

  // Auto-resolve DOI on load if passed via params
  useEffect(() => {
    if (params.query) {
      triggerResolve(params.query);
    }
  }, [params.query]);

  const handleOpenDoc = () => {
    if (result && result.url) {
      router.push({ pathname: '/web-view', params: { url: result.url, title: result.title || 'Document' } });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DOI Document Search</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>
        {/* Academic introduction banner */}
        <View style={styles.introCard}>
          <View style={styles.introIconBox}>
            <MaterialIcons name="auto-stories" size={24} color={theme.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.introTitle}>Academic DOI Search</Text>
            <Text style={styles.introDesc}>
              A Digital Object Identifier (DOI) uniquely identifies journal articles, research papers, and books across the internet. Enter a DOI code to resolve its metadata and access it instantly.
            </Text>
          </View>
        </View>

        {/* Input box */}
        <View style={styles.searchBoxCard}>
          <Text style={styles.inputLabel}>Enter Document DOI Code</Text>
          
          <View style={styles.inputWrapper}>
            <MaterialIcons name="search" size={22} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 10.1038/nature12345"
              placeholderTextColor={theme.textSecondary}
              value={doi}
              onChangeText={(text) => {
                setDoi(text);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {doi.length > 0 && (
              <TouchableOpacity onPress={() => setDoi('')} style={styles.clearBtn}>
                <MaterialIcons name="cancel" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.searchBtn} onPress={handleResolveDoi} activeOpacity={0.8}>
            <Text style={styles.searchBtnText}>RESOLVE DOCUMENT</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.loadingText}>Fetching document details from Crossref Registry...</Text>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={24} color="#e53935" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Metadata Result Card */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultIconWrap}>
                <MaterialIcons name="description" size={26} color="white" />
              </View>
              <Text style={styles.resultHeaderTitle}>Document Metadata</Text>
            </View>

            <View style={styles.resultBody}>
              <Text style={styles.docTitle}>{result.title}</Text>
              
              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <MaterialIcons name="person" size={18} color={theme.textSecondary} />
                <Text style={styles.metaLabel}>Authors:</Text>
                <Text style={styles.metaValue}>{result.authors}</Text>
              </View>

              <View style={styles.metaRow}>
                <MaterialIcons name="menu-book" size={18} color={theme.textSecondary} />
                <Text style={styles.metaLabel}>Journal:</Text>
                <Text style={styles.metaValue} numberOfLines={2}>{result.journal}</Text>
              </View>

              <View style={styles.metaRow}>
                <MaterialIcons name="business" size={18} color={theme.textSecondary} />
                <Text style={styles.metaLabel}>Publisher:</Text>
                <Text style={styles.metaValue}>{result.publisher}</Text>
              </View>

              <View style={styles.metaRow}>
                <MaterialIcons name="event" size={18} color={theme.textSecondary} />
                <Text style={styles.metaLabel}>Year:</Text>
                <Text style={styles.metaValue}>{result.year}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleOpenDoc} activeOpacity={0.8}>
              <MaterialIcons name="launch" size={18} color="white" />
              <View style={{ width: 8 }} />
              <Text style={styles.actionBtnText}>READ FULL DOCUMENT</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme, activeTheme, insets) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    headerSafeArea: {
      backgroundColor: theme.primary,
      paddingTop: insets?.top || 0,
      zIndex: 10,
    },
    header: { 
      backgroundColor: theme.primary, 
      height: 60, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 4
    },
    backButton: { padding: 4 },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
    body: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    // Intro banner card
    introCard: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundElement,
      padding: 16,
      borderRadius: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.02,
      shadowRadius: 6,
      elevation: 1,
      borderWidth: 1,
      borderColor: theme.backgroundSelected
    },
    introIconBox: { 
      width: 44, 
      height: 44, 
      borderRadius: 12, 
      backgroundColor: isDark ? 'rgba(212,160,23,0.1)' : 'rgba(212,160,23,0.08)', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginTop: 2 
    },
    introTitle: { fontSize: 15, fontWeight: 'bold', color: theme.accent },
    introDesc: { fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginTop: 4 },

    // Search card
    searchBoxCard: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 18,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.03,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.backgroundSelected
    },
    inputLabel: { fontSize: 13, fontWeight: 'bold', color: theme.text, marginBottom: 10 },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 50,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa',
      marginBottom: 16
    },
    searchIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: theme.text, height: '100%' },
    clearBtn: { padding: 4 },
    searchBtn: {
      backgroundColor: theme.accent,
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3
    },
    searchBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },

    // Loading container
    loadingContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 30, paddingHorizontal: 20 },
    loadingText: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginTop: 12 },

    // Error card
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(229, 57, 53, 0.15)' : '#ffebee',
      borderWidth: 1,
      borderColor: isDark ? '#e53935' : '#ffcdd2',
      padding: 16,
      borderRadius: 16,
      marginBottom: 20
    },
    errorText: { flex: 1, color: isDark ? '#ff8a80' : '#c62828', fontSize: 13, marginLeft: 12, lineHeight: 18 },

    // Result card styles
    resultCard: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 16,
      elevation: 4,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.backgroundSelected
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.accent,
      paddingHorizontal: 20,
      paddingVertical: 14
    },
    resultIconWrap: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 8, marginRight: 12 },
    resultHeaderTitle: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    resultBody: { padding: 20 },
    docTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text, lineHeight: 24 },
    divider: { height: 1, backgroundColor: theme.backgroundSelected, marginVertical: 16 },
    metaRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
    metaLabel: { fontSize: 13, fontWeight: 'bold', color: theme.text, width: 80, marginLeft: 8 },
    metaValue: { flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4caf50',
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundSelected
    },
    actionBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' }
  });
};
