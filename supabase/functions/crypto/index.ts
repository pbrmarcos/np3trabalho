import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && (
    origin.includes("lovable.app") ||
    origin.includes("lovableproject.com") ||
    origin.includes("webq.com.br") ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080"
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://webq.com.br",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

// Convert string to ArrayBuffer
function stringToBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
}

// Convert ArrayBuffer to string
function bufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// Convert ArrayBuffer to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

// Derive key from password using PBKDF2
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    stringToBuffer(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt data
async function encrypt(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt.buffer as ArrayBuffer);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    stringToBuffer(plaintext)
  );
  
  // Combine salt + iv + encrypted data
  const encryptedBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encryptedBytes, salt.length + iv.length);
  
  return bufferToBase64(combined.buffer as ArrayBuffer);
}

// Decrypt data
async function decrypt(ciphertext: string, password: string): Promise<string> {
  const combinedBuffer = base64ToBuffer(ciphertext);
  const combined = new Uint8Array(combinedBuffer);
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  
  const key = await deriveKey(password, salt.buffer as ArrayBuffer);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );
  
  return bufferToString(decrypted);
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ENCRYPTION_KEY) {
      console.error('ENCRYPTION_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Encryption not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();

    if (action === 'encrypt') {
      if (!data || typeof data !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid data for encryption' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const encrypted = await encrypt(data, ENCRYPTION_KEY);
      return new Response(
        JSON.stringify({ result: encrypted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'decrypt') {
      if (!data || typeof data !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid data for decryption' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        const decrypted = await decrypt(data, ENCRYPTION_KEY);
        return new Response(
          JSON.stringify({ result: decrypted }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (decryptError) {
        // If decryption fails, return the original data (might be unencrypted legacy data)
        console.log('Decryption failed, returning original data:', decryptError);
        return new Response(
          JSON.stringify({ result: data, legacy: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Batch operations
    if (action === 'encrypt_batch') {
      if (!data || typeof data !== 'object') {
        return new Response(
          JSON.stringify({ error: 'Invalid data for batch encryption' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'string') {
          result[key] = await encrypt(value, ENCRYPTION_KEY);
        } else {
          result[key] = null;
        }
      }

      return new Response(
        JSON.stringify({ result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'decrypt_batch') {
      if (!data || typeof data !== 'object') {
        return new Response(
          JSON.stringify({ error: 'Invalid data for batch decryption' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'string') {
          try {
            result[key] = await decrypt(value, ENCRYPTION_KEY);
          } catch {
            // Return original if decryption fails (legacy unencrypted data)
            result[key] = value as string;
          }
        } else {
          result[key] = null;
        }
      }

      return new Response(
        JSON.stringify({ result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Crypto function error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
