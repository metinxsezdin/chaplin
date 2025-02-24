import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MovieDetails, getMovieDetails, TMDB_IMAGE_URL } from '../../lib/tmdb';
import { useTheme } from '../../contexts/theme';
import { Rating } from '../../components/Rating';

export default function MovieDetailScreen() {
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? parseInt(params.id, 10) : params.id;
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    loadMovieDetails();
  }, [id]);

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      if (!id) {
        throw new Error('Invalid movie ID');
      }
      const details = await getMovieDetails(id);
      setMovie(details);
    } catch (error) {
      console.error('Error loading movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Failed to load movie details
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Image
        source={{ 
          uri: movie.backdrop_path 
            ? `${TMDB_IMAGE_URL}/original${movie.backdrop_path}`
            : 'https://via.placeholder.com/1920x1080'
        }}
        style={styles.backdrop}
      />
      <View style={styles.detailsContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {movie.title}
        </Text>
        <Text style={[styles.overview, { color: colors.textSecondary }]}>
          {movie.overview}
        </Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {new Date(movie.release_date).getFullYear()}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {movie.runtime} min
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Rating: {movie.vote_average.toFixed(1)}
          </Text>
        </View>
        <View style={styles.genreContainer}>
          {movie.genres.map(genre => (
            <View 
              key={genre.id} 
              style={[styles.genreTag, { backgroundColor: colors.primary + '20' }]}
            >
              <Text style={[styles.genreText, { color: colors.primary }]}>
                {genre.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  overview: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 