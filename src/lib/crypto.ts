import { supabase } from "@/integrations/supabase/client";

/**
 * Encrypt a single string value
 */
export async function encryptValue(value: string): Promise<string | null> {
  if (!value) return null;
  
  try {
    const { data, error } = await supabase.functions.invoke('crypto', {
      body: { action: 'encrypt', data: value }
    });
    
    if (error) throw error;
    return data.result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a single string value
 */
export async function decryptValue(value: string): Promise<string | null> {
  if (!value) return null;
  
  try {
    const { data, error } = await supabase.functions.invoke('crypto', {
      body: { action: 'decrypt', data: value }
    });
    
    if (error) throw error;
    return data.result;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original value if decryption fails (might be unencrypted legacy data)
    return value;
  }
}

/**
 * Encrypt multiple values at once
 */
export async function encryptBatch(values: Record<string, string | null>): Promise<Record<string, string | null>> {
  const nonNullValues: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(values)) {
    if (value) {
      nonNullValues[key] = value;
    }
  }
  
  if (Object.keys(nonNullValues).length === 0) {
    return values;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('crypto', {
      body: { action: 'encrypt_batch', data: nonNullValues }
    });
    
    if (error) throw error;
    
    // Merge with original null values
    const result: Record<string, string | null> = {};
    for (const key of Object.keys(values)) {
      result[key] = data.result[key] ?? null;
    }
    
    return result;
  } catch (error) {
    console.error('Batch encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt multiple values at once
 */
export async function decryptBatch(values: Record<string, string | null>): Promise<Record<string, string | null>> {
  const nonNullValues: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(values)) {
    if (value) {
      nonNullValues[key] = value;
    }
  }
  
  if (Object.keys(nonNullValues).length === 0) {
    return values;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('crypto', {
      body: { action: 'decrypt_batch', data: nonNullValues }
    });
    
    if (error) throw error;
    
    // Merge with original null values
    const result: Record<string, string | null> = {};
    for (const key of Object.keys(values)) {
      result[key] = data.result[key] ?? null;
    }
    
    return result;
  } catch (error) {
    console.error('Batch decryption error:', error);
    // Return original values if decryption fails
    return values;
  }
}

/**
 * Helper to check if a string looks like encrypted data (base64)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  // Encrypted data is base64 and should be at least 44 chars (salt + iv + data)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return value.length >= 44 && base64Regex.test(value);
}
