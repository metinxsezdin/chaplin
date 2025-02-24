import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useAuth } from '../../contexts/auth';
import { useTheme } from '../../contexts/theme';
import { supabase } from '../../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TMDB_IMAGE_URL } from '../../lib/tmdb';
import { movieGenres } from '../../lib/tmdb/genres';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

interface MovieInteraction {
  movie_id: number;
  title: string;
  poster_path: string | null;
  rating: number;
  action: 'liked' | 'watchlist';
  created_at: string;
  vote_average?: number;
  genres?: string[];
}

interface Filters {
  search: string;
  minRating: number;
  selectedGenres: string[];
  minImdbRating: number;
}

export default function LibraryScreen() {
  const [movies, setMovies] = useState<MovieInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'liked' | 'watchlist'>('liked');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    minRating: 0,
    selectedGenres: [],
    minImdbRating: 0,
  });
  const { user } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    loadMovies();
  }, [activeTab]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      // Seçili tab'a göre filmleri al
      const { data: interactions, error: interactionsError } = await supabase
        .from('movie_interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('action', activeTab)
        .order('created_at', { ascending: false });

      if (interactionsError) throw interactionsError;

      // Film detaylarını TMDB'den al
      const moviePromises = interactions.map(async (interaction) => {
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/movie/${interaction.movie_id}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (!response.ok) throw new Error('TMDB API error');
          const movieData = await response.json();

          return {
            movie_id: interaction.movie_id,
            title: movieData.title,
            poster_path: movieData.poster_path,
            rating: interaction.rating || 0,
            action: interaction.action,
            created_at: interaction.created_at,
            vote_average: movieData.vote_average,
            genres: movieData.genres.map(g => g.name)
          };
        } catch (error) {
          console.error('Error fetching movie:', error);
          return null;
        }
      });

      let moviesData = (await Promise.all(moviePromises)).filter((m): m is MovieInteraction => m !== null);

      // Varsayılan olarak tarihe göre sırala
      moviesData = moviesData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setMovies(moviesData);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme fonksiyonu
  const filterMovies = (movies: MovieInteraction[]) => {
    return movies.filter(movie => {
      // Başlık araması
      if (filters.search && !movie.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Minimum kullanıcı puanı
      if (filters.minRating > 0 && movie.rating < filters.minRating) {
        return false;
      }

      // Minimum IMDB puanı
      if (filters.minImdbRating > 0 && (movie.vote_average || 0) < filters.minImdbRating) {
        return false;
      }

      // Seçili türler
      if (filters.selectedGenres.length > 0 && 
          !movie.genres?.some(genre => filters.selectedGenres.includes(genre))) {
        return false;
      }

      return true;
    });
  };

  const renderMovie = ({ item }: { item: MovieInteraction }) => (
    <TouchableOpacity
      style={[styles.movieCard, { backgroundColor: colors.surface }]}
      onPress={() => router.push({
        pathname: '/movie/[id]',
        params: { id: item.movie_id }
      })}
    >
      <Image
        source={{
          uri: item.poster_path
            ? `${TMDB_IMAGE_URL}/w500${item.poster_path}`
            : 'https://via.placeholder.com/500x750'
        }}
        style={styles.poster}
      />
      <View style={styles.movieInfo}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.ratingContainer}>
          <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
          <Text style={[styles.rating, { color: colors.textSecondary }]}>
            {item.rating.toFixed(1)}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {item.action.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'liked' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab('liked')}
            >
              <MaterialCommunityIcons
                name="heart"
                size={20}
                color={activeTab === 'liked' ? '#fff' : colors.textSecondary}
              />
              <Text style={[
                styles.tabText,
                activeTab === 'liked' && { color: '#fff' }
              ]}>
                Liked
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'watchlist' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab('watchlist')}
            >
              <MaterialCommunityIcons
                name="bookmark"
                size={20}
                color={activeTab === 'watchlist' ? '#fff' : colors.textSecondary}
              />
              <Text style={[
                styles.tabText,
                activeTab === 'watchlist' && { color: '#fff' }
              ]}>
                Watchlist
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search movies..."
              placeholderTextColor={colors.textSecondary}
              value={filters.search}
              onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              showFilters && { backgroundColor: colors.primary }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={20}
              color={showFilters ? '#fff' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
            
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                Minimum Rating
              </Text>
              <View style={styles.ratingButtons}>
                {[0, 3, 4, 5].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      filters.minRating === rating && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      filters.minRating === rating && { color: '#fff' }
                    ]}>
                      {rating === 0 ? 'All' : `${rating}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                Minimum IMDB Rating
              </Text>
              <View style={styles.ratingButtons}>
                {[0, 6, 7, 8].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      filters.minImdbRating === rating && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, minImdbRating: rating }))}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      filters.minImdbRating === rating && { color: '#fff' }
                    ]}>
                      {rating === 0 ? 'All' : `${rating}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                Genres
              </Text>
              <View style={styles.genreGrid}>
                {movieGenres.map(genre => (
                  <TouchableOpacity
                    key={genre.id}
                    style={[
                      styles.genreButton,
                      filters.selectedGenres.includes(genre.name) && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => {
                      setFilters(prev => ({
                        ...prev,
                        selectedGenres: prev.selectedGenres.includes(genre.name)
                          ? prev.selectedGenres.filter(g => g !== genre.name)
                          : [...prev.selectedGenres, genre.name]
                      }));
                    }}
                  >
                    <Text style={[
                      styles.genreButtonText,
                      filters.selectedGenres.includes(genre.name) && { color: '#fff' }
                    ]}>
                      {genre.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : movies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="movie-off"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No movies found
            </Text>
          </View>
        ) : (
          <FlatList
            data={filterMovies(movies)}
            renderItem={renderMovie}
            keyExtractor={(item) => `${item.movie_id}-${item.action}`}
            numColumns={2}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.columnWrapper}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
  },
  list: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  movieCard: {
    width: COLUMN_WIDTH,
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
  poster: {
    width: '100%',
    aspectRatio: 2/3,
    resizeMode: 'cover',
  },
  movieInfo: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  rating: {
    fontSize: 12,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
    paddingHorizontal: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    padding: 16,
    paddingTop: 0,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  ratingButtonText: {
    fontSize: 14,
    color: '#ccc',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  genreButtonText: {
    fontSize: 14,
    color: '#ccc',
  },
}); 