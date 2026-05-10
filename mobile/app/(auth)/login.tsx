/**
 * Login screen - email/password + social authentication
 */

import {
  Platform,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  LayoutAnimation,
} from 'react-native';
//import { Platform, View, Image, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Logo from '../../assets/trackeats-neon-logo.svg';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as yup from 'yup';
import { useState } from 'react';
import authStore from '@/store/authStore';
import {
  signInWithGoogle,
  useFacebookAuthRequest,
  loginWithApple,
  exchangeSocialPayload,
} from '@/services/socialAuthService';
import { getSocialSeedPromptSeen, setSocialSeedPromptSeen } from '@/services/tokenStorage';

const loginSchema = yup.object({
  email: yup.string().trim().required('Email address is required').email('Please enter a valid email address'),
});

const hasGoogleLogin = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
);
const hasFacebookLogin = Boolean(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID);
// Apple mobile login also depends on backend/server-side config, so keep it opt-in.
const hasAppleLogin = process.env.EXPO_PUBLIC_ENABLE_APPLE_LOGIN === 'true';

export default function LoginScreen() {
  const router = useRouter();
  const { isLoading, error, loginWithSocialToken } = authStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const { promptAsync: signInWithFacebook } = useFacebookAuthRequest();
  const showAppleLogin = Platform.OS === 'ios' && hasAppleLogin;
  const hasAnySocialLogin = hasGoogleLogin || hasFacebookLogin || showAppleLogin;

  const toggleEmailLogin = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowEmailLogin((v) => !v);
  };

  const promptForSocialSeedChoice = async (): Promise<boolean> => {
    return await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Seed Starter Data?',
        'Would you like us to seed starter foods and recipes in your database?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Yes',
            onPress: () => resolve(true),
          },
        ],
        {
          cancelable: false,
        }
      );
    });
  };

  const handleLogin = async () => {
    try {
      const validatedValues = await loginSchema.validate({ email }, { abortEarly: true });
      setEmailError(null);
      await authStore.getState().login(validatedValues.email, password);
      // Navigation handled by root layout when isLoggedIn changes
    } catch (e) {
      if (e instanceof yup.ValidationError) {
        setEmailError(e.message);
        return;
      }
      console.debug('[LOGIN] Login error:', e);
    }
  };

  async function handleSocialLogin(provider: 'google' | 'facebook' | 'apple') {
    setSocialError(null);
    try {
      let socialPayload;
      if (provider === 'google') {
        socialPayload = await signInWithGoogle();
      } else if (provider === 'facebook') {
        socialPayload = await signInWithFacebook();
      } else {
        socialPayload = await loginWithApple();
      }

      let seedRequested = false;
      try {
        const seedPromptSeen = await getSocialSeedPromptSeen();
        if (!seedPromptSeen) {
          seedRequested = await promptForSocialSeedChoice();
          await setSocialSeedPromptSeen(true);
        }
      } catch (storageError) {
        console.debug('[LOGIN] Seed prompt state error:', storageError);
        // If prompt state cannot be read/written, still allow the user to choose.
        seedRequested = await promptForSocialSeedChoice();
      }

      setIsSocialLoading(true);
      try {
        const authData = await exchangeSocialPayload(socialPayload, seedRequested);
        await loginWithSocialToken(authData);
      } finally {
        setIsSocialLoading(false);
      }
    } catch (err: any) {
      if (err?.code === 'CANCELLED') return; // user dismissed — no error shown
      setSocialError(err?.message ?? 'Sign-in failed. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Logo width={120} height={120} />
      </View>
      <Text style={styles.title}>Login</Text>

      {hasAnySocialLogin ? (
        <>
          {/* ── Social login buttons ── */}
          <View style={styles.socialRow}>
            {hasGoogleLogin ? (
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton]}
                onPress={() => handleSocialLogin('google')}
                activeOpacity={0.8}
                testID="google-login-button"
                disabled={isLoading}
              >
                <Text style={styles.googleButtonIcon}>G</Text>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </TouchableOpacity>
            ) : null}

            {hasFacebookLogin ? (
              <TouchableOpacity
                style={[styles.socialButton, styles.facebookButton]}
                onPress={() => handleSocialLogin('facebook')}
                activeOpacity={0.8}
                testID="facebook-login-button"
                disabled={isLoading}
              >
                <Ionicons name="logo-facebook" size={20} color="#fff" />
                <Text style={styles.facebookButtonText}>Facebook</Text>
              </TouchableOpacity>
            ) : null}

            {showAppleLogin ? (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={() => handleSocialLogin('apple')}
                activeOpacity={0.8}
                testID="apple-login-button"
                disabled={isLoading}
              >
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={styles.appleButtonText}>Apple</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {socialError ? (
            <Text style={styles.errorText} testID="social-error-message">
              {socialError}
            </Text>
          ) : null}

          {/* ── Email toggle ── */}
          <TouchableOpacity
            style={styles.emailToggleButton}
            onPress={toggleEmailLogin}
            activeOpacity={0.7}
            testID="email-toggle-button"
            accessibilityRole="button"
            accessibilityState={{ expanded: showEmailLogin }}
          >
            <View style={styles.emailToggleContent}>
              <Text style={styles.emailToggleButtonText}>Sign in with email</Text>
              <Ionicons
                name={showEmailLogin ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color="#007AFF"
                style={styles.emailToggleIcon}
              />
            </View>
          </TouchableOpacity>
        </>
      ) : null}

      {(showEmailLogin || !hasAnySocialLogin) ? (
        <>
      <TextInput
        style={[styles.input, emailError && styles.inputError]}
        placeholder="Email Address"
        placeholderTextColor="#999"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (emailError) setEmailError(null);
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
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
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
        </>
      ) : null}

      {isSocialLoading ? (
        <View style={styles.loadingOverlay} testID="social-loading-overlay">
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Signing in...</Text>
        </View>
      ) : null}
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
  logoContainer: {
    width: '100%',
    aspectRatio: 1.833,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
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
    marginTop: 15,
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
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#444',
    fontWeight: '600',
  },
  // Email toggle button
  emailToggleButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  emailToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  emailToggleButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emailToggleIcon: {
    position: 'absolute',
    right: 0,
  },
  // Social buttons
  socialRow: {
    flexDirection: 'column',
    gap: 15,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 7,
    justifyContent: 'center',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  googleButtonIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#3c4043',
    fontWeight: '600',
    fontSize: 14,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  facebookButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  appleButton: {
    backgroundColor: '#000',
  },
  appleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  forgotPasswordContainer: {
    marginTop: 20,
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
    marginTop: 20,
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
