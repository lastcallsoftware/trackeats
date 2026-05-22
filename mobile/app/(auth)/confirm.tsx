/**
 * Email confirmation return screen.
 *
 * The backend redirects mobile email-confirmation browser clicks here after it
 * has validated the token, so the user lands back in the app instead of on JSON.
 * We immediately redirect to the login screen with a confirmed flag.
 */

import { Redirect } from 'expo-router';

export default function ConfirmReturnScreen() {
  return <Redirect href={{ pathname: '/login', params: { registration: 'confirmed' } }} />;
}
