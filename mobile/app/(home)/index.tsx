/**
 * Home screen placeholder for logged-in users
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import authStore from '@/store/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { username } = authStore();

  const handleLogout = async () => {
    try {
      await authStore.getState().logout();
      router.replace('/login');
    } catch (e) {
      console.debug('[HOME] Logout error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Trackeats!</Text>
      <Text style={styles.subtitle}>Logged in as {username}</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} testID="logout-button" activeOpacity={0.7}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
