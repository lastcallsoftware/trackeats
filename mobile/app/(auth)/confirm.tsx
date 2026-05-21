/**
 * Email confirmation return screen.
 *
 * The backend redirects mobile email-confirmation browser clicks here after it
 * has validated the token, so the user lands back in the app instead of on JSON.
 */

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function ConfirmReturnScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace({ pathname: '/login', params: { registration: 'confirmed' } });
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.message}>Email confirmed. Opening login...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  message: {
    marginTop: 16,
    color: '#333',
    fontSize: 16,
    textAlign: 'center',
  },
});
