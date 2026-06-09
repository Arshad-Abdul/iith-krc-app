import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTheme } from '../constants/ThemeContext';

export default function ServiceDetailScreen() {
  const { theme, activeTheme } = useTheme();
  const styles = createStyles(theme, activeTheme);

  const params = useLocalSearchParams();
  const serviceTitle = params.title || 'Unknown Service';

  const getIconForService = (t) => {
    switch (t) {
      case 'Document Delivery Service': return 'local-shipping';
      case 'Book Suggestion/Procurement': return 'add-business';
      case 'Similarity Checking Service': return 'fact-check';
      case 'Grammarly': return 'spellcheck';
      case 'Group Discussion Rooms': return 'groups';
      default: return 'help-outline';
    }
  };

  const getIconForURL = (url) => {
    if (url.startsWith('mailto:')) return 'email';
    if (url.includes('form') || url.includes('docs.google')) return 'description';
    if (url.endsWith('.pdf')) return 'picture-as-pdf';
    return 'launch';
  };

  const launchURL = async (url, title) => {
    if (url.startsWith('mailto:')) {
      await Linking.openURL(url);
    } else {
      router.push({ pathname: '/web-view', params: { url, title: title || 'Service Resource' } });
    }
  };

  const renderServiceContent = (t) => {
    let content = '';
    let links = [];

    switch (t) {
      case 'Document Delivery Service':
        content = 'The Library arranges to obtain copies of papers from journals, conference proceedings, and other sources not held in its collection. There is no separate charge for providing the service to the library members. This service is provided to the faculty, research scholars, students, and staff who are members of the library for academic and research purposes.\n\nMembers are requested to submit a formal request to the library with complete bibliographic details of the required documents.';
        links = [{ label: 'IITH Library - KRC', url: 'mailto:office.library@iith.ac.in?subject=Document Delivery Request' }];
        break;
      case 'Book Suggestion/Procurement':
        content = 'The IITH Community are welcome recommend books and other resources that would be required for teaching and research and are of scholarly interest by sending an email/filling up the form (offline/online).';
        links = [
          { label: 'Email us: office.library@iith.ac.in', url: 'mailto:office.library@iith.ac.in?subject=Book Suggestion' },
          { label: 'Click link (Online Form)', url: 'https://opac.krc.iith.ac.in/exhibition/recommend' }
        ];
        break;
      case 'Similarity Checking Service':
        content = 'Library offers Plagiarism Checking Service using a ‘Turnitin’ tool to its registered users at IITH. Turnitin is a similarity checking and plagiarism prevention web tool which allows researchers to compare their contents against the massive databases to ensure the work is original before the submission. Library has a paid license to this tool.\n\nTo get the similarity/plagiarism checking done and have the similarity report generated, please write to us along a soft copy of the document (i.e. thesis, dissertation, manuscript of article, assignment etc.) to be checked in PDF, DOCX file format.';
        links = [
          { label: 'Email us: office.library@iith.ac.in', url: 'mailto:office.library@iith.ac.in?subject=Similarity Checking Request' },
          { label: 'Access Turnitin', url: 'http://www.turnitin.com/' }
        ];
        break;
      case 'Grammarly':
        content = 'Library subscribes to a premium version of Grammarly - an automated grammar tutor and revision tool for writing. You can utilize this service on Firefox, Chrome and in MS Word. You can upload draft writing assignments to receive immediate instructional feedback on over 250+ points of grammar, punctuation and styles.\n\nNote: Students who require Grammarly Premium access are requested to fill out the Google Form through the link provided below.\n\nSteps to create and activate your Grammarly account:\n1. Go to the signup link.\n2. Enter your name, IITH email, and preferred password. Click "sign up".\n3. Check your email for an activation email.\n\nIn case you have a Basic account already, you will have to delete that for accessing Premium account.';
        links = [
          { label: 'Grammarly Signup (IITH EDU)', url: 'https://www.grammarly.com/edu/signup' },
          { label: 'Google Form for Premium Access', url: 'https://docs.google.com/forms/u/0/d/1bRGyt3wOUJmvZvZqXzmvVhfEHiYPo5E7YgIVVQI54wU/viewform?edit_requested=true' },
          { label: 'Download Grammarly User Guide', url: 'https://www.grammarly.com/blog/how-to-use-grammarly/' },
          { label: 'Contact for assistance: office.library@iith.ac.in', url: 'mailto:office.library@iith.ac.in?subject=Grammarly Assistance' }
        ];
        break;
      case 'Group Discussion Rooms':
        content = 'IITH KRC provides Discussion Rooms, a Seminar Room, a Virtual Classroom, and a Video Conference Room to support group discussions and academic interactions.\n\nCapacity Details:\n• 11 Discussion Rooms (up to 14 users each)\n• Seminar Room (GF) - Capacity: 56\n• Virtual Classroom (GF) - Capacity: 81\n• Video Conference Room (FF) - Capacity: 35\n\nRules & Policy:\n• Bookings must be made at least 6 hours in advance.\n• Minimum 3 persons, maximum 14 for Discussion Rooms.\n• No bags, smoking, eating, or sleeping permitted.\n• Turn off lights/AC and lock door upon leaving.';
        links = [
          { label: 'Booking Portal (IITH Website)', url: 'https://rb.krc.iith.ac.in/index.php' },
          { label: 'Email for Special Permission', url: 'mailto:office.library@iith.ac.in?cc=krc.facilities@iith.ac.in&subject=Discussion Room Special Request' }
        ];
        break;
      default:
        content = 'No details available.';
    }

    return (
      <View>
        <Text style={styles.textContent}>{content}</Text>
        <View style={{ height: 30 }} />
        {links.length > 0 && (
          <>
            <Text style={styles.linksHeader}>Resources & Links</Text>
            <View style={{ height: 12 }} />
            {links.map((link, idx) => (
              <TouchableOpacity key={idx} style={styles.linkButton} onPress={() => launchURL(link.url, link.label)}>
                <MaterialIcons name={getIconForURL(link.url)} size={20} color="white" style={styles.linkIcon} />
                <Text style={styles.linkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerImageContainer}>
        <MaterialIcons name={getIconForService(serviceTitle)} size={80} color="white" />
      </View>
      <View style={styles.contentPadding}>
        <Text style={styles.title}>{serviceTitle}</Text>
        <View style={{ height: 16 }} />
        <View style={styles.divider} />
        <View style={{ height: 16 }} />
        {renderServiceContent(serviceTitle)}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const createStyles = (theme, activeTheme) => {
  const isDark = activeTheme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    headerImageContainer: { 
      width: '100%', 
      paddingVertical: 40, 
      backgroundColor: theme.accent, 
      borderBottomLeftRadius: 30, 
      borderBottomRightRadius: 30, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    contentPadding: { padding: 24 },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
    divider: { height: 1, backgroundColor: theme.backgroundSelected },
    textContent: { fontSize: 16, lineHeight: 24, color: theme.textSecondary },
    linksHeader: { fontSize: 18, fontWeight: 'bold', color: theme.accent },
    linkButton: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: theme.backgroundSelected, 
      paddingVertical: 12, 
      paddingHorizontal: 16, 
      borderRadius: 10, 
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)'
    },
    linkIcon: { marginRight: 12 },
    linkText: { color: theme.text, fontSize: 16, fontWeight: '500' }
  });
};
