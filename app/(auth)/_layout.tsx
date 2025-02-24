import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="index"
        options={{
          title: 'Sign In',
        }}
      />
      <Stack.Screen 
        name="onboarding"
        options={{
          title: 'Welcome',
          gestureEnabled: false
        }}
      />
    </Stack>
  );
}

// Auth grubunun başlangıç sayfası
export const unstable_settings = {
  initialRouteName: 'index',
};