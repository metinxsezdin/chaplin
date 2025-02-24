import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/auth';
import { useTheme } from '../../contexts/theme';
import { supabase } from '../../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  match_id: string;
}

interface ChatUser {
  id: string;
  first_name: string;
  avatar_url: string | null;
}

export default function ChatModal() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadChatData();
    setupRealtimeSubscription();
  }, [id]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadChatData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadMessages(), loadChatUser()]);
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatUser = async () => {
    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .eq('id', id)
        .single();

      if (matchError) throw matchError;

      const otherUserId = matchData.user1_id === user?.id ? matchData.user2_id : matchData.user1_id;

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, first_name, avatar_url')
        .eq('id', otherUserId)
        .single();

      if (userError) throw userError;
      setChatUser(userData);
    } catch (error) {
      console.error('Error loading chat user:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${id}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || isSending) return;

    try {
      setIsSending(true);
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: id,
          sender_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === user?.id;
    const messageDate = new Date(item.created_at);

    return (
      <Animated.View 
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.theirMessage,
          { opacity: fadeAnim }
        ]}
      >
        {!isMyMessage && chatUser?.avatar_url && (
          <Image
            source={{ uri: chatUser.avatar_url }}
            style={styles.avatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isMyMessage ? [styles.myMessageBubble, { backgroundColor: colors.primary }] : [styles.theirMessageBubble, { backgroundColor: colors.surface }]
        ]}>
          <Text style={[
            styles.messageText,
            { color: isMyMessage ? '#fff' : colors.text }
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            { color: isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
          ]}>
            {format(messageDate, 'HH:mm')}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 105 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && { flex: 1 }
          ]}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />
        <View style={[
          styles.inputContainer, 
          { 
            backgroundColor: colors.surface,
            paddingBottom: Platform.OS === 'ios' ? 30 : 8 
          }
        ]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            keyboardType="default"
            returnKeyType="send"
            enablesReturnKeyAutomatically={true}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: newMessage.trim() ? colors.primary : colors.textSecondary }
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 32,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 