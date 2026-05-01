/**
 * SocialLoginButtons — Google, Facebook, and Apple sign-in buttons for the web login page.
 *
 * Each button triggers a provider OAuth flow, receives an id_token / access_token,
 * sends it to /api/social_login, and calls onSuccess(appToken) on success.
 *
 * Set these env vars in frontend/.env:
 *   VITE_GOOGLE_CLIENT_ID=...
 *   VITE_FACEBOOK_APP_ID=...
 *   VITE_APPLE_CLIENT_ID=...        (your Services ID, e.g. com.example.trackeats.web)
 *   VITE_APPLE_REDIRECT_URI=...     (must match what you registered in Apple developer portal)
 */

import { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';

// ─── Provider config (from env) ───────────────────────────────────────────────
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID ?? '';
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID ?? '';
const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI ?? window.location.origin + '/login';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
    onSuccess: (appToken: string) => void;
    disabled?: boolean;
}

// ─── Backend exchange ─────────────────────────────────────────────────────────
async function exchangeWithBackend(
    provider: 'google' | 'facebook' | 'apple',
    token: string,
    extra?: { name?: string; platform?: string },
): Promise<string> {
    const resp = await axios.post('/api/social_login', {
        provider,
        token,
        ...(extra ?? {}),
    });
    const appToken = resp.data?.access_token;
    if (!appToken) throw new Error('No token returned from server');
    return appToken;
}

// ─── Facebook SDK loader (lazy) ───────────────────────────────────────────────
declare global {
    interface Window {
        FB?: {
            init: (opts: object) => void;
            login: (cb: (res: { authResponse?: { accessToken: string } }) => void, opts?: object) => void;
        };
        fbAsyncInit?: () => void;
    }
}

function loadFacebookSdk(appId: string): Promise<void> {
    return new Promise((resolve) => {
        if (window.FB) { resolve(); return; }
        window.fbAsyncInit = () => {
            window.FB!.init({ appId, cookie: true, xfbml: false, version: 'v18.0' });
            resolve();
        };
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    });
}

// ─── Apple JS SDK loader (lazy) ───────────────────────────────────────────────
declare global {
    interface Window {
        AppleID?: {
            auth: {
                init: (opts: object) => void;
                signIn: () => Promise<{
                    authorization: { id_token: string };
                    user?: { name?: { firstName?: string; lastName?: string } };
                }>;
            };
        };
    }
}

function loadAppleSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.AppleID) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Apple JS SDK'));
        document.body.appendChild(script);
    });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SocialLoginButtons({ onSuccess, disabled = false }: Props) {
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isLoading = loadingProvider !== null;
    const hasGoogleLogin = Boolean(GOOGLE_CLIENT_ID);
    const hasFacebookLogin = Boolean(FACEBOOK_APP_ID);
    const hasAppleLogin = Boolean(APPLE_CLIENT_ID);
    const hasAnySocialLogin = hasGoogleLogin || hasFacebookLogin || hasAppleLogin;

    // ── Facebook ──
    const onFacebookClick = useCallback(async () => {
        if (!FACEBOOK_APP_ID) {
            setError('Facebook sign-in is not configured (VITE_FACEBOOK_APP_ID missing)');
            return;
        }
        setError(null);
        setLoadingProvider('facebook');
        try {
            await loadFacebookSdk(FACEBOOK_APP_ID);
            let fbAccessToken = '';
            await new Promise<void>((resolve, reject) => {
                window.FB!.login((response) => {
                    if (response.authResponse?.accessToken) {
                        fbAccessToken = response.authResponse!.accessToken;
                        resolve();
                    } else {
                        reject(new Error('Facebook login was cancelled or failed'));
                    }
                }, { scope: 'email,public_profile' });
            });
            const appToken = await exchangeWithBackend('facebook', fbAccessToken);
            onSuccess(appToken);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '';
            const apiMsg = (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg;
            if (msg !== 'Facebook login was cancelled or failed') {
                setError(apiMsg ?? msg ?? 'Facebook sign-in failed');
            }
        } finally {
            setLoadingProvider(null);
        }
    }, [onSuccess]);

    // ── Apple ──
    const onAppleClick = useCallback(async () => {
        if (!APPLE_CLIENT_ID) {
            setError('Apple sign-in is not configured (VITE_APPLE_CLIENT_ID missing)');
            return;
        }
        setError(null);
        setLoadingProvider('apple');
        try {
            await loadAppleSdk();
            window.AppleID!.auth.init({
                clientId: APPLE_CLIENT_ID,
                scope: 'name email',
                redirectURI: APPLE_REDIRECT_URI,
                usePopup: true,
            });
            const response = await window.AppleID!.auth.signIn();
            const idToken = response.authorization.id_token;
            const firstName = response.user?.name?.firstName ?? '';
            const lastName = response.user?.name?.lastName ?? '';
            const name = [firstName, lastName].filter(Boolean).join(' ') || undefined;
            const appToken = await exchangeWithBackend('apple', idToken, { name });
            onSuccess(appToken);
        } catch (err: unknown) {
            // Apple throws a plain object { error: 'popup_closed_by_user' } on cancel
            if ((err as { error?: string })?.error === 'popup_closed_by_user') {
                // no-op: user dismissed the popup
            } else {
                const apiMsg = (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg;
                const msg = err instanceof Error ? err.message : undefined;
                setError(apiMsg ?? msg ?? 'Apple sign-in failed');
            }
        } finally {
            setLoadingProvider(null);
        }
    }, [onSuccess]);

    if (!hasAnySocialLogin) {
        return null;
    }

    return (
        <Box sx={{ mt: 1 }}>
            <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    or continue with
                </Typography>
            </Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {hasGoogleLogin ? (
                    <GoogleLoginButton
                        disabled={disabled}
                        isLoading={isLoading}
                        loadingProvider={loadingProvider}
                        setLoadingProvider={setLoadingProvider}
                        setError={setError}
                        onSuccess={onSuccess}
                    />
                ) : null}

                {hasFacebookLogin ? (
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={onFacebookClick}
                        disabled={disabled || isLoading}
                        startIcon={
                            loadingProvider === 'facebook' ? (
                                <CircularProgress size={18} sx={{ color: '#fff' }} />
                            ) : (
                                <FacebookIcon />
                            )
                        }
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            height: 44,
                            backgroundColor: '#1877F2',
                            '&:hover': { backgroundColor: '#166FE5' },
                        }}
                    >
                        Sign in with Facebook
                    </Button>
                ) : null}

                {hasAppleLogin ? (
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={onAppleClick}
                        disabled={disabled || isLoading}
                        startIcon={
                            loadingProvider === 'apple' ? (
                                <CircularProgress size={18} sx={{ color: '#fff' }} />
                            ) : (
                                <AppleIcon />
                            )
                        }
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            height: 44,
                            backgroundColor: '#000',
                            '&:hover': { backgroundColor: '#1a1a1a' },
                        }}
                    >
                        Sign in with Apple
                    </Button>
                ) : null}
            </Box>

            {error && (
                <Typography color="error" variant="body2" sx={{ mt: 1.5, textAlign: 'center' }}>
                    {error}
                </Typography>
            )}
        </Box>
    );
}

