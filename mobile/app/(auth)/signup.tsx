/**
 * Signup screen - user registration with email verification
 */

import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import authStore from '@/store/authStore';

export default function SignupScreen() {
  const router = useRouter();
  const { isLoading, error } = authStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
    email?: string;
  }>({});

  const validateFields = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!email.includes('@')) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateFields()) {
      return;
    }

    try {
      await authStore.getState().register(username, password, email);
      // After successful registration, navigate to verify-email if pendingVerification is set
      if (authStore.getState().pendingVerification) {
        router.push({ pathname: '/verify-email', params: { username } });
      }
    } catch (e) {
      console.debug('[SIGNUP] Signup error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        style={[styles.input, fieldErrors.username && styles.inputError]}
        placeholder="Username"
        placeholderTextColor="#999"
        value={username}
        onChangeText={setUsername}
        editable={!isLoading}
        testID="username-input"
      />
      {fieldErrors.username && (
        <Text style={styles.fieldErrorText}>{fieldErrors.username}</Text>
      )}

      <TextInput
        style={[styles.input, fieldErrors.password && styles.inputError]}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!isLoading}
        testID="password-input"
      />
      {fieldErrors.password && (
        <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
      )}

      <TextInput
        style={[styles.input, fieldErrors.email && styles.inputError]}
        placeholder="Email"
        placeholderTextColor="#999"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!isLoading}
        testID="email-input"
      />
      {fieldErrors.email && <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>}

      {error && (
        <Text style={styles.errorText} testID="error-message">
          {error.message}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleSignup} testID="signup-button" activeOpacity={0.7}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      )}

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/login')} testID="login-link" activeOpacity={0.7}>
          <Text style={styles.loginLink}>Log in</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 5,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff0000',
  },
  fieldErrorText: {
    color: '#ff0000',
    fontSize: 12,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    fontSize: 14,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
