import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { coverUrl, getBookDetail } from '../../services/webopacApi';
import { addToWishlist, isInWishlist, removeFromWishlist } from '../../services/wishlist';
import { 
  getBookReviews, 
  submitBookReview, 
  recommendBook, 
  getBookClubMessages, 
  postBookClubMessage, 
  getBookCourseTags, 
  addBookCourseTag 
} from '../../services/kohaApi';
import { getSession } from '../../services/session';

export default function BookDetailScreen() {
  const { biblioId } = useLocalSearchParams();
  const { theme, t } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [wishlisted, setWishlisted] = useState(false);
  const [session, setSession] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [courseTags, setCourseTags] = useState([]);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [isTagging, setIsTagging] = useState(false);

  const [clubMessages, setClubMessages] = useState([]);
  const [newClubMsg, setNewClubMsg] = useState('');
  const [isSendingClubMsg, setIsSendingClubMsg] = useState(false);

  const [recipientCard, setRecipientCard] = useState('');
  const [recommendNote, setRecommendNote] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);

  useEffect(() => {
    if (!biblioId) return;
    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const [bookData, reviewsData, sessionData, courseTagsData, clubData] = await Promise.all([
          getBookDetail(biblioId),
          getBookReviews(biblioId).catch((err) => {
            console.warn('Could not load reviews:', err);
            return [];
          }),
          getSession().catch(() => null),
          getBookCourseTags(biblioId).catch(() => []),
          getBookClubMessages(biblioId).catch(() => []),
        ]);
        setBook(bookData);
        setReviews(reviewsData || []);
        setSession(sessionData);
        setWishlisted(await isInWishlist(Number(biblioId)));
        setCourseTags(courseTagsData || []);
        setClubMessages(clubData || []);
      } catch (err) {
        setError(err.message || 'Could not load this book.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [biblioId]);

  const toggleWishlist = async () => {
    if (!book) return;
    if (wishlisted) {
      await removeFromWishlist(book.biblio_id);
      setWishlisted(false);
    } else {
      await addToWishlist({ biblio_id: book.biblio_id, title: book.title, author: book.author });
      setWishlisted(true);
    }
  };

  const shareBook = async () => {
    if (!book) return;
    try {
      const bookUrl = `https://opac.krc.iith.ac.in/book/${book.biblio_id}`;
      await Share.share({
        message: `Check out this book on IITH KRC: "${book.title}" by ${book.author || 'Unknown'}\nLink: ${bookUrl}`,
        url: bookUrl,
        title: book.title,
      });
    } catch (err) {
      console.warn('Sharing failed:', err);
    }
  };

  const handlePostReview = async () => {
    if (!session?.token) {
      alert("Please log in to submit a review.");
      return;
    }
    if (!userComment.trim()) {
      alert("Please enter a comment.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      await submitBookReview(session.token, biblioId, { rating: userRating, comment: userComment });
      setUserComment('');
      const updated = await getBookReviews(biblioId);
      setReviews(updated);
    } catch (err) {
      alert(err.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handlePostRecommendation = async () => {
    if (!recipientCard.trim()) {
      alert("Please enter a recipient's library card number.");
      return;
    }
    setIsRecommending(true);
    try {
      await recommendBook(session.token, recipientCard.trim(), {
        biblio_id: book.biblio_id,
        title: book.title,
        author: book.author,
        note: recommendNote
      });
      alert("Book recommended successfully!");
      setRecipientCard('');
      setRecommendNote('');
    } catch (err) {
      alert(err.message || "Failed to submit recommendation.");
    } finally {
      setIsRecommending(false);
    }
  };

  const handlePostClubMessage = async () => {
    if (!newClubMsg.trim()) return;
    setIsSendingClubMsg(true);
    try {
      await postBookClubMessage(session.token, biblioId, newClubMsg.trim());
      const updated = await getBookClubMessages(biblioId);
      setClubMessages(updated || []);
      setNewClubMsg('');
    } catch (err) {
      alert(err.message || "Failed to post message.");
    } finally {
      setIsSendingClubMsg(false);
    }
  };

  const handleAddCourseTag = async () => {
    if (!newCourseCode.trim()) {
      alert("Please enter a course code.");
      return;
    }
    setIsTagging(true);
    try {
      await addBookCourseTag(session.token, biblioId, {
        course_code: newCourseCode.trim(),
        course_name: newCourseName.trim()
      });
      const updated = await getBookCourseTags(biblioId);
      setCourseTags(updated || []);
      setNewCourseCode('');
      setNewCourseName('');
    } catch (err) {
      alert(err.message || "Failed to add course tag.");
    } finally {
      setIsTagging(false);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      (router.canGoBack() ? router.back() : router.replace('/'));
    } else {
      router.replace('/dashboard');
    }
  };

  const subjects = Array.isArray(book?.subjects) ? book.subjects : [];

  return (
    <View style={styles.container}>
      <View style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{t.bookDetails || "Book Details"}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={shareBook} style={[styles.backButton, { marginRight: 8 }]}>
              <MaterialIcons name="share" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleWishlist} style={styles.backButton}>
              <MaterialIcons
                name={wishlisted ? 'bookmark' : 'bookmark-border'}
                size={26}
                color={wishlisted ? theme.accent : theme.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <MaterialIcons name="error-outline" size={40} color={theme.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Image source={{ uri: coverUrl(book.biblio_id) }} style={styles.cover} resizeMode="cover" />

          <Text style={styles.title}>{book.title}</Text>
          {book.author ? <Text style={styles.author}>{book.author}</Text> : null}

          <View style={styles.metaRow}>
            {book.copyrightdate ? (
              <View style={styles.metaChip}><Text style={styles.metaChipText}>{book.copyrightdate}</Text></View>
            ) : null}
            {book.isbn ? (
              <View style={styles.metaChip}><Text style={styles.metaChipText}>ISBN {book.isbn}</Text></View>
            ) : null}
            {book.items && book.items.length === 1 && book.items[0].barcode ? (
              <View style={styles.metaChip}><Text style={styles.metaChipText}>{t.accNo || 'Acc No'}: {book.items[0].barcode}</Text></View>
            ) : book.item_count ? (
              <View style={styles.metaChip}><Text style={styles.metaChipText}>{book.item_count} {book.item_count === 1 ? (t.copy || 'Copy') : (t.copies || 'Copies')}</Text></View>
            ) : null}
          </View>

          {subjects.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t.subjects || "Subjects"}</Text>
              <View style={styles.subjectRow}>
                {subjects.map((s, i) => {
                  const key = s?.subject_key ?? s?.key ?? String(s);
                  const label = s?.subject_name ?? s?.name ?? String(s);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => router.push({ pathname: '/subject-books', params: { subjectKey: key, label } })}
                    >
                      <View style={styles.subjectChip}>
                        <Text style={styles.subjectChipText}>{label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {book.notes ? (
            <>
              <Text style={styles.sectionTitle}>{t.aboutBook || "About this book"}</Text>
              <Text style={styles.notes}>{book.notes}</Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>{t.availability || "Availability"} ({book.item_count ?? 0} {book.item_count === 1 ? (t.copy || "copy") : (t.copies || "copies")})</Text>
          {(book.items ?? []).length === 0 ? (
            <Text style={styles.emptyText}>{t.noHoldings || "No holdings information available."}</Text>
          ) : (
            book.items.map((item, i) => (
              <View key={item.itemnumber ?? i} style={styles.itemRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                    <Text style={styles.itemCallNumber}>{item.call_number || item.item_type_desc || 'General'}</Text>
                    {item.barcode ? (
                      <View style={styles.barcodeBadge}>
                        <MaterialIcons name="qr-code-2" size={13} color={theme.accent} style={{ marginRight: 3 }} />
                        <Text style={styles.barcodeText}>{t.accNo || "Acc No"}: <Text style={{ fontWeight: '700' }}>{item.barcode}</Text></Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.itemMeta}>
                    {item.location ? `${item.location} • ` : ''}{item.holdingbranch || 'IITH Library'}{item.item_type_desc ? ` • ${item.item_type_desc}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'Available' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)' },
                  ]}
                >
                  <Text style={{ color: item.status === 'Available' ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: 12 }}>
                    {item.status === 'Available' ? (t.available || 'Available') : (t.checkedOut || 'Checked out')}
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Reviews & Comments Section */}
          <Text style={styles.sectionTitle}>{t.reviewsComments || "Reviews & Comments"}</Text>
          
          {session ? (
            <View style={styles.reviewInputContainer}>
              <Text style={styles.reviewInputTitle}>{t.writeReview || "Write a Review"}</Text>
              
              <View style={styles.starRatingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                    <MaterialIcons 
                      name={star <= userRating ? "star" : "star-border"} 
                      size={28} 
                      color="#F59E0B" 
                    />
                  </TouchableOpacity>
                ))}
              </View>
              
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Share your thoughts about this book..."
                placeholderTextColor={theme.textSecondary}
                value={userComment}
                onChangeText={setUserComment}
                multiline
                numberOfLines={3}
              />
              
              <TouchableOpacity 
                style={styles.submitReviewBtn} 
                onPress={handlePostReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitReviewBtnText}>{t.submitReview || "Submit Review"}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>Please log in to leave a review.</Text>
          )}

          <View style={{ width: '100%', marginTop: 16 }}>
            {reviews.length === 0 ? (
              <Text style={[styles.emptyText, { fontStyle: 'italic' }]}>No reviews yet. Be the first to review this book!</Text>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <Text style={styles.reviewCardAuthor}>{rev.patron_name}</Text>
                    <View style={styles.reviewCardStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons 
                          key={star} 
                          name={star <= rev.rating ? "star" : "star-border"} 
                          size={14} 
                          color="#F59E0B" 
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewCardComment}>{rev.comment}</Text>
                  <Text style={styles.reviewCardDate}>
                    {new Date(rev.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* P2P Book Recommendations */}
          <Text style={styles.sectionTitle}>Recommend to a Friend</Text>
          {session ? (
            <View style={styles.reviewInputContainer}>
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Recipient Card Number (e.g. 12345)..."
                placeholderTextColor={theme.textSecondary}
                value={recipientCard}
                onChangeText={setRecipientCard}
              />
              <View style={{ height: 10 }} />
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Add a recommendation note..."
                placeholderTextColor={theme.textSecondary}
                value={recommendNote}
                onChangeText={setRecommendNote}
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity 
                style={[styles.submitReviewBtn, { backgroundColor: theme.accent }]} 
                onPress={handlePostRecommendation}
                disabled={isRecommending}
              >
                {isRecommending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitReviewBtnText}>Send Recommendation</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>Please log in to recommend books.</Text>
          )}

          {/* Course Reference Tags */}
          <Text style={styles.sectionTitle}>Course Reference Tags</Text>
          {session ? (
            <View style={styles.reviewInputContainer}>
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Course Code (e.g., CS3020)..."
                placeholderTextColor={theme.textSecondary}
                value={newCourseCode}
                onChangeText={setNewCourseCode}
                autoCapitalize="characters"
              />
              <View style={{ height: 10 }} />
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Course Name (e.g., Deep Learning)..."
                placeholderTextColor={theme.textSecondary}
                value={newCourseName}
                onChangeText={setNewCourseName}
              />
              <TouchableOpacity 
                style={[styles.submitReviewBtn, { backgroundColor: theme.accent }]} 
                onPress={handleAddCourseTag}
                disabled={isTagging}
              >
                {isTagging ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitReviewBtnText}>Tag Course</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>Please log in to tag courses.</Text>
          )}

          {/* Render active course tags */}
          <View style={[styles.subjectRow, { marginTop: 10, flexWrap: 'wrap', flexDirection: 'row', gap: 6 }]}>
            {courseTags.map((tag) => (
              <View key={tag.id} style={[styles.subjectChip, { backgroundColor: theme.backgroundSelected, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }]}>
                <Text style={[styles.subjectChipText, { color: theme.accent, fontSize: 12, fontWeight: 'bold' }]}>
                  {tag.course_code}: {tag.course_name || 'General'}
                </Text>
              </View>
            ))}
          </View>

          {/* Reading Club Board */}
          <Text style={styles.sectionTitle}>Reading Club Chat Board</Text>
          {session ? (
            <View style={styles.reviewInputContainer}>
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Write a message to the book club..."
                placeholderTextColor={theme.textSecondary}
                value={newClubMsg}
                onChangeText={setNewClubMsg}
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity 
                style={[styles.submitReviewBtn, { backgroundColor: theme.accent }]} 
                onPress={handlePostClubMessage}
                disabled={isSendingClubMsg}
              >
                {isSendingClubMsg ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitReviewBtnText}>Post Message</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>Please log in to chat with the reading club.</Text>
          )}

          {/* Reading Club Message list */}
          <View style={{ width: '100%', marginTop: 12 }}>
            {clubMessages.length === 0 ? (
              <Text style={[styles.emptyText, { fontStyle: 'italic' }]}>No chat messages yet. Start the discussion!</Text>
            ) : (
              clubMessages.map((msg) => (
                <View key={msg.id} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <Text style={styles.reviewCardAuthor}>{msg.patron_name}</Text>
                    <Text style={styles.reviewCardDate}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.reviewCardComment}>{msg.message}</Text>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme, insets) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.primary },
    headerSafeArea: { backgroundColor: theme.primary, paddingTop: insets?.top || 0 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      height: 56, paddingHorizontal: 12,
      borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton: { padding: 8 },
    headerTitle: { flex: 1, textAlign: 'center', color: theme.text, fontSize: 17, fontWeight: 'bold' },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: theme.textSecondary, marginTop: 12, textAlign: 'center' },
    scrollContent: { padding: 20, alignItems: 'center' },
    cover: { width: 160, height: 240, borderRadius: 12, backgroundColor: theme.backgroundSelected, marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    author: { fontSize: 14, color: theme.textSecondary, fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
    metaChip: { backgroundColor: theme.backgroundElement, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    metaChipText: { color: theme.textSecondary, fontSize: 12 },
    sectionTitle: { alignSelf: 'flex-start', fontSize: 15, fontWeight: 'bold', color: theme.text, marginTop: 24, marginBottom: 8 },
    notes: { alignSelf: 'flex-start', fontSize: 13, color: theme.textSecondary, lineHeight: 20 },
    emptyText: { alignSelf: 'flex-start', color: theme.textSecondary, fontSize: 13 },
    subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'flex-start' },
    subjectChip: {
      backgroundColor: theme.backgroundElement, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: theme.accent + '44',
    },
    subjectChipText: { color: theme.accent, fontSize: 12, fontWeight: '600' },
    itemRow: {
      flexDirection: 'row', alignItems: 'center', width: '100%',
      backgroundColor: theme.backgroundElement, borderRadius: 12, padding: 12, marginBottom: 8,
    },
    itemCallNumber: { color: theme.text, fontWeight: '600', fontSize: 13 },
    itemMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    barcodeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.accent + '15',
      borderColor: theme.accent + '35',
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    barcodeText: {
      color: theme.text,
      fontSize: 12,
    },
    
    reviewInputContainer: {
      width: '100%',
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    reviewInputTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    starRatingRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    reviewTextInput: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 12,
      color: theme.text,
      fontSize: 13,
      minHeight: 60,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    submitReviewBtn: {
      backgroundColor: theme.accent,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 12,
    },
    submitReviewBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: 'bold',
    },
    reviewCard: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      width: '100%',
    },
    reviewCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    reviewCardAuthor: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.text,
    },
    reviewCardStars: {
      flexDirection: 'row',
      gap: 2,
    },
    reviewCardComment: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    reviewCardDate: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 6,
      textAlign: 'right',
    },
  });
