/**
 * Accessibility Audit Utilities
 * 
 * Helper functions for accessibility compliance checking
 */

/**
 * Check if touch target meets minimum size requirements
 * iOS: 44x44 points, Android: 48x48 dp
 */
export function meetsTouchTargetSize(
  width: number,
  height: number,
  platform: 'ios' | 'android' = 'ios'
): boolean {
  const minSize = platform === 'ios' ? 44 : 48;
  return width >= minSize && height >= minSize;
}

/**
 * Calculate color contrast ratio (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
 */
export function calculateContrastRatio(
  foreground: string,
  background: string
): number {
  // Simplified contrast calculation
  // In production, use a proper color contrast library
  const fgLuminance = getLuminance(foreground);
  const bgLuminance = getLuminance(background);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color (0-1)
 */
function getLuminance(color: string): number {
  // Simplified - in production, parse hex/rgb properly
  // This is a placeholder
  return 0.5;
}

/**
 * Accessibility checklist for components
 */
export interface AccessibilityChecklist {
  hasAccessibilityLabel: boolean;
  hasAccessibilityHint?: boolean;
  hasAccessibilityRole: boolean;
  meetsTouchTarget: boolean;
  hasContrast: boolean;
  keyboardAccessible?: boolean; // Web only
}

/**
 * Validate component accessibility
 */
export function validateAccessibility(
  props: {
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    style?: { width?: number; height?: number };
  }
): AccessibilityChecklist {
  return {
    hasAccessibilityLabel: !!props.accessibilityLabel,
    hasAccessibilityRole: !!props.accessibilityRole,
    meetsTouchTarget: props.style
      ? meetsTouchTargetSize(
          props.style.width || 0,
          props.style.height || 0
        )
      : false,
    hasContrast: true, // Would need actual color values to check
  };
}
