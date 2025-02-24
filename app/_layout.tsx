import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ThemeProvider, useTheme } from '../contexts/theme';
import { AuthProvider } from '../contexts/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Auth durumuna göre yönlendirme yap
      const inAuthGroup = segments[0] === '(auth)';
      
      if (session && inAuthGroup) {
        // Oturum açık ve auth sayfalarındaysa ana sayfaya yönlendir
        router.replace('/(tabs)/discover');
      } else if (!session && segments[0] !== '(auth)') {
        // Oturum kapalı ve auth sayfalarında değilse login'e yönlendir
        router.replace('/');
      }
    });

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const inAuthGroup = segments[0] === '(auth)';

      if (session && inAuthGroup) {
        router.replace('/(tabs)/discover');
      } else if (!session && segments[0] !== '(auth)') {
        router.replace('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [segments]);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      }}
    >
      {/* Ana sayfa olarak email-auth */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      
      {/* Diğer sayfalar */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen
        name="matches/[id]"
        options={{
          presentation: 'modal',
          headerTitle: "Chat",
          headerShown: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <GestureHandlerRootView style={styles.container}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </ThemeProvider>
    </AuthProvider>
  );
}

// Başlangıç sayfasını belirt
export const unstable_settings = {
  initialRouteName: '(auth)',
};