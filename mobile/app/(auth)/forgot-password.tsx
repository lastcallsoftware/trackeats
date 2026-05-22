/**
 * Forgot Password screen - allows user to request a password reset email
 */

import { useState } from 'react';
import { TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as authService from '@/services/authService';
import AuthScreen from '@/components/AuthScreen';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.requestResetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      // Show a generic message for security (don't reveal if email exists)
      setError(err?.message || 'Failed to request password reset');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthScreen title="Check Your Email">
        <Text style={styles.successText}>
          If an account exists with that email, you'll receive a password reset link shortly.
          The link will expire in 15 minutes.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/login')}
          testID="back-to-login-button"
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Reset Password">
      <Text style={styles.subtitle}>
        Enter the email address associated with your account and we'll send you a link to reset your password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError(null);
        }}
        editable={!isLoading}
        testID="email-input"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={handleRequestReset}
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
          onPress={handleRequestReset}
          testID="request-reset-button"
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Send Reset Link</Text>
        </TouchableOpacity>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20,
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
});