interface GoogleLoginButtonProps {
    disabled: boolean;
    isLoading: boolean;
    loadingProvider: string | null;
    setLoadingProvider: (provider: string | null) => void;
    setError: (message: string | null) => void;
    onSuccess: (appToken: string) => void;
}

function GoogleLoginButton({
    disabled,
    isLoading,
    loadingProvider,
    setLoadingProvider,
    setError,
    onSuccess,
}: GoogleLoginButtonProps) {
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                    baseURL: '',
                    timeout: 10000,
                });
                const appToken = await exchangeWithBackend('google', tokenResponse.access_token, { platform: 'web' });
                onSuccess(appToken);
            } catch (err: unknown) {
                const apiMsg = (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg;
                const msg = err instanceof Error ? err.message : undefined;
                setError(apiMsg ?? msg ?? 'Google sign-in failed');
            } finally {
                setLoadingProvider(null);
            }
        },
        onError: () => {
            setError('Google sign-in failed');
            setLoadingProvider(null);
        },
        flow: 'implicit',
    });

    const onGoogleClick = useCallback(() => {
        setError(null);
        setLoadingProvider('google');
        handleGoogleLogin();
    }, [handleGoogleLogin, setError, setLoadingProvider]);

    return (
        <Button
            variant="outlined"
            fullWidth
            onClick={onGoogleClick}
            disabled={disabled || isLoading}
            startIcon={
                loadingProvider === 'google' ? (
                    <CircularProgress size={18} />
                ) : (
                    <GoogleIcon />
                )
            }
            sx={{
                textTransform: 'none',
                fontWeight: 500,
                height: 44,
                borderColor: '#dadce0',
                color: '#3c4043',
                '&:hover': { borderColor: '#bdc1c6', backgroundColor: '#f8f9fa' },
            }}
        >
            Sign in with Google
        </Button>
    );
}

// ─── Inline SVG icons (no extra icon packages needed) ─────────────────────────

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.185l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" />
        </svg>
    );
}

function FacebookIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#fff">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.956.93-1.956 1.886v2.286h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
    );
}

function AppleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" fill="#fff">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 388.9 0 286.3 0 188.7C0 85.9 52.6 32 103.8 32c56.9 0 88.9 37.2 133.8 37.2 43.1 0 83.9-38.2 145.5-38.2 55.5 0 111.8 21.8 150.3 90.7l-1 1zM577.1 31.6c19.3-21.3 38.3-56.5 38.3-91.8 0-4.5-.4-9.1-1.3-12.7-35.8 1.3-78.8 23.6-105 52.2-17.7 19.3-39.1 53.9-39.1 89.9 0 5.2.9 10.4 1.3 12.1 2.2.4 5.8.6 9.1.6 32.3 0 73.1-21.3 96.7-50.3z" />
        </svg>
    );
}
