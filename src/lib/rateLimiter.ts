// Rate limiter for login attempts to prevent brute force attacks
const LOGIN_RATE_LIMIT_KEY = "webq_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitData {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

export function getLoginRateLimitData(): RateLimitData {
  try {
    const stored = localStorage.getItem(LOGIN_RATE_LIMIT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("[RateLimiter] Error reading rate limit data:", e);
  }
  return { attempts: 0, lastAttempt: 0, lockedUntil: null };
}

function saveLoginRateLimitData(data: RateLimitData): void {
  try {
    localStorage.setItem(LOGIN_RATE_LIMIT_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("[RateLimiter] Error saving rate limit data:", e);
  }
}

export function isLoginLocked(): { locked: boolean; remainingMs: number } {
  const data = getLoginRateLimitData();
  const now = Date.now();
  
  // Check if lockout has expired
  if (data.lockedUntil && now >= data.lockedUntil) {
    // Reset after lockout expires
    resetLoginAttempts();
    return { locked: false, remainingMs: 0 };
  }
  
  if (data.lockedUntil && now < data.lockedUntil) {
    return { locked: true, remainingMs: data.lockedUntil - now };
  }
  
  return { locked: false, remainingMs: 0 };
}

export function recordLoginAttempt(success: boolean): { 
  locked: boolean; 
  remainingAttempts: number; 
  lockoutMinutes: number;
} {
  const now = Date.now();
  let data = getLoginRateLimitData();
  
  // If successful login, reset attempts
  if (success) {
    resetLoginAttempts();
    return { locked: false, remainingAttempts: MAX_ATTEMPTS, lockoutMinutes: 0 };
  }
  
  // Failed attempt
  data.attempts += 1;
  data.lastAttempt = now;
  
  // Check if should lock
  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = now + LOCKOUT_DURATION_MS;
    saveLoginRateLimitData(data);
    return { 
      locked: true, 
      remainingAttempts: 0, 
      lockoutMinutes: Math.ceil(LOCKOUT_DURATION_MS / 60000) 
    };
  }
  
  saveLoginRateLimitData(data);
  return { 
    locked: false, 
    remainingAttempts: MAX_ATTEMPTS - data.attempts, 
    lockoutMinutes: 0 
  };
}

export function resetLoginAttempts(): void {
  try {
    localStorage.removeItem(LOGIN_RATE_LIMIT_KEY);
  } catch (e) {
    console.error("[RateLimiter] Error resetting rate limit:", e);
  }
}

export function formatLockoutTime(remainingMs: number): string {
  const minutes = Math.ceil(remainingMs / 60000);
  if (minutes === 1) {
    return "1 minuto";
  }
  return `${minutes} minutos`;
}
