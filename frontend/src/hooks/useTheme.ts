import { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useAuthStore } from '../stores/authStore';
import { userSettingsCollection } from '../db';
import { colors, colorsLight, type Colors } from '../utils/colors';
import { logError } from '../utils/errorHandler';
import type UserSettings from '../db/models/UserSettings';

type ThemePreference = 'dark' | 'light' | 'system';

/**
 * Hook to get current theme colors based on user preference
 * 
 * Priority:
 * 1. User's theme_preference from UserSettings (if set)
 * 2. System theme (if preference is 'system' or not set)
 * 3. Default to dark mode
 * 
 * @returns Current theme colors object
 */
export function useTheme(): Colors {
    const { user } = useAuthStore();
    const systemColorScheme = useColorScheme();
    const [themePreference, setThemePreference] = useState<ThemePreference>('system');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) {
            // No user logged in, use system theme
            setIsLoading(false);
            return;
        }

        const loadThemePreference = async () => {
            try {
                const settingsRecords = await userSettingsCollection
                    .query(Q.where('user_id', user.id))
                    .fetch();

                if (settingsRecords.length > 0) {
                    const settings = settingsRecords[0] as UserSettings;
                    const preference = (settings.themePreference as ThemePreference) || 'system';
                    setThemePreference(preference);
                }
            } catch (error) {
                logError(error, 'useTheme_loadPreference');
            } finally {
                setIsLoading(false);
            }
        };

        loadThemePreference();

        // Subscribe to changes
        const subscription = userSettingsCollection
            .query(Q.where('user_id', user.id))
            .observe()
            .subscribe((settings) => {
                if (settings.length > 0) {
                    const userSettings = settings[0] as UserSettings;
                    const preference = (userSettings.themePreference as ThemePreference) || 'system';
                    setThemePreference(preference);
                }
            });

        return () => subscription.unsubscribe();
    }, [user?.id]);

    // Determine which theme to use
    if (isLoading) {
        // While loading, default to system theme
        return systemColorScheme === 'light' ? colorsLight : colors;
    }

    if (themePreference === 'light') {
        return colorsLight;
    }

    if (themePreference === 'dark') {
        return colors;
    }

    // themePreference === 'system' or not set
    return systemColorScheme === 'light' ? colorsLight : colors;
}

/**
 * Get theme preference value (for settings screens)
 */
export function useThemePreference(): ThemePreference {
    const { user } = useAuthStore();
    const [themePreference, setThemePreference] = useState<ThemePreference>('system');

    useEffect(() => {
        if (!user?.id) return;

        const loadThemePreference = async () => {
            try {
                const settingsRecords = await userSettingsCollection
                    .query(Q.where('user_id', user.id))
                    .fetch();

                if (settingsRecords.length > 0) {
                    const settings = settingsRecords[0] as UserSettings;
                    const preference = (settings.themePreference as ThemePreference) || 'system';
                    setThemePreference(preference);
                }
            } catch (error) {
                logError(error, 'useThemePreference_load');
            }
        };

        loadThemePreference();

        // Subscribe to changes
        const subscription = userSettingsCollection
            .query(Q.where('user_id', user.id))
            .observe()
            .subscribe((settings) => {
                if (settings.length > 0) {
                    const userSettings = settings[0] as UserSettings;
                    const preference = (userSettings.themePreference as ThemePreference) || 'system';
                    setThemePreference(preference);
                }
            });

        return () => subscription.unsubscribe();
    }, [user?.id]);

    return themePreference;
}
