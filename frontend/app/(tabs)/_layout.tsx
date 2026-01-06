import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

// Simple icon component (replace with actual icons in production)
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    workout: '💪',
    history: '📊',
    routines: '📋',
    profile: '👤',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] || '⚫'}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ focused }) => <TabIcon name="workout" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Routines',
          tabBarIcon: ({ focused }) => <TabIcon name="routines" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
});
