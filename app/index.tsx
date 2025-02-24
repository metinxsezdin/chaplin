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
  Image,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { router, Redirect } from 'expo-router';
import { signInWithEmail } from '../lib/auth';
import { useAuth } from '../contexts/auth';
import { TMDB_IMAGE_URL } from '../lib/tmdb';

const { width, height } = Dimensions.get('window');
const POSTER_SIZE = width / 3; // 3 afiş yan yana
const POSTER_HEIGHT = POSTER_SIZE * 1.5;
const DURATION = 40000; // Her satırın hareket süresi (ms)
const ROWS = Math.ceil(height / POSTER_HEIGHT) + 1; // Ekranı kaplamak için gereken satır sayısı
const POSTERS_PER_ROW = Math.ceil(width / POSTER_SIZE) + 4; // Ekstra poster ekledik

interface MoviePoster {
  id: number;
  poster_path: string;
}

export default function EmailAuthScreen() {
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posters, setPosters] = useState<MoviePoster[]>([]);
  const rowAnimations = [...Array(ROWS)].map(() => new Animated.Value(0));

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!email) {
        throw new Error('Please enter your email');
      }

      const response = await signInWithEmail(email);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to sign in');
      }

      // Başarılı giriş sonrası onboarding'e yönlendir
      router.replace('/(auth)/onboarding');

    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

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
      } catch (error) {
        console.error('Error loading movie posters:', error);
      }
    };

    loadMoviePosters();
  }, []);

  // Animasyonları başlat
  useEffect(() => {
    if (posters.length === 0) return;

    // Her satır için sonsuz animasyon
    rowAnimations.forEach((anim, index) => {
      const isEven = index % 2 === 0;
      const startPosition = isEven ? 0 : -POSTER_SIZE * POSTERS_PER_ROW;
      const endPosition = isEven ? -POSTER_SIZE * POSTERS_PER_ROW : 0;

      anim.setValue(startPosition);

      Animated.loop(
        Animated.timing(anim, {
          toValue: endPosition,
          duration: DURATION,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });

    return () => {
      rowAnimations.forEach(anim => anim.stopAnimation());
    };
  }, [posters]);

  const renderPosterRow = (rowIndex: number) => {
    const isEven = rowIndex % 2 === 0;
    const startIndex = (rowIndex * POSTERS_PER_ROW) % posters.length;
    const rowPosters = [
      ...posters.slice(startIndex),
      ...posters.slice(0, startIndex),
      ...posters.slice(startIndex),
      ...posters.slice(0, POSTERS_PER_ROW * 2), // Daha fazla ekstra poster
    ];

    return (
      <Animated.View
        key={rowIndex}
        style={[
          styles.posterRow,
          {
            transform: [{ translateX: rowAnimations[rowIndex] }],
          }
        ]}
      >
        {rowPosters.map((movie, index) => (
          <Image
            key={`${movie.id}-${index}`}
            source={{ uri: `${TMDB_IMAGE_URL}/w342${movie.poster_path}` }}
            style={styles.posterImage}
            blurRadius={Platform.OS === 'ios' ? 4 : 5}
          />
        ))}
      </Animated.View>
    );
  };

  // Yükleme durumu
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundContainer}>
          {[...Array(ROWS)].map((_, index) => renderPosterRow(index))}
        </View>
        <View style={styles.overlay} />
      </View>
    );
  }

  // Yönlendirme
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundContainer}>
          {[...Array(ROWS)].map((_, index) => renderPosterRow(index))}
        </View>
        <View style={styles.overlay} />
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
              placeholderTextColor="#999"
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

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  posterRow: {
    flexDirection: 'row',
    height: POSTER_HEIGHT,
    marginLeft: -2, // Posterler arası boşluğu kapat
  },
  posterImage: {
    width: POSTER_SIZE,
    height: POSTER_HEIGHT,
    marginHorizontal: 1, // Minimal boşluk
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)', // 0.75'ten 0.6'ya düşürdük
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#e50914',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 