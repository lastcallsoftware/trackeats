/**
 * Login screen - email/password authentication
 */

import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as yup from 'yup';
import authStore from '@/store/authStore';

const loginSchema = yup.object({
  email: yup.string().trim().required('Email address is required').email('Please enter a valid email address'),
});

export default function LoginScreen() {
  const router = useRouter();
  const { isLoading, error } = authStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      const validatedValues = await loginSchema.validate({ email }, { abortEarly: true });
      setEmailError(null);

      await authStore.getState().login(validatedValues.email, password);
      // Navigation is handled by root layout when isLoggedIn changes
    } catch (e) {
      if (e instanceof yup.ValidationError) {
        setEmailError(e.message);
        return;
      }

      // Error is already in store
      console.debug('[LOGIN] Login error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={[styles.input, emailError && styles.inputError]}
        placeholder="Email Address"
        placeholderTextColor="#999"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (emailError) {
            setEmailError(null);
          }
        }}
        editable={!isLoading}
        testID="email-input"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {emailError && <Text style={styles.fieldErrorText}>{emailError}</Text>}

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
          testID="password-input"
        />
        <TouchableOpacity
          onPress={() => setShowPassword((v) => !v)}
          testID="toggle-password-visibility"
          activeOpacity={0.7}
          style={styles.eyeButton}
        >
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#666" />
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={styles.errorText} testID="error-message">
          {error.message}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleLogin} testID="login-button" activeOpacity={0.7}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.push('/forgot-password')}
        testID="forgot-password-link"
        activeOpacity={0.7}
        style={styles.forgotPasswordContainer}
      >
        <Text style={styles.forgotPasswordLink}>Forgot your password?</Text>
      </TouchableOpacity>

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/signup')} testID="signup-link" activeOpacity={0.7}>
          <Text style={styles.signupLink}>Sign up</Text>
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
    marginBottom: 15,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: 'red',
    marginBottom: 6,
  },
  fieldErrorText: {
    color: 'red',
    marginBottom: 12,
    fontSize: 14,
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
  forgotPasswordContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  signupText: {
    fontSize: 14,
    color: '#666',
  },
  signupLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
