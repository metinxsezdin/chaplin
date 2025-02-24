import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableWithoutFeedback, Modal, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { Movie, MovieDetails, getMovieDetails, getImageUrl, TMDB_IMAGE_URL } from '../../lib/tmdb';
import { Rating } from '../common/Rating';
import { useAuth } from '../../contexts/auth';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

interface MovieCardProps {
  movie: Movie;
  onAction: (action: 'watched' | 'watchlist' | 'liked' | 'disliked' | 'skip') => void;
  isAnimating: boolean;
  onRate?: (rating: number) => void;
  currentRating?: number;
}

export default function MovieCard({ movie, onAction, isAnimating = false, onRate, currentRating }: MovieCardProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [movieDetails, setMovieDetails] = React.useState<MovieDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const year = new Date(movie.release_date).getFullYear();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [rating, setRating] = useState<number>(currentRating || 0);
  const { user } = useAuth();
  const { colors } = useTheme();
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleShowDetails = React.useCallback(async () => {
    if (!isAnimating) {
      setShowDetails(true);
      setIsLoadingDetails(true);
      const details = await getMovieDetails(movie.id);
      setMovieDetails(details);
      setIsLoadingDetails(false);
    }
  }, [movie.id, isAnimating]);

  const handleMovieAction = (action: 'watched' | 'watchlist' | 'liked' | 'disliked' | 'skip') => {
    if (onAction) {
      onAction(action);
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = Math.sign(event.translationX);
        runOnJS(handleMovieAction)(direction > 0 ? 'liked' : 'disliked');
      } else if (event.translationY < -SWIPE_THRESHOLD) {
        runOnJS(handleMovieAction)('watchlist');
      } else {
        translateX.value = withSpring(0, { damping: 20 });
        translateY.value = withSpring(0, { damping: 20 });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = `${(translateX.value / SCREEN_WIDTH) * 20}deg`;
    const scale = 1 - Math.abs(translateY.value / (SCREEN_WIDTH * 2));

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate },
        { scale },
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = Math.abs(translateX.value) / (SCREEN_WIDTH / 2);
    const isRight = translateX.value > 0;
    const isUp = translateY.value < 0;

    return {
      opacity: Math.min(opacity, 1),
      backgroundColor: isUp 
        ? 'rgba(255, 215, 0, 0.3)' 
        : isRight 
          ? 'rgba(76, 175, 80, 0.3)' 
          : 'rgba(229, 9, 20, 0.3)',
    };
  });

  useEffect(() => {
    if (user?.id && movie.id) {
      loadRating();
    }
  }, [user?.id, movie.id]);

  const loadRating = async () => {
    try {
      if (!user?.id || !movie.id) return;

      const { data, error } = await supabase
        .from('movie_interactions')
        .select('action')
        .eq('user_id', user.id)
        .eq('movie_id', movie.id)
        .maybeSingle();

      if (error) throw error;
      
      setRating(data?.action === 'liked' || data?.action === 'watched' ? 5 : 0);

    } catch (error) {
      console.error('Error loading rating:', error);
    }
  };

  const renderGenres = () => {
    if (!movie.genre_ids?.length) return null;
    return (
      <View style={styles.genreContainer}>
        {movie.genre_ids.slice(0, 3).map((genreId) => (
          <View 
            key={genreId} 
            style={[styles.genreTag, { backgroundColor: colors.primary + '40' }]}
          >
            <Text style={[styles.genreText, { color: colors.text }]}>
              {getGenreName(genreId)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRating = () => (
    <View style={styles.ratingContainer}>
      <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
      <Text style={[styles.ratingText, { color: colors.text }]}>
        {movie.vote_average.toFixed(1)}
      </Text>
      <Text style={[styles.voteCount, { color: colors.textSecondary }]}>
        ({formatNumber(movie.vote_count)})
      </Text>
    </View>
  );

  const renderMetaInfo = () => (
    <View style={styles.metaContainer}>
      <View style={styles.metaItem}>
        <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {new Date(movie.release_date).getFullYear()}
        </Text>
      </View>
      {movie.adult && (
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.metaText, { color: colors.error }]}>18+</Text>
        </View>
      )}
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={handleShowDetails}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image
          source={{
            uri: movie.poster_path
              ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
              : 'https://via.placeholder.com/780x440'
          }}
          style={styles.backdrop}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.gradient}
        >
          <View style={styles.contentContainer}>
            <View style={styles.infoContainer}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {movie.title}
              </Text>

              {renderGenres()}
              {renderRating()}
              {renderMetaInfo()}

              <Text 
                style={[styles.overview, { color: colors.textSecondary }]} 
                numberOfLines={5}
              >
                {movie.overview}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { 
                backgroundColor: '#FF4B4B'
              }
            ]}
            onPress={() => handleMovieAction('disliked')}
            disabled={isAnimating}
          >
            <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              { 
                backgroundColor: '#4B7BFF'
              }
            ]}
            onPress={() => handleMovieAction('watchlist')}
            disabled={isAnimating}
          >
            <MaterialCommunityIcons name="bookmark-outline" size={30} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              { 
                backgroundColor: '#4CAF50'
              }
            ]}
            onPress={() => handleMovieAction('liked')}
            disabled={isAnimating}
          >
            <MaterialCommunityIcons name="heart-outline" size={30} color="#fff" />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showDetails}
          animationType="fade"
          onRequestClose={() => setShowDetails(false)}
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={() => setShowDetails(false)}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <ScrollView 
                style={styles.modalScroll}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <Image
                  source={{
                    uri: movie.backdrop_path
                      ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
                      : movie.poster_path
                        ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
                        : 'https://via.placeholder.com/780x440'
                  }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                
                <View style={styles.modalContent}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {movie.title}
                  </Text>
                  
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalRating}>⭐ {movie.vote_average.toFixed(1)}</Text>
                    <Text style={styles.modalYear}>{year}</Text>
                    {movieDetails?.runtime && (
                      <View style={styles.runtimeContainer}>
                        <MaterialCommunityIcons name="clock-outline" size={20} color="#ccc" />
                        <Text style={styles.modalRuntime}>{movieDetails.runtime} min</Text>
                      </View>
                    )}
                  </View>
                  {movieDetails?.genres && (
                    <View style={styles.genreContainer}>
                      {movieDetails.genres.map(genre => (
                        <View key={genre.id} style={styles.genreTag}>
                          <Text style={styles.genreText}>{genre.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={styles.modalDescription}>{movie.overview}</Text>
                  {isLoadingDetails ? (
                    <ActivityIndicator size="large" color="#fff" style={styles.loader} />
                  ) : movieDetails?.cast && (
                    <View style={styles.castSection}>
                      <Text style={styles.sectionTitle}>Cast</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.castScroll}
                        contentContainerStyle={styles.castScrollContent}
                      >
                        {movieDetails.cast.map(actor => (
                          <View key={actor.id} style={styles.castCard}>
                            <Image
                              source={{ 
                                uri: actor.profile_path 
                                  ? getImageUrl(actor.profile_path, 'poster')
                                  : 'https://via.placeholder.com/100x150'
                              }}
                              style={styles.castImage}
                            />
                            <Text style={styles.actorName} numberOfLines={1}>{actor.name}</Text>
                            <Text style={styles.characterName} numberOfLines={1}>{actor.character}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  infoContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  genreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  voteCount: {
    fontSize: 16,
    marginLeft: 6,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 16,
  },
  overview: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalScroll: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.4,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  modalRating: {
    color: '#fff',
    fontSize: 16,
  },
  modalYear: {
    color: '#ccc',
    fontSize: 16,
  },
  runtimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalRuntime: {
    color: '#ccc',
    fontSize: 14,
  },
  castSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  castScroll: {
    padding: 10,
  },
  castScrollContent: {
    gap: 10,
  },
  castCard: {
    width: 100,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
  },
  castImage: {
    width: '100%',
    height: '100%',
  },
  actorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  characterName: {
    color: '#ccc',
    fontSize: 14,
  },
  modalDescription: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 12,
  },
  loader: {
    marginTop: 20,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});

// Yardımcı fonksiyonlar
const GENRES: { [key: number]: string } = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

const getGenreName = (id: number) => GENRES[id] || 'Unknown';

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};