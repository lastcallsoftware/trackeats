/**
 * Email verification screen - displays instructions and handles deep-linked tokens
 */

import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import authStore from '@/store/authStore';
import { useDeepLink } from '@/utils/deepLinking';
import * as authService from '@/services/authService';
import AuthScreen from '@/components/AuthScreen';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isLoading, error, pendingVerification } = authStore();

  const [resendLoading, setResendLoading] = useState(false);
  const [activeToken, setActiveToken] = useState((params.token as string) || '');

  // Handle deep-link token
  const handleDeepLinkToken = async (token: string) => {
    console.debug('[VERIFY] Deep-link token received:', token);
    setActiveToken(token);
    try {
      await authStore.getState().confirm(token);
    } catch (e) {
      console.debug('[VERIFY] Confirm error:', e);
    }
  };

  useDeepLink(handleDeepLinkToken);

  // Handle resend verification email
  const handleResend = async () => {
    setResendLoading(true);
    try {
      const tokenToResend = activeToken.trim();
      if (tokenToResend) {
        await authService.resendConfirmation(tokenToResend);
      }
    } catch (e: any) {
      console.debug('[VERIFY] Resend error:', e?.message);
    } finally {
      setResendLoading(false);
    }
  };

  // Success state - email confirmed
  if (!pendingVerification && !authStore.getState().pendingVerification) {
    return (
      <AuthScreen title="Email Verified!">
        <Text style={styles.successMessage}>
          Your email has been verified. You can now log in with your credentials.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/login')}
          testID="go-to-login-button"
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Verify Your Email">
      <Text style={styles.instructions} testID="instructions">
        Check your email for a verification link and click it to verify your email address.
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText} testID="error-message">
            {error.message}
          </Text>
          {error.code === 'EXPIRED_TOKEN' && (
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.resendButtonText}>Resend Verification Email</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {isLoading && (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  instructions: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  successMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
  },
  loader: {
    marginVertical: 20,
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
  resendButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
