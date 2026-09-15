import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { translations } from '../../constants/translations';

export default function EventsTab({ styles, events, renderCard, currentLanguage }) {
  const t = translations[currentLanguage] || translations.en;
  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.tabHeading}>{t.upcomingEvents}</Text>
      <Text style={styles.tabSubheading}>Stay updated with webinars, book fairs, and academic workshops at the library.</Text>

      <View style={styles.eventsList}>
        {events.map((item) => renderCard(item, false))}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
