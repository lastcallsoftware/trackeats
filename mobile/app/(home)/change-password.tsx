/**
 * Change Password screen - allows logged-in users to change their password
 */

import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as authService from '@/services/authService';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePasswords = (): boolean => {
    if (!currentPassword.trim()) {
      setError('Please enter your current password');
      return false;
    }
    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return false;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    setError(null);

    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Password Changed</Text>
        <Text style={styles.successText}>Your password has been successfully updated.</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
          testID="back-to-home-button"
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>
      <Text style={styles.subtitle}>Update your account password</Text>

      <TextInput
        style={styles.input}
        placeholder="Current Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={currentPassword}
        onChangeText={(text) => {
          setCurrentPassword(text);
          setError(null);
        }}
        editable={!isLoading}
        testID="current-password-input"
      />

      <TextInput
        style={styles.input}
        placeholder="New Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={newPassword}
        onChangeText={(text) => {
          setNewPassword(text);
          setError(null);
        }}
        editable={!isLoading}
        testID="new-password-input"
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setError(null);
        }}
        editable={!isLoading}
        testID="confirm-password-input"
      />

      {error && (
        <Text style={styles.errorText} testID="error-message">
          {error}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={handleChangePassword}
          testID="change-password-button"
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Change Password</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.back()}
        testID="back-button"
        activeOpacity={0.7}
        style={styles.linkContainer}
      >
        <Text style={styles.link}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    fontSize: 14,
  },
  successText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
