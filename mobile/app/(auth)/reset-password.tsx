/**
 * Reset Password screen - allows user to set a new password using a reset token
 * This screen is reached via deep-link from the password reset email
 */

import { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as authService from '@/services/authService';
import { useDeepLink, type DeepLinkData } from '@/utils/deepLinking';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token: urlToken } = useLocalSearchParams<{ token: string }>();
  const [token, setToken] = useState<string | null>(urlToken ?? null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle deep-link tokens
  const handleDeepLink = (data: DeepLinkData) => {
    console.debug('[RESET-PASSWORD] Deep-link received:', data.type);
    if (data.type === 'reset_password') {
      setToken(data.token);
      setError(null);
    }
  };

  useDeepLink(handleDeepLink);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const validatePassword = (): boolean => {
    if (!password.trim()) {
      setError('Please enter a new password');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    setError(null);

    if (!validatePassword()) {
      return;
    }

    if (!token) {
      setError('Reset token is missing');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Password Reset Successful</Text>
        <Text style={styles.successText}>Your password has been changed. You can now log in with your new password.</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/login')}
          testID="go-to-login-button"
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Invalid Reset Link</Text>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/forgot-password')}
          testID="request-new-reset-button"
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Request New Reset</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Password</Text>
      <Text style={styles.subtitle}>Enter a new password for your account</Text>

      <TextInput
        style={styles.input}
        placeholder="New Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        editable={!isLoading}
        testID="password-input"
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
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
        <Text style={styles.errorMessage} testID="error-message">
          {error}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={handleResetPassword}
          testID="reset-password-button"
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Reset Password</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.replace('/login')}
        testID="back-to-login-link"
        activeOpacity={0.7}
        style={styles.linkContainer}
      >
        <Text style={styles.link}>Back to Login</Text>
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
  errorMessage: {
    color: 'red',
    marginBottom: 15,
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    marginBottom: 30,
    fontSize: 14,
    textAlign: 'center',
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
