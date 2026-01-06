import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { user } = useAuthStore();

  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
