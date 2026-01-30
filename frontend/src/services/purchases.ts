/**
 * RevenueCat Purchases Service
 * 
 * Handles subscription purchases, offerings, and customer info.
 * Integrates with RevenueCat SDK to manage in-app purchases.
 */

import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesError,
  LOG_LEVEL,
} from 'react-native-purchases';

// Type alias for Offerings (Purchases.getOfferings() returns PurchasesOfferings)
export type Offerings = Awaited<ReturnType<typeof Purchases.getOfferings>>;

// Re-export types for use in other files
export type { PurchasesPackage, CustomerInfo };
import { Platform } from 'react-native';
import { logError } from '../utils/errorHandler';
import { trackEvent } from './monitoring';

// RevenueCat API keys (separate for iOS and Android)
// These should be set in environment variables
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;

// Fallback to single key if platform-specific keys not set
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Must be called after user authentication
 * 
 * @param userId - Supabase user ID (used as RevenueCat app_user_id)
 */
export async function initializePurchases(userId: string): Promise<void> {
  try {
    // Get API key for current platform
    const apiKey = Platform.select({
      ios: REVENUECAT_API_KEY_IOS || REVENUECAT_API_KEY,
      android: REVENUECAT_API_KEY_ANDROID || REVENUECAT_API_KEY,
      default: REVENUECAT_API_KEY,
    });

    if (!apiKey) {
      logError(new Error('RevenueCat API key not configured'), 'purchases');
      return;
    }

    // Configure RevenueCat
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({ apiKey });

    // Link RevenueCat customer to Supabase user
    await Purchases.logIn(userId);

    isInitialized = true;
    trackEvent({ name: 'purchases_initialized', properties: { userId } });
  } catch (error) {
    logError(error, 'purchases_init');
    throw error;
  }
}

/**
 * Reset RevenueCat SDK (on logout)
 */
export async function resetPurchases(): Promise<void> {
  try {
    await Purchases.logOut();
    isInitialized = false;
    trackEvent({ name: 'purchases_reset' });
  } catch (error) {
    logError(error, 'purchases_reset');
    // Don't throw - logout should succeed even if RevenueCat fails
  }
}

/**
 * Get available offerings (subscription packages)
 * 
 * @returns Offerings object with available packages
 */
export async function getOfferings(): Promise<Offerings | null> {
  try {
    if (!isInitialized) {
      logError(new Error('RevenueCat not initialized'), 'purchases');
      return null;
    }

    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    logError(error, 'purchases_get_offerings');
    return null;
  }
}

/**
 * Get current customer info (subscription status)
 * 
 * @returns CustomerInfo with active entitlements
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    if (!isInitialized) {
      logError(new Error('RevenueCat not initialized'), 'purchases');
      return null;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    logError(error, 'purchases_get_customer_info');
    return null;
  }
}

/**
 * Purchase a package
 * 
 * @param packageToPurchase - RevenueCat package to purchase
 * @returns CustomerInfo on success, null on error
 */
export async function purchasePackage(
  packageToPurchase: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo } | { error: string }> {
  try {
    if (!isInitialized) {
      return { error: 'RevenueCat not initialized' };
    }

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    trackEvent({ name: 'purchase_successful' });
    return { customerInfo };
  } catch (error) {
    const purchasesError = error as PurchasesError;
    
    // User cancelled - not an error
    if (purchasesError.userCancelled) {
      return { error: 'Purchase cancelled' };
    }

    // Network error
    if (purchasesError.code === Purchases.PURCHASES_ERROR_CODE.NETWORK_ERROR) {
      return { error: 'Network error. Please check your connection.' };
    }

    // Other errors
    logError(purchasesError, 'purchases_purchase');
    return { error: purchasesError.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 * 
 * @returns CustomerInfo on success, null on error
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    if (!isInitialized) {
      logError(new Error('RevenueCat not initialized'), 'purchases');
      return null;
    }

    const customerInfo = await Purchases.restorePurchases();
    trackEvent({ name: 'purchases_restored' });
    return customerInfo;
  } catch (error) {
    logError(error, 'purchases_restore');
    return null;
  }
}

/**
 * Check if RevenueCat is initialized
 */
export function isPurchasesInitialized(): boolean {
  return isInitialized;
}

/**
 * Get RevenueCat app user ID (for debugging)
 */
export async function getAppUserID(): Promise<string | null> {
  try {
    if (!isInitialized) {
      return null;
    }
    return await Purchases.getAppUserID();
  } catch (error) {
    logError(error, 'purchases_get_user_id');
    return null;
  }
}
