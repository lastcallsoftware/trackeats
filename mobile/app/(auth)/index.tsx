/**
 * Auth group index - redirects to login
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AuthIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, []);

  return null;
}
