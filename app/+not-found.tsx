import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colors.background,
    },
    text: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    link: {
      marginTop: 15,
      paddingVertical: 15,
      color: colors.primary,
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.link}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
