/**
 * Settings screen for account actions
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import authStore from '@/store/authStore';
import { deleteAccount } from '@/services/authService';
import { clearSocialSeedPromptSeen } from '@/services/tokenStorage';

export default function SettingsScreen() {
  const router = useRouter();
  const { authMethod, canWrite } = authStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const canChangePassword = canWrite && authMethod !== 'google' && authMethod !== 'facebook' && authMethod !== 'apple';

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      try {
        await clearSocialSeedPromptSeen();
      } catch (seedError) {
        console.debug('[SETTINGS] Failed to clear seed prompt flag:', seedError);
      }
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await authStore.getState().logout();
              router.replace('/login');
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      Alert.alert('Delete Account Failed', error?.message ?? 'Unable to delete account right now.');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (!canWrite) {
      Alert.alert('Read-only account', 'This account is read-only. Account deletion is disabled.');
      return;
    }

    Alert.alert(
      'Delete Account?',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {!canWrite ? (
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>Read-only mode: account changes are disabled.</Text>
        </View>
      ) : null}

      {canChangePassword ? (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(home)/change-password')}
          testID="settings-change-password-button"
          activeOpacity={0.8}
          disabled={isDeleting}
        >
          <Text style={styles.primaryButtonText}>Change Password</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {canWrite
              ? 'Password changes are managed by your social login provider.'
              : 'Read-only accounts cannot change passwords.'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.dangerButton}
        onPress={confirmDeleteAccount}
        testID="settings-delete-account-button"
        activeOpacity={0.8}
        disabled={isDeleting || !canWrite}
      >
        {isDeleting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.dangerButtonText}>Delete My Account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    padding: 14,
  },
  infoText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  readOnlyBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#90caf9',
    backgroundColor: '#e3f2fd',
    padding: 14,
  },
  readOnlyText: {
    color: '#0d47a1',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
