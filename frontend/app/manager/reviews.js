import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput
} from 'react-native';
import { reviewAPI } from '../../services/api';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';

export default function ManagerReviewsScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');

  const fetchReviews = async () => {
    try {
      const { data } = await reviewAPI.getAll();
      setReviews(data.reviews);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const toggleBlur = async (review) => {
    try {
      await reviewAPI.moderate(review._id, { isBlurred: !review.isBlurred });
      fetchReviews();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update review status');
    }
  };

  const submitResponse = async () => {
    if (!respondingTo || !responseText.trim()) return;
    try {
      await reviewAPI.moderate(respondingTo, { managerResponse: responseText });
      setRespondingTo(null);
      setResponseText('');
      fetchReviews();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit response');
    }
  };

  const renderReview = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.movieTitle}>{item.movie?.title}</Text>
        <Text style={styles.branchName}>{item.branch?.name}</Text>
      </View>
      <Text style={styles.author}>By: {item.customer?.name}</Text>

      <View style={styles.ratingsRow}>
        <View style={styles.ratingBox}>
          <Text style={styles.ratingLabel}>Movie</Text>
          <View style={styles.stars}>
            <Ionicons name="star" size={12} color={colors.accent} />
            <Text style={styles.ratingText}>{item.movieRating}/5</Text>
          </View>
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.ratingLabel}>Hall</Text>
          <View style={styles.stars}>
            <Ionicons name="star" size={12} color={colors.accent} />
            <Text style={styles.ratingText}>{item.hallRating}/5</Text>
          </View>
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.ratingLabel}>Facilities</Text>
          <View style={styles.stars}>
            <Ionicons name="star" size={12} color={colors.accent} />
            <Text style={styles.ratingText}>{item.facilityRating}/5</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.comment, item.isBlurred && styles.blurredComment]}>
        {item.comment || 'No comment provided.'}
      </Text>
      
      {item.managerResponse && (
        <View style={styles.managerResponseContainer}>
          <Text style={styles.managerResponseTitle}>Manager Response:</Text>
          <Text style={styles.managerResponseText}>{item.managerResponse}</Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, item.isBlurred ? styles.actionBtnActive : {}]}
          onPress={() => toggleBlur(item)}
        >
          <Ionicons name={item.isBlurred ? 'eye-off' : 'eye'} size={16} color={item.isBlurred ? colors.error : colors.textMuted} />
          <Text style={[styles.actionBtnText, item.isBlurred && { color: colors.error }]}>
            {item.isBlurred ? 'Unblur Comment' : 'Blur Comment'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => {
            setRespondingTo(item._id);
            setResponseText(item.managerResponse || '');
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textMuted} />
          <Text style={styles.actionBtnText}>Respond</Text>
        </TouchableOpacity>
      </View>

      {respondingTo === item._id && (
        <View style={styles.responseEditor}>
          <TextInput
            style={styles.input}
            placeholder="Write your response..."
            placeholderTextColor={colors.textMuted}
            value={responseText}
            onChangeText={setResponseText}
            multiline
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <TouchableOpacity onPress={() => setRespondingTo(null)}>
              <Text style={{ color: colors.textSecondary, padding: 8 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={submitResponse}>
              <Text style={styles.submitBtnText}>Save Response</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review Moderation</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          renderItem={renderReview}
          contentContainerStyle={{ padding: SIZES.md, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReviews(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: colors.textSecondary }}>No reviews found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: SIZES.md, paddingTop: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  card: { backgroundColor: colors.card, borderRadius: SIZES.radiusLg, padding: SIZES.md, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  movieTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, flex: 1 },
  branchName: { fontSize: 12, color: colors.textSecondary },
  author: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  ratingsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  ratingBox: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  ratingLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary },
  comment: { fontSize: 14, color: colors.textPrimary, lineHeight: 20, marginBottom: 16 },
  blurredComment: { color: colors.error, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtnActive: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: -8 },
  actionBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  responseEditor: { marginTop: 12, backgroundColor: colors.surface, padding: 10, borderRadius: 8 },
  input: { backgroundColor: colors.background, color: colors.textPrimary, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, minHeight: 60, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  submitBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  managerResponseContainer: { marginTop: 8, padding: 8, backgroundColor: colors.surfaceElevated, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: colors.primary, marginBottom: 12 },
  managerResponseTitle: { fontSize: 11, fontWeight: 'bold', color: colors.primary, marginBottom: 2 },
  managerResponseText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
});
