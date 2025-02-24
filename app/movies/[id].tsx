import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Rating } from '../../components/Rating';
import { useAuth } from '../../contexts/auth';
import { SharedElement } from 'react-navigation-shared-element';

const { width } = Dimensions.get('window');
const POSTER_ASPECT_RATIO = 27 / 40;
const POSTER_WIDTH = width * 0.6;
const POSTER_HEIGHT = POSTER_WIDTH * (1 / POSTER_ASPECT_RATIO);

interface MovieDetails {
  id: string;  // UUID tipinde
  tmdb_id: number;  // TMDB'den gelen numerik ID
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    loadMovieDetails();
    loadUserRating();
  }, [id]);

  const loadMovieDetails = async () => {
    try {
      const { data: movieData, error } = await supabase
        .from('movies')
        .select(`
          id,
          tmdb_id,
          title,
          overview,
          poster_path,
          backdrop_path,
          release_date,
          vote_average
        `)
        .eq('tmdb_id', Number(id))
        .single();

      if (error) throw error;
      setMovie(movieData);
    } catch (error) {
      console.error('Error loading movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRating = async () => {
    try {
      const { data, error } = await supabase
        .from('user_ratings')
        .select('rating')
        .eq('user_id', user!.id)
        .eq('movie_id', movie?.id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') throw error;
      } else {
        setUserRating(data.rating);
      }
    } catch (error) {
      console.error('Error loading user rating:', error);
    }
  };

  const handleRate = async (rating: number) => {
    try {
      const { error } = await supabase
        .from('user_ratings')
        .upsert({
          user_id: user!.id,
          movie_id: movie?.id,
          rating
        }, {
          onConflict: 'user_id,movie_id'
        });

      if (error) throw error;
      setUserRating(rating);
    } catch (error) {
      console.error('Error rating movie:', error);
    }
  };

  if (loading || !movie) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <SharedElement id={`movie.${movie.id}.poster`}>
          <Animated.Image
            source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
            style={[styles.poster]}
            resizeMode="cover"
          />
        </SharedElement>

        <View style={styles.info}>
          <SharedElement id={`movie.${movie.id}.title`}>
            <Text style={styles.title}>{movie.title}</Text>
          </SharedElement>

          <View style={styles.metadata}>
            <Text style={styles.year}>
              {new Date(movie.release_date).getFullYear()}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.rating}>
              IMDb {movie.vote_average.toFixed(1)}
            </Text>
          </View>

          <View style={styles.ratingContainer}>
            <Rating
              rating={userRating}
              onRate={handleRate}
              disabled={isAnimating}
            />
          </View>

          <Text style={styles.overview}>{movie.overview}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 16,
  },
  info: {
    flex: 1,
    width: '100%',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  year: {
    fontSize: 16,
    color: '#666',
  },
  dot: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 8,
  },
  rating: {
    fontSize: 16,
    color: '#666',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  overview: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
  },
}); 