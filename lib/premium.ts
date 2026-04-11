/**
 * Premium Feature Utilities
 *
 * Client-side hash validation for premium features (cursor broadcasting).
 * Uses SHA-256 hashing to validate premium codes without exposing the secret.
 */

const STORAGE_KEY = 'demonic-sync-premium-hash';

/**
 * Generate SHA-256 hash from a code string
 */
export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Check if a hash matches the environment variable hash
 */
export function isValidHash(hash: string): boolean {
  const expectedHash = process.env.NEXT_PUBLIC_PREMIUM_CODE_HASH;

  // If no hash is configured, feature is disabled
  if (!expectedHash) {
    return false;
  }

  // Simple comparison (timing attacks not a concern for client-side validation)
  return hash === expectedHash;
}

/**
 * Validate a premium code by hashing and comparing
 */
export async function validateCode(code: string): Promise<boolean> {
  if (!code || code.trim().length === 0) {
    return false;
  }

  const hash = await hashCode(code.trim());
  return isValidHash(hash);
}

/**
 * Check if user has premium access (valid hash in localStorage)
 */
export function hasPremiumAccess(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const storedHash = localStorage.getItem(STORAGE_KEY);
    if (!storedHash) {
      return false;
    }

    return isValidHash(storedHash);
  } catch (error) {
    // localStorage might be unavailable (private browsing, etc.)
    console.warn('Failed to check premium access:', error);
    return false;
  }
}

/**
 * Save validated hash to localStorage
 */
export function saveHash(hash: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, hash);
  } catch (error) {
    console.warn('Failed to save premium hash:', error);
  }
}

/**
 * Clear premium hash from localStorage
 */
export function clearHash(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear premium hash:', error);
  }
}

/**
 * Get stored hash from localStorage (for debugging)
 */
export function getStoredHash(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to get stored hash:', error);
    return null;
  }
}
