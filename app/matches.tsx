import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { View, FlatList, TouchableOpacity, Image, Text, StyleSheet, RefreshControl } from 'react-native';
import { useAuth } from '../contexts/auth';
import { useTheme } from '../contexts/theme';
import { router } from 'expo-router';

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    fetchMatches();
    setupMatchesSubscription();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          user1:profiles!matches_user1_id_fkey(id, first_name, avatar_url),
          user2:profiles!matches_user2_id_fkey(id, first_name, avatar_url),
          messages:messages(
            id,
            content,
            created_at,
            sender_id,
            status,
            read_at
          )
        `)
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const setupMatchesSubscription = () => {
    // Match güncellemeleri için subscription
    const matchSubscription = supabase
      .channel('matches_changes')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE events
        schema: 'public',
        table: 'matches',
        filter: `user1_id=eq.${user?.id},user2_id=eq.${user?.id}`,
      }, () => {
        fetchMatches(); // Yeni match veya güncelleme olduğunda listeyi yenile
      })
      .subscribe();

    // Mesaj güncellemeleri için subscription
    const messageSubscription = supabase
      .channel('messages_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMessage = payload.new;
        // Mesajı ilgili match'e ekle
        setMatches(prevMatches => 
          prevMatches.map(match => {
            if (match.id === newMessage.match_id) {
              return {
                ...match,
                messages: [...(match.messages || []), newMessage]
              };
            }
            return match;
          })
        );
      })
      .subscribe();

    // Cleanup
    return () => {
      matchSubscription.unsubscribe();
      messageSubscription.unsubscribe();
    };
  };

  const getOtherUser = (match: Match) => {
    return match.user1_id === user?.id ? match.user2 : match.user1;
  };

  const getLastMessage = (match: Match) => {
    if (!match.messages || match.messages.length === 0) return null;
    return match.messages[match.messages.length - 1];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMatches();
    } catch (error) {
      console.error('Error refreshing matches:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item: match }) => {
          const otherUser = getOtherUser(match);
          const lastMessage = getLastMessage(match);

          return (
            <TouchableOpacity
              onPress={() => {
                // Navigate to chat
                router.push(`/matches/${match.id}`);
              }}
            >
              <View style={styles.matchItem}>
                <Image
                  source={{ uri: otherUser.avatar_url || undefined }}
                  style={styles.avatar}
                />
                <View style={styles.matchInfo}>
                  <Text style={styles.name}>{otherUser.first_name}</Text>
                  {lastMessage && (
                    <View style={styles.lastMessageContainer}>
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {lastMessage.content}
                      </Text>
                      {lastMessage.sender_id === user?.id && (
                        <Text style={styles.messageStatus}>
                          {lastMessage.read_at ? '✓✓' : 
                           lastMessage.status === 'delivered' ? '✓' : 
                           '•'}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  matchItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  matchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  messageStatus: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
}); 