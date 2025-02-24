import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Dimensions, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { useAuth } from '../../contexts/auth';
import { supabase } from '../../lib/supabase';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import type { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import MovieCard from '../../components/MovieCard';
import { Movie, getPopularMovies, getTopRatedMovies, getTrendingMovies, getUpcomingMovies } from '../../lib/tmdb';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme';
import { MovieMatcher } from '../../lib/matching/matcher';
import { Rating } from '../../components/Rating';

const SWIPE_THRESHOLD = 100;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type MovieAction = 'watched' | 'watchlist' | 'liked' | 'disliked' | 'skip';

export default function DiscoverScreen() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showNextCard, setShowNextCard] = useState(false);
  const { user } = useAuth();
  const { colors } = useTheme();
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [showRating, setShowRating] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    loadInitialMovies();
  }, []);

  const loadInitialMovies = async () => {
    try {
      setLoading(true);
      const success = await loadMovies();
      if (!success) {
        console.error('Failed to load initial movies');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (movies.length > 0 && !isAnimating) {
      translateX.value = 0;
      translateY.value = 0;
      setShowNextCard(false);
    }
  }, [currentIndex, isAnimating]);

  useEffect(() => {
    let isMounted = true;

    const loadRating = async () => {
      try {
        if (!user?.id || !movies[currentIndex]?.id) return;

        const { data, error } = await supabase
          .from('movie_interactions')
          .select('action')
          .eq('user_id', user.id)
          .eq('movie_id', movies[currentIndex].id)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          // liked veya watched ise 5 yıldız, değilse 0
          setCurrentRating(
            data?.action === 'liked' || data?.action === 'watched' ? 5 : 0
          );
        }
      } catch (error) {
        console.error('Error loading rating:', error);
      }
    };

    loadRating();

    return () => {
      isMounted = false;
    };
  }, [currentIndex, user?.id, movies]);

  const loadMovies = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return false;

      // Tüm etkileşimleri al (sadece movie_id'leri)
      const { data: interactedMovies, error: interactionsError } = await supabase
        .from('movie_interactions')
        .select('movie_id')
        .eq('user_id', user.id);

      if (interactionsError) throw interactionsError;

      // Mevcut filmlerin ID'lerini de ekle
      const interactedMovieIds = new Set([
        ...(interactedMovies?.map(m => m.movie_id) || []),
        ...movies.map(m => m.id) // Mevcut filmleri de ekle
      ]);

      const categories = [
        { name: 'popular', fetch: getPopularMovies },
        { name: 'top rated', fetch: getTopRatedMovies },
        { name: 'trending', fetch: getTrendingMovies },
        { name: 'upcoming', fetch: getUpcomingMovies }
      ];

      let filteredMovies: Movie[] = [];
      
      for (const category of categories) {
        const movies = await category.fetch();
        const filtered = movies.filter(movie => !interactedMovieIds.has(movie.id));
        
        if (filtered.length > 0) {
          filteredMovies = filtered;
          break;
        }

        for (let page = 2; page <= 5; page++) {
          const nextPageMovies = await category.fetch(page);
          const filteredNextPage = nextPageMovies.filter(movie => !interactedMovieIds.has(movie.id));
          
          if (filteredNextPage.length > 0) {
            filteredMovies = filteredNextPage;
            break;
          }
        }

        if (filteredMovies.length > 0) break;
      }

      if (filteredMovies.length > 0) {
        // Mevcut filmleri temizle ve yeni filmleri ekle
        setMovies(filteredMovies);
        setCurrentIndex(0); // Index'i sıfırla
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in loadMovies:', error);
      return false;
    }
  }, [movies]); // movies'i dependency array'e ekle

  const handleMovieAction = async (action: MovieAction) => {
    if (isAnimating || !movies[currentIndex]) return;

    try {
      setIsAnimating(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      // Eğer like ise rating modalını göster
      if (action === 'liked') {
        setSelectedMovie(movies[currentIndex]);
        setShowRating(true);
        return;
      }

      // Film etkileşimini kaydet
      const { error: interactionError } = await supabase
        .from('movie_interactions')
        .upsert({
          user_id: user.id,
          movie_id: movies[currentIndex].id,
          title: movies[currentIndex].title || 'Unknown Movie',
          poster_path: movies[currentIndex].poster_path || '/default-poster.jpg',
          action: action,
          created_at: new Date().toISOString()
        });

      if (interactionError) {
        console.error('Error saving interaction:', interactionError);
        throw interactionError;
      }

      // Sonraki filme geç
      setCurrentIndex(prev => prev + 1);

      // Film sayısı azaldıysa yeni filmler yükle
      if (currentIndex >= movies.length - 2) {
        loadMovies();
      }
    } catch (error) {
      console.error('Error in handleAction:', error);
    } finally {
      setIsAnimating(false);
    }
  };

  const handleRating = async (rating: number) => {
    try {
      if (!user?.id || !selectedMovie) return;

      // Film etkileşimini kaydet
      const { error: interactionError } = await supabase
        .from('movie_interactions')
        .upsert({
          user_id: user.id,
          movie_id: selectedMovie.id,
          title: selectedMovie.title || 'Unknown Movie',
          poster_path: selectedMovie.poster_path || '/default-poster.jpg',
          action: rating >= 3 ? 'liked' : 'disliked',
          rating: rating,
          created_at: new Date().toISOString()
        });

      if (interactionError) throw interactionError;

      setCurrentRating(rating);
      setShowRating(false);
      setSelectedMovie(null);
      setCurrentIndex(prev => prev + 1);

      if (currentIndex >= movies.length - 2) {
        loadMovies();
      }
    } catch (error) {
      console.error('Error saving rating:', error);
    } finally {
      setIsAnimating(false);
    }
  };

  const handleSkip = () => {
    setShowRating(false);
    setSelectedMovie(null);
    setIsAnimating(false);
  };

  const handleSwipeRight = () => {
    translateX.value = withSpring(SCREEN_WIDTH * 1.5, {
      damping: 20,
      stiffness: 100,
    });

    setTimeout(() => {
      translateX.value = 0;
      translateY.value = 0;
      setIsAnimating(false);
      setShowRating(true);
    }, 300);
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      // Başlangıç pozisyonunu kaydet
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(setIsAnimating)(true);
        runOnJS(handleSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(setIsAnimating)(true);
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, {
          damping: 20,
          stiffness: 100,
        }, () => {
          runOnJS(handleMovieAction)('disliked');
        });
      } else if (event.translationY < -SWIPE_THRESHOLD) {
        runOnJS(setIsAnimating)(true);
        translateY.value = withSpring(-SCREEN_HEIGHT, {
          damping: 20,
          stiffness: 100,
        }, () => {
          runOnJS(handleMovieAction)('watchlist');
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        runOnJS(setIsAnimating)(false);
      }
    },
  });

  const currentCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${(translateX.value / SCREEN_WIDTH) * 20}deg` },
    ],
  }));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    cardWrapper: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContainer: {
      width: SCREEN_WIDTH * 0.9,
      height: SCREEN_HEIGHT * 0.85,
      maxWidth: 400,
      position: 'relative',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      color: colors.text,
      fontSize: 16,
      textAlign: 'center',
    },
    noContentTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    noContentSubtitle: {
      fontSize: 16,
    },
    ratingModalContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    ratingModalContent: {
      position: 'relative',
      backgroundColor: colors.surface,
      padding: 30,
      borderRadius: 20,
      alignItems: 'center',
      width: Math.min(350, SCREEN_WIDTH * 0.85),
      marginHorizontal: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    ratingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    ratingTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 24,
      textAlign: 'center',
    },
    skipButton: {
      marginTop: 24,
      padding: 12,
    },
    skipText: {
      fontSize: 16,
      fontWeight: '500',
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!movies.length) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <MaterialCommunityIcons 
          name="movie-off" 
          size={64} 
          color={colors.textSecondary} 
        />
        <Text style={[styles.noContentTitle, { color: colors.text }]}>
          No Movies Available
        </Text>
        <Text style={[styles.noContentSubtitle, { color: colors.textSecondary }]}>
          Please try again later
        </Text>
      </View>
    );
  }

  if (currentIndex >= movies.length) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.errorText}>Loading more movies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.cardWrapper}>
            <View style={styles.cardContainer}>
              {currentIndex + 1 < movies.length && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
                  <MovieCard
                    movie={movies[currentIndex + 1]}
                    onAction={handleMovieAction}
                    isAnimating={isAnimating}
                  />
                </View>
              )}
              {currentIndex < movies.length && (
                <PanGestureHandler onGestureEvent={gestureHandler}>
                  <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1 }, currentCardStyle]}>
                    <MovieCard
                      movie={movies[currentIndex]}
                      onAction={handleMovieAction}
                      isAnimating={isAnimating}
                    />
                  </Animated.View>
                </PanGestureHandler>
              )}
            </View>
          </View>
        </View>
      </GestureHandlerRootView>

      <Modal
        visible={showRating}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleSkip}
      >
        <View style={styles.ratingModalContainer}>
          <View 
            style={[
              styles.ratingModalContent, 
              { backgroundColor: colors.surface }
            ]}
          >
            <Text style={[styles.ratingTitle, { color: colors.text }]}>
              Rate this movie
            </Text>
            <View style={styles.ratingContainer}>
              <Rating
                rating={currentRating}
                onRate={handleRating}
                size={44}
                disabled={isAnimating}
              />
            </View>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                Skip
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}