import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext';
import { translations } from '../../constants/translations';

export default function MenuTab({ currentLanguage: propLanguage, theme: propTheme, styles, handleMenuPress }) {
  const { theme: ctxTheme, currentLanguage: ctxLanguage, t: ctxT } = useTheme();
  const theme = propTheme || ctxTheme;
  const currentLanguage = propLanguage || ctxLanguage;
  const t = ctxT || translations[currentLanguage] || translations.en;

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.tabHeading}>{t.quickAccess || "Library Services & Portals"}</Text>
      <Text style={styles.tabSubheading}>{t.quickDesc || "Essential KRC operations, digital services, and student tools."}</Text>

      <View style={styles.menuGrid}>
        {/* 1. Live Floor Occupancy */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/library-occupancy')}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <MaterialIcons name="people" size={30} color="#10B981" />
          </View>
          <Text style={styles.menuCardTitle}>{t.liveOccupancy || "Live Occupancy"}</Text>
          <Text style={styles.menuCardDesc}>{t.liveOccupancyDesc || "Real-time seat availability & check-in gate."}</Text>
        </TouchableOpacity>

        {/* 2. Document Delivery (DDS / ILL) */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/dds-ill')}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <MaterialIcons name="cloud-download" size={30} color="#3B82F6" />
          </View>
          <Text style={styles.menuCardTitle}>{t.ddsIll || "Document Delivery (DDS)"}</Text>
          <Text style={styles.menuCardDesc}>{t.ddsIllDesc || "Request articles & chapters from partner IITs."}</Text>
        </TouchableOpacity>

        {/* 3. Magazines & Newspapers (Edzter) */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://www.edzter.com/login', title: 'Magazines & Newspapers' } })}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
            <MaterialIcons name="menu-book" size={30} color="#F59E0B" />
          </View>
          <Text style={styles.menuCardTitle}>{t.magazinesNews || "Magazines & News"}</Text>
          <Text style={styles.menuCardDesc}>{t.magazinesNewsDesc || "Access Edzter e-periodicals."}</Text>
        </TouchableOpacity>

        {/* 4. Notification Center */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/notifications')}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
            <MaterialIcons name="notifications-active" size={30} color="#8B5CF6" />
          </View>
          <Text style={styles.menuCardTitle}>{t.notificationsTitle || t.notifications || "Notifications"}</Text>
          <Text style={styles.menuCardDesc}>{t.notificationsDesc || "Due date alerts, announcements & recommendations."}</Text>
        </TouchableOpacity>

        {/* 5. Professor's Bookshelf */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/professors-bookshelf')}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="assignment" size={30} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>{t.profsBookshelf || "Prof's Bookshelf"}</Text>
          <Text style={styles.menuCardDesc}>{t.profsBookshelfDesc || "Curated reading lists recommended by faculty."}</Text>
        </TouchableOpacity>

        {/* 6. Research Tools (Grammarly, Turnitin, Overleaf) */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/tools')}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="build" size={30} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>{t.academicTools || "Academic Tools"}</Text>
          <Text style={styles.menuCardDesc}>{t.academicToolsDesc || "Grammarly, Turnitin & Overleaf accounts."}</Text>
        </TouchableOpacity>

        {/* 7. Room Booking (Campus Access Only) */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://rb.krc.iith.ac.in/', title: t.roomBooking || 'Discussion Room Booking' } })}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="meeting-room" size={30} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>{t.roomBooking || "Room Booking"}</Text>
          <View style={styles.campusBadge}>
            <Text style={styles.campusBadgeText}>{t.campusNetwork || "Campus Network"}</Text>
          </View>
          <Text style={styles.menuCardDesc}>{t.roomBookingDesc || "Reserve discussion cubicles & study rooms."}</Text>
        </TouchableOpacity>

        {/* 8. Virtual Exhibition */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://opac.krc.iith.ac.in/exhibition', title: t.virtualExhibition || 'Virtual Exhibition' } })}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="collections" size={30} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>{t.virtualExhibition || "Virtual Exhibition"}</Text>
          <Text style={styles.menuCardDesc}>Online book fairs & publisher showcases.</Text>
        </TouchableOpacity>

        {/* 9. Book Acquisition Suggestion */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push({ pathname: '/web-view', params: { url: 'https://opac.krc.iith.ac.in/exhibition/recommend', title: t.purchaseSuggestion || 'Purchase Suggestion' } })}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="thumb-up" size={30} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>{t.purchaseSuggestion || "Purchase Suggestion"}</Text>
          <Text style={styles.menuCardDesc}>Suggest new books for library procurement.</Text>
        </TouchableOpacity>

        {/* 10. Institutional Repository (RAIITH, IRINS, Shodhganga) */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => handleMenuPress('/institutional-resources')}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="dns" size={30} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>{t.instRepository || "Inst. Repository"}</Text>
          <Text style={styles.menuCardDesc}>RAIITH thesis archive, IRINS & faculty papers.</Text>
        </TouchableOpacity>

        {/* 11. Off-Campus Remote Access */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => handleMenuPress('/off-campus-access')}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="vpn-lock" size={30} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>{t.offCampusAccess || "Off-Campus Access"}</Text>
          <Text style={styles.menuCardDesc}>Remote proxy access to IEEE, Springer & ScienceDirect.</Text>
        </TouchableOpacity>

        {/* 12. Library Hours */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => handleMenuPress('/library-hours')}
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="access-time" size={30} color={theme.accent} />
          </View>
          <Text style={styles.menuCardTitle}>{t.libraryHours || "Library Hours"}</Text>
          <Text style={styles.menuCardDesc}>Operating hours, reading hall & holiday schedule.</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
