/**
 * ==========================================
 *      AuraDash Cryptography Utility
 * ==========================================
 * 
 * Cryptography Utilities
 * Uses the native Web Crypto API which is fully supported and hardware-accelerated
 * in Cloudflare Workers edge environment.
 */

/**
 * Hashes a password using PBKDF2 with SHA-256 and 100,000 iterations.
 * This is computationally expensive by design to resist brute-force attacks.
 * @returns A string in the format "saltHex:hashHex"
 */
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();

  // Generate a cryptographically secure random 32-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(32));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 600000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${saltHex}:${hashHex}`;
};

/**
 * Verifies a password against a stored PBKDF2 hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  // Reject any stored value that is not in the expected salt:hash format.
  // This prevents plaintext password comparison if the DB was compromised.
  if (!storedHash.includes(':')) {
    return false;
  }

  const [saltHex, hashHex] = storedHash.split(':');
  const saltMatch = saltHex.match(/.{1,2}/g);

  if (!saltMatch) return false;

  const salt = new Uint8Array(saltMatch.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 600000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  // Constant-time comparison ensures that the comparison takes the same amount
  // of time regardless of how many bytes match, preventing timing side-channel attacks.
  const computedBytes = new Uint8Array(hashBuffer);
  const storedBytes = new Uint8Array(
    (hashHex.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16))
  );

  if (computedBytes.length !== storedBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < computedBytes.length; i++) {
    diff |= computedBytes[i] ^ storedBytes[i];
  }
  return diff === 0;
};

/**
 * Constant-time string comparison utility.
 * Purpose: Safely compares sensitive tokens (like CSRF or OTPs) without leaking 
 * their length or content via timing side-channel attacks.
 */
export const timingSafeEqual = (a: string, b: string): boolean => {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  const lenA = bufA.length;
  const lenB = bufB.length;

  let diff = lenA ^ lenB; // If lengths differ, diff > 0, ensuring failure
  const maxLength = Math.max(lenA, lenB);

  for (let i = 0; i < maxLength; i++) {
    const valA = i < lenA ? bufA[i] : 0;
    const valB = i < lenB ? bufB[i] : 0;
    diff |= valA ^ valB;
  }

  return diff === 0;
};

// ==============================================================
// API Key Cryptography (HMAC-SHA256 Stateless Keys)
// ==============================================================
// These functions generate and verify API keys statelessly.
// The key itself contains its permissions/domain, signed by the Master Secret.
// This means the API can verify keys without hitting the database on every request.

/**
 * Extracts and normalizes the hostname from a URL string to prevent bypasses.
 */
export const normalizeDomain = (domain: string): string => {
  try {
    let normalized = domain.trim().toLowerCase();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    const url = new URL(normalized);
    let hostname = url.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch {
    let cleaned = domain.trim().toLowerCase();
    cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, '');
    cleaned = cleaned.split('/')[0];
    return cleaned;
  }
};

const textEncoder = new TextEncoder();
const encodeText = (str: string) => textEncoder.encode(str);

const bufferToBase64Url = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64UrlToBuffer = (base64Url: string): ArrayBuffer => {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const importSecretKey = async (secret: string): Promise<CryptoKey> => {
  return await crypto.subtle.importKey(
    'raw',
    encodeText(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

export interface GenerateKeyResult {
  fullKey: string;
  shortKey: string;
  payloadStr: string;
}

/**
 * Generates a signed, stateless API key.
 */
export const generateApiKey = async (domain: string, secret: string): Promise<GenerateKeyResult> => {
  const cryptoKey = await importSecretKey(secret);
  const normalizedDomain = normalizeDomain(domain);

  const payload = {
    domain: normalizedDomain,
    iat: Math.floor(Date.now() / 1000)
    // Keys never expire per system requirements
  };

  const payloadStr = JSON.stringify(payload);
  const base64Payload = bufferToBase64Url(encodeText(payloadStr));

  const prefix = 'auradash_pk';
  const shortKey = `${prefix}.${base64Payload}`;

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encodeText(shortKey));
  const base64Signature = bufferToBase64Url(signatureBuffer);

  const fullKey = `${shortKey}.${base64Signature}`;

  return { fullKey, shortKey, payloadStr };
};

/**
 * Generates a signed, stateless test API key with a strict maximum expiration of 24 hours.
 */
export const generateTestApiKey = async (expiresInHours: number, secret: string): Promise<GenerateKeyResult> => {
  const cryptoKey = await importSecretKey(secret);
  
  // Enforce a strict maximum of 24 hours and a minimum of 1 hour
  const duration = Math.min(24, Math.max(1, expiresInHours));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (duration * 3600);

  const payload = {
    iat,
    exp
  };

  const payloadStr = JSON.stringify(payload);
  const base64Payload = bufferToBase64Url(encodeText(payloadStr));

  const prefix = 'auradash_ts';
  const shortKey = `${prefix}.${base64Payload}`;

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encodeText(shortKey));
  const base64Signature = bufferToBase64Url(signatureBuffer);

  const fullKey = `${shortKey}.${base64Signature}`;

  return { fullKey, shortKey, payloadStr };
};

/**
 * Verifies the stateless API key using HMAC signature verification.
 */
export const verifyApiKey = async (apiKey: string, secret: string): Promise<{ valid: boolean; payload?: any; normalizedDomain?: string; isTestKey?: boolean }> => {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false };
  }

  const parts = apiKey.split('.');
  if (parts.length !== 3) {
    return { valid: false };
  }

  const prefix = parts[0];
  if (prefix !== 'auradash_pk' && prefix !== 'auradash_ts') {
    return { valid: false };
  }

  const payloadBase64 = parts[1];
  const signatureBase64 = parts[2];
  const shortKey = `${prefix}.${payloadBase64}`;

  try {
    const cryptoKey = await importSecretKey(secret);
    const signatureBuffer = base64UrlToBuffer(signatureBase64);
    // Constant-time timing-safe comparison built into Web Crypto API verify
    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signatureBuffer, encodeText(shortKey));
    if (!isValid) {
      return { valid: false };
    }

    const payloadBuffer = base64UrlToBuffer(payloadBase64);
    const decoder = new TextDecoder();
    const payloadStr = decoder.decode(payloadBuffer);
    const payload = JSON.parse(payloadStr);

    if (prefix === 'auradash_ts') {
      const now = Math.floor(Date.now() / 1000);
      if (!payload.exp || now > payload.exp) {
        return { valid: false };
      }
      return {
        valid: true,
        payload,
        isTestKey: true
      };
    }

    return {
      valid: true,
      payload,
      normalizedDomain: payload.domain,
      isTestKey: false
    };

  } catch (error) {
    return { valid: false };
  }
};
