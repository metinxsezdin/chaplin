import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, RefreshControl, Dimensions, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/auth';
import { useTheme } from '../../contexts/theme';
import { movieGenres } from '../../lib/tmdb/genres';
import { supabase } from '../../lib/supabase';
import { EditProfileModal } from '../../components/profile/EditProfileModal';
import { NotificationsModal } from '../../components/profile/NotificationsModal';
import { PrivacyModal } from '../../components/profile/PrivacyModal';
import { useNotifications } from '../../hooks/useNotifications';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import type { Profile } from '../../types/profile';

const { width } = Dimensions.get('window');
const STAT_SIZE = (width - 48) / 2;

interface MovieInteraction {
  movie_id: number;
  action: 'watched' | 'watchlist' | 'liked' | 'disliked';
  rating?: number;
  created_at: string;
  movies: {
    id: number;
    title: string;
    poster_path: string;
    genre_ids: number[];
  };
}

interface Stats {
  watched: number;
  liked: number;
  disliked: number;
  watchlist: number;
  totalMovies: number;
  averageRating: number;
  topGenres: { genre: string; count: number }[];
  recentMovies: {
    id: number;
    title: string;
    poster_path: string;
    rating: number;
    created_at: string;
  }[];
}

export default function ProfileScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    newMatches: true,
    newMessages: true,
    movieSuggestions: true,
  });
  const [privacySettings, setPrivacySettings] = useState({
    profileVisible: true,
    showRatings: true,
  });
  const { notifications, loading: notificationsLoading } = useNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserGenres();
      loadStats();
    }
    checkPermissions();
  }, [user?.id]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    router.replace('/(auth)/phone-auth');
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const loadUserGenres = async () => {
    try {
      const { data: userGenres, error } = await supabase
        .from('user_genres')
        .select('genre_id')
        .eq('firebase_uid', user!.id);

      if (error) throw error;

      setSelectedGenres(userGenres?.map(g => g.genre_id.toString()) || []);
    } catch (error) {
      console.error('Error loading user genres:', error);
    } finally {
      setLoadingGenres(false);
    }
  };

  const toggleGenre = async (genreId: string) => {
    try {
      setLoadingGenres(true);
      if (selectedGenres.includes(genreId)) {
        // Remove genre
        const { error } = await supabase
          .from('user_genres')
          .delete()
          .eq('firebase_uid', user!.id)
          .eq('genre_id', genreId);

        if (error) throw error;
        setSelectedGenres(prev => prev.filter(id => id !== genreId));
      } else {
        // Add genre
        const { error } = await supabase
          .from('user_genres')
          .insert({
            firebase_uid: user!.id,
            genre_id: genreId
          });

        if (error) throw error;
        setSelectedGenres(prev => [...prev, genreId]);
      }
    } catch (error) {
      console.error('Error toggling genre:', error);
    } finally {
      setLoadingGenres(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      // Film etkileşimlerini al
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('movie_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (interactionsError) throw interactionsError;

      // Film detaylarını TMDB'den al
      const moviePromises = interactionsData.map(async (interaction) => {
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

          if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
          }

          const movieData = await response.json();
          console.log('Movie data:', movieData); // Debug için

          return {
            ...interaction,
            movie: {
              id: movieData.id,
              title: movieData.title,
              poster_path: movieData.poster_path,
              genre_ids: movieData.genres?.map(genre => genre.id.toString()) || [],
              release_date: movieData.release_date
            }
          };
        } catch (error) {
          console.error(`Error fetching movie ${interaction.movie_id}:`, error);
          return {
            ...interaction,
            movie: {
              id: interaction.movie_id,
              title: 'Movie Not Found',
              poster_path: null,
              genre_ids: [],
              release_date: ''
            }
          };
        }
      });

      const statsData = await Promise.all(moviePromises);

      // İstatistikleri hesapla
      const stats: Stats = {
        watched: 0,
        liked: 0,
        disliked: 0,
        watchlist: 0,
        totalMovies: 0,
        averageRating: 0,
        topGenres: [],
        recentMovies: []
      };

      // Aksiyon sayılarını hesapla
      statsData.forEach((interaction) => {
        if (interaction.action) {
          stats[interaction.action as keyof Pick<Stats, 'watched' | 'liked' | 'disliked' | 'watchlist'>]++;
        }
      });

      // Toplam film sayısı
      stats.totalMovies = statsData.length;

      // Ortalama rating
      const ratingsSum = statsData.reduce((sum, interaction) => sum + (interaction.rating || 0), 0);
      stats.averageRating = stats.totalMovies > 0 ? ratingsSum / stats.totalMovies : 0;

      // Beğenilen filmler
      const likedMovies = statsData
        .filter(interaction => 
          interaction.movie && // null check
          interaction.action === 'liked' // sadece liked aksiyonları
        )
        .map(interaction => ({
          id: interaction.movie_id,
          title: interaction.movie.title,
          poster_path: interaction.movie.poster_path,
          rating: interaction.rating || 0,
          created_at: interaction.created_at,
          action: interaction.action
        }));

      stats.recentMovies = likedMovies;

      // Top genres hesapla - null kontrolü ekle
      const genreCounts: { [key: string]: number } = {};
      statsData.forEach(interaction => {
        if (interaction.movie?.genre_ids?.length) {
          interaction.movie.genre_ids.forEach(genreId => {
            const genre = movieGenres.find(g => g.id === genreId)?.name;
            if (genre) {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            }
          });
        }
      });

      stats.topGenres = Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setStats(stats);

    } catch (error: any) {
      console.error('Error loading stats:', error);
      setError(error.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const loadUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      // Profil bilgilerini al
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Notification ayarlarını al
      const { data: notifications, error: notificationsError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!notificationsError && notifications) {
        setNotificationSettings({
          newMatches: notifications.newMatches,
          newMessages: notifications.newMessages,
          movieSuggestions: notifications.movieSuggestions,
        });
      }

      // Privacy ayarlarını al
      const { data: privacy, error: privacyError } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!privacyError && privacy) {
        setPrivacySettings({
          profileVisible: privacy.profileVisible,
          showRatings: privacy.showRatings,
        });
      }

      setProfile(profile);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (mediaStatus !== 'granted' || cameraStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please grant camera and photo library permissions to use this feature.',
          [
            { text: 'OK', onPress: () => console.log('Permission denied') },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
    }
  };

  const pickImage = async () => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: Platform.OS === 'ios' ? 0.8 : 0.5,
        base64: true,
      };

      Alert.alert(
        'Change Profile Photo',
        'Choose a photo source',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Camera',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchCameraAsync(options);
                await handleImagePickerResult(result);
              } catch (error) {
                console.error('Camera error:', error);
                Alert.alert('Error', 'Failed to take photo');
              }
            }
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync(options);
                await handleImagePickerResult(result);
              } catch (error) {
                console.error('Gallery error:', error);
                Alert.alert('Error', 'Failed to pick photo');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in pickImage:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const handleImagePickerResult = async (result: ImagePicker.ImagePickerResult) => {
    try {
      if (!result.canceled && result.assets[0].base64) {
        const base64Size = result.assets[0].base64.length * 0.75;
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (base64Size > maxSize) {
          Alert.alert(
            'File Too Large',
            'Please choose a smaller image (max 5MB)'
          );
          return;
        }

        await uploadAvatar(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error handling image result:', error);
      Alert.alert('Error', 'Failed to process selected image');
    }
  };

  const uploadAvatar = async (base64Image: string) => {
    try {
      setUploading(true);

      // Kullanıcı kontrolü
      if (!user?.id) {
        throw new Error('User not found');
      }

      // Dosya adını oluştur
      const fileName = `avatar-${user.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      // Base64'ü ArrayBuffer'a çevir
      const arrayBuffer = decode(base64Image);

      // Önce eski avatarı sil
      if (profile?.avatar_url) {
        const oldFilePath = profile.avatar_url.split('/').pop();
        if (oldFilePath) {
          await supabase.storage
            .from('avatars')
            .remove([`avatars/${oldFilePath}`]);
        }
      }

      // Supabase Storage'a yükle
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Public URL al
      const { data: { publicUrl }, error: urlError } = await supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (urlError) throw urlError;

      // Profili güncelle
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Sadece profile state'ini güncelle
      setProfile(updatedProfile);
      
      // Profil verilerini yeniden yükle
      await loadUserData();

      Alert.alert('Success', 'Profile photo updated successfully');

    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to update profile photo');
    } finally {
      setUploading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 40,
      paddingBottom: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    avatarContainer: {
      alignItems: 'center',
      marginBottom: 16,
      position: 'relative',
    },
    avatarImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    avatarText: {
      color: 'white',
      fontSize: 40,
      fontWeight: 'bold',
    },
    editButton: {
      position: 'absolute',
      right: -12,
      bottom: 0,
      backgroundColor: colors.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    phoneNumber: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 20,
      backgroundColor: colors.surface,
      marginBottom: 20,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      color: colors.text,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    statLabel: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemText: {
      color: colors.text,
      fontSize: 16,
      marginLeft: 16,
      flex: 1,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      justifyContent: 'center',
    },
    signOutButtonDisabled: {
      opacity: 0.7,
    },
    signOutButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 16,
    },
    genreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    genreItem: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    genreItemSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    genreText: {
      color: colors.text,
      fontSize: 14,
    },
    genreTextSelected: {
      color: '#fff',
      fontWeight: 'bold',
    },
    recentMoviesContainer: {
      gap: 12,
      paddingRight: 16,
    },
    movieCard: {
      width: 120,
      backgroundColor: '#fff',
      borderRadius: 8,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
    },
    moviePoster: {
      width: '100%',
      height: 180,
      resizeMode: 'cover',
    },
    movieInfo: {
      padding: 8,
    },
    movieTitle: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 4,
      color: '#000',
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      marginLeft: 4,
      fontSize: 14,
      color: '#666',
    },
    topGenresContainer: {
      gap: 12,
    },
    topGenreItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
    },
    genreRankContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    genreRank: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    genreDetails: {
      flex: 1,
    },
    genreName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    genreCount: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    watchDate: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingText: {
      fontSize: 16,
      fontWeight: '500',
    },
    uploadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 60,
    },
    editBadge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: colors.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: 'white',
    },
  });

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
      
      <TouchableOpacity
        style={[styles.settingItem, { backgroundColor: colors.surface }]}
        onPress={() => setShowEditProfile(true)}
      >
        <View style={styles.settingInfo}>
          <MaterialCommunityIcons name="account-edit" size={24} color={colors.primary} />
          <Text style={[styles.settingText, { color: colors.text }]}>Edit Profile</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.settingItem, { backgroundColor: colors.surface }]}
        onPress={() => setShowNotifications(true)}
      >
        <View style={styles.settingInfo}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={colors.primary} />
          <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.settingItem, { backgroundColor: colors.surface }]}
        onPress={() => setShowPrivacy(true)}
      >
        <View style={styles.settingInfo}>
          <MaterialCommunityIcons name="shield-outline" size={24} color={colors.primary} />
          <Text style={[styles.settingText, { color: colors.text }]}>Privacy</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.settingItem, { backgroundColor: colors.surface }]}
        onPress={handleSignOut}
      >
        <View style={styles.settingInfo}>
          <MaterialCommunityIcons name="logout" size={24} color={colors.error} />
          <Text style={[styles.settingText, { color: colors.error }]}>Sign Out</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Okunmamış bildirim sayısı
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={pickImage}
            disabled={uploading}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {profile?.first_name?.substring(0, 2).toUpperCase() || 'UP'}
                </Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.editBadge}>
                <MaterialCommunityIcons name="camera" size={20} color="white" />
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{profile?.first_name || 'User'}</Text>
        <Text style={styles.phoneNumber}>{profile?.phone || 'No phone number'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.liked || 0}</Text>
          <Text style={styles.statLabel}>Films Liked</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.averageRating.toFixed(1) || '0.0'}</Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Liked Movies</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentMoviesContainer}
        >
          {stats?.recentMovies.map((movie, index) => (
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
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : 'https://via.placeholder.com/500x750'
                }}
                style={styles.moviePoster}
              />
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle} numberOfLines={1}>
                  {movie.title || 'Movie Not Found'}
                </Text>
                <View style={styles.ratingContainer}>
                  <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.watchDate}>
                  {new Date(movie.created_at).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Movie Genres</Text>
        <View style={styles.genreGrid}>
          {movieGenres.map(genre => (
            <TouchableOpacity
              key={genre.id}
              style={[
                styles.genreItem,
                selectedGenres.includes(genre.id) && styles.genreItemSelected
              ]}
              onPress={() => toggleGenre(genre.id)}
              disabled={loadingGenres}
            >
              <Text style={[
                styles.genreText,
                selectedGenres.includes(genre.id) && styles.genreTextSelected
              ]}>
                {genre.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {renderSettings()}

      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        currentUser={{
          first_name: profile?.first_name || '',
          bio: profile?.bio,
        }}
        onUpdate={loadUserData}
      />

      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        settings={notificationSettings}
        onUpdate={() => {
          loadUserData();
          // Notification ayarlarını yeniden yükle
        }}
      />

      <PrivacyModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        settings={privacySettings}
        onUpdate={() => {
          loadUserData();
          // Privacy ayarlarını yeniden yükle
        }}
      />
    </ScrollView>
  );
}