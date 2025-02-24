import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { TMDB_IMAGE_URL } from '../../lib/tmdb';

const { width } = Dimensions.get('window');
const GRID_SIZE = 3; // 3x3 grid
const POSTER_SIZE = width / GRID_SIZE;

interface MoviePoster {
  id: number;
  poster_path: string;
}

export default function EmailAuthScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posters, setPosters] = useState<MoviePoster[]>([]);
  const [currentPosters, setCurrentPosters] = useState<MoviePoster[]>([]);
  const [nextPosters, setNextPosters] = useState<MoviePoster[]>([]);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // Film posterlerini yükle
  useEffect(() => {
    const loadMoviePosters = async () => {
      try {
        const response = await fetch(
          'https://api.themoviedb.org/3/movie/popular?language=en-US&page=1',
          {
            headers: {
              'Authorization': `Bearer ${process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await response.json();
        const validPosters = data.results
          .filter((movie: any) => movie.poster_path)
          .map((movie: any) => ({
            id: movie.id,
            poster_path: movie.poster_path
          }));
        setPosters(validPosters);
        setCurrentPosters(validPosters.slice(0, 9));
        setNextPosters(validPosters.slice(9, 18));
      } catch (error) {
        console.error('Error loading movie posters:', error);
      }
    };

    loadMoviePosters();
  }, []);

  // Posterleri değiştir
  useEffect(() => {
    if (posters.length === 0) return;

    const changePosterInterval = setInterval(() => {
      Animated.sequence([
        // Mevcut posterleri soldur
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Yeni posterleri göster
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Posterleri güncelle
        setCurrentPosters(nextPosters);
        const nextIndex = (posters.indexOf(nextPosters[8]) + 1) % posters.length;
        setNextPosters(posters.slice(nextIndex, nextIndex + 9));
      });
    }, 5000);

    return () => clearInterval(changePosterInterval);
  }, [posters, nextPosters]);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!email) {
        throw new Error('Please enter your email');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: 'moviemate://onboarding'
        }
      });
      
      if (error) throw error;

      // Başarılı mesajı göster
      Alert.alert(
        'Check your email',
        'We sent you a magic link to sign in',
        [{ text: 'OK' }]
      );

    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Arka plan grid'i */}
      <Animated.View style={[styles.backgroundGrid, { opacity: fadeAnim }]}>
        {currentPosters.map((movie, index) => (
          <Image
            key={`${movie.id}-${index}`}
            source={{ uri: `${TMDB_IMAGE_URL}/w342${movie.poster_path}` }}
            style={styles.posterImage}
            blurRadius={Platform.OS === 'ios' ? 10 : 5}
          />
        ))}
      </Animated.View>

      {/* Karartma katmanı */}
      <View style={styles.overlay} />

      {/* Login formu */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.formContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.title}>MovieMate</Text>
            <Text style={styles.subtitle}>Find your perfect movie match</Text>
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue with Email</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  posterImage: {
    width: POSTER_SIZE,
    height: POSTER_SIZE * 1.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorContainer: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#e50914',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 