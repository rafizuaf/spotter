import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function ProgramLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  );
}
