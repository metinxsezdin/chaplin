import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Rating } from './Rating';
import { WatchedMovieData } from '../types/movies';
import { TMDB_IMAGE_URL } from '../lib/tmdb';
import { useTheme } from '../contexts/theme';

interface WatchedMovieCardProps {
  movie: WatchedMovieData;
  onRate?: (rating: number) => void;
  isGrid?: boolean;
  onLongPress?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function WatchedMovieCard({ 
  movie, 
  onRate, 
  isGrid,
  onLongPress 
}: WatchedMovieCardProps) {
  const router = useRouter();
  const { colors } = useTheme();

  const handlePress = () => {
    router.push({
      pathname: '/movie/[id]',
      params: { 
        id: movie.movies.tmdb_id || movie.movie_id,
        title: movie.movies.title
      }
    });
  };

  if (isGrid) {
    return (
      <TouchableOpacity 
        style={[styles.gridItem, { backgroundColor: colors.surface }]}
        onPress={handlePress}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        <Image
          source={{ 
            uri: movie.movies.poster_path 
              ? `${TMDB_IMAGE_URL}/w500${movie.movies.poster_path}`
              : 'https://via.placeholder.com/500x750'
          }}
          style={styles.gridPoster}
        />
        <View style={styles.gridInfo}>
          <Text 
            numberOfLines={1} 
            style={[styles.gridTitle, { color: colors.text }]}
          >
            {movie.movies.title}
          </Text>
          <Rating
            rating={movie.rating || 0}
            onRate={onRate}
            small
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.listItem, { backgroundColor: colors.surface }]}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <Image
        source={{ 
          uri: movie.movies.poster_path 
            ? `${TMDB_IMAGE_URL}/w500${movie.movies.poster_path}`
            : 'https://via.placeholder.com/500x750'
        }}
        style={styles.listPoster}
      />
      <View style={styles.listInfo}>
        <Text 
          numberOfLines={2} 
          style={[styles.listTitle, { color: colors.text }]}
        >
          {movie.movies.title}
        </Text>
        <Rating
          rating={movie.rating || 0}
          onRate={onRate}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  listPoster: {
    width: 80,
    height: 120,
    resizeMode: 'cover',
  },
  listInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gridItem: {
    width: (SCREEN_WIDTH - 48) / 2, // 2 sütun ve kenarlardan 16px padding
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  gridPoster: {
    width: '100%',
    aspectRatio: 2/3,
    resizeMode: 'cover',
  },
  gridInfo: {
    padding: 12,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
}); 