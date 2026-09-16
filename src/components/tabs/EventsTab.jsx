import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { translations } from '../../constants/translations';

export default function EventsTab({ styles, events, renderCard, currentLanguage, theme }) {
  const t = translations[currentLanguage] || translations.en;
  const hasEvents = Array.isArray(events) && events.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.tabHeading}>{t.upcomingEvents}</Text>
      <Text style={styles.tabSubheading}>Stay updated with webinars, book fairs, and academic workshops at the library.</Text>

      {hasEvents ? (
        <View style={styles.eventsList}>
          {events.map((item) => renderCard(item, false))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(32, 138, 239, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <MaterialIcons name="event-available" size={32} color="#208AEF" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme?.text || '#1F2937', textAlign: 'center', marginBottom: 8 }}>
            No Upcoming Events
          </Text>
          <Text style={{ fontSize: 13, color: theme?.textSecondary || '#6B7280', textAlign: 'center', lineHeight: 18 }}>
            There are no library events or exhibitions scheduled at the moment. Check back soon!
          </Text>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
