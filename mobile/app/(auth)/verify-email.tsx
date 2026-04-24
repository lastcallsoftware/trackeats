/**
 * Email verification screen - displays instructions and handles deep-linked tokens
 */

import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import authStore from '@/store/authStore';
import { useDeepLink } from '@/utils/deepLinking';
import * as authService from '@/services/authService';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isLoading, error, pendingVerification } = authStore();

  const [manualToken, setManualToken] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
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

  // Handle manual token entry
  const handleConfirmManual = async () => {
    if (!manualToken.trim()) {
      return;
    }

    setActiveToken(manualToken.trim());
    try {
      await authStore.getState().confirm(manualToken);
    } catch (e) {
      console.debug('[VERIFY] Confirm error:', e);
    }
  };

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
      <View style={styles.container}>
        <Text style={styles.successTitle}>Email Verified!</Text>
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
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Verify Your Email</Text>

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

      {/* Manual token entry toggle */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowManualEntry(!showManualEntry)}
        testID="toggle-manual-entry"
      >
        <Text style={styles.toggleText}>
          {showManualEntry ? '▼ Hide manual entry' : '▶ Enter token manually'}
        </Text>
      </TouchableOpacity>

      {showManualEntry && (
        <View style={styles.manualEntryContainer}>
          <Text style={styles.manualEntryLabel}>Enter verification token:</Text>
          <TextInput
            style={styles.manualInput}
            placeholder="Paste verification token"
            placeholderTextColor="#999"
            value={manualToken}
            onChangeText={setManualToken}
            editable={!isLoading}
            testID="manual-token-input"
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmManual}
            disabled={isLoading || !manualToken.trim()}
            testID="confirm-manual-button"
            activeOpacity={0.7}
          >
            <Text style={styles.confirmButtonText}>Confirm Token</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00aa00',
    marginBottom: 15,
    textAlign: 'center',
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
  toggleButton: {
    paddingVertical: 10,
    marginVertical: 15,
  },
  toggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  manualEntryContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  manualEntryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    fontFamily: 'monospace',
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
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
