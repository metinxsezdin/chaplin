import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/auth';
import { useTheme } from '../../contexts/theme';
import { supabase } from '../../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TMDB_IMAGE_URL } from '../../lib/tmdb';

const { width } = Dimensions.get('window');

interface MovieData {
  id: number;
  title: string;
  poster_path: string | null;
}

interface CommonMovie {
  movie_id: number;
  movies: MovieData;
}

interface Match {
  id: number;
  user: {
    id: string;
    first_name: string;
    avatar_url: string | null;
  };
  match_score: number;
  common_movies: MovieData[];
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .order('match_score', { ascending: false });

      if (matchError) throw matchError;

      const matchPromises = matchData.map(async (match) => {
        const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;

        // Profil bilgilerini al
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, avatar_url')
          .eq('id', otherUserId)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
          return null;
        }

        // Son mesajı al
        const { data: lastMessageData, error: messageError } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('match_id', match.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Ortak filmleri al
        const { data: commonMovies, error: moviesError } = await supabase
          .from('movie_interactions')
          .select('movie_id, title, poster_path')
          .eq('user_id', user.id)
          .eq('action', 'liked')
          .in('movie_id', (
            await supabase
              .from('movie_interactions')
              .select('movie_id')
              .eq('user_id', otherUserId)
              .eq('action', 'liked')
          ).data?.map(m => m.movie_id) || []);

        if (moviesError) {
          console.error('Error loading common movies:', moviesError);
          return null;
        }

        return {
          id: match.id,
          user: {
            id: profileData.id,
            first_name: profileData.first_name,
            avatar_url: profileData.avatar_url
          },
          match_score: match.match_score,
          common_movies: commonMovies.map(m => ({
            id: m.movie_id,
            title: m.title,
            poster_path: m.poster_path
          })),
          created_at: match.created_at,
          last_message: lastMessageData || undefined
        };
      });

      const results = await Promise.all(matchPromises);
      const validMatches = results.filter((match): match is Match => match !== null);
      setMatches(validMatches);

    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={[styles.matchCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        router.push({
          pathname: '/matches/[id]',
          params: { id: item.id }
        });
      }}
    >
      <View style={styles.matchHeader}>
        <View style={styles.userInfo}>
          {item.user.avatar_url ? (
            <Image
              source={{ uri: item.user.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {item.user.first_name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {item.user.first_name}
            </Text>
            {item.last_message ? (
              <Text 
                style={[styles.lastMessage, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.last_message.sender_id === user?.id ? 'You: ' : ''}{item.last_message.content}
              </Text>
            ) : (
              <Text style={[styles.matchScore, { color: colors.textSecondary }]}>
                {item.match_score} movies in common
              </Text>
            )}
          </View>
        </View>
        <MaterialCommunityIcons
          name="chat"
          size={24}
          color={colors.primary}
        />
      </View>

      {item.common_movies.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Common Movies ({item.common_movies.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieList}
          >
            {item.common_movies.map((movie, index) => (
              <TouchableOpacity
                key={`${movie.id}-${index}`}
                style={styles.movieCard}
                onPress={() => router.push({
                  pathname: '/movie/[id]',
                  params: { id: movie.id }
                })}
              >
                <Image
                  source={{
                    uri: movie.poster_path
                      ? `${TMDB_IMAGE_URL}/w342${movie.poster_path}`
                      : 'https://via.placeholder.com/342x513'
                  }}
                  style={styles.moviePoster}
                  resizeMode="cover"
                />
                <Text 
                  style={[styles.movieTitle, { color: colors.text }]} 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {movie.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (matches.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, styles.centered]}>
          <MaterialCommunityIcons
            name="account-multiple"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No matches yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Like more movies to find matches!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  matchCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  matchScore: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
    fontWeight: '600',
  },
  movieList: {
    paddingVertical: 8,
    gap: 12,
  },
  movieCard: {
    width: 120,
    marginRight: 12,
  },
  moviePoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  movieTitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  separator: {
    height: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: 'gray',
    marginTop: 2,
    paddingRight: 8,
  },
});