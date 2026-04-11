'use client';

import { useState, useEffect } from 'react';
import { hasPremiumAccess, validateCode, hashCode, saveHash } from '@/lib/premium';

/**
 * React hook for premium feature access
 *
 * Returns:
 * - isPremium: true if user has validated premium code
 * - mounted: true after hydration (prevents SSR mismatch)
 * - unlock: function to validate and unlock premium with a code
 */
export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user already has premium access
    const hasAccess = hasPremiumAccess();
    setIsPremium(hasAccess);
  }, []);

  /**
   * Validate a premium code and unlock if valid
   * @returns true if code is valid, false otherwise
   */
  const unlock = async (code: string): Promise<boolean> => {
    const isValid = await validateCode(code);

    if (isValid) {
      // Hash and save to localStorage
      const hash = await hashCode(code.trim());
      saveHash(hash);
      setIsPremium(true);
      return true;
    }

    return false;
  };

  return {
    isPremium: mounted ? isPremium : false,
    mounted,
    unlock
  };
}
