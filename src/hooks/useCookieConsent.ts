import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CookieCategory = "essential" | "preferences" | "analytics" | "marketing";

export interface CookieConsentState {
  essential: boolean; // Always true
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  consentGiven: boolean;
  consentDate: string | null;
}

const COOKIE_CONSENT_KEY = "webq-cookie-consent";

const defaultState: CookieConsentState = {
  essential: true,
  preferences: false,
  analytics: false,
  marketing: false,
  consentGiven: false,
  consentDate: null,
};

export interface CookieInfo {
  name: string;
  category: CookieCategory;
  purpose: string;
  duration: string;
}

// Predefined cookies list
export const predefinedCookies: CookieInfo[] = [
  {
    name: "sb-*-auth-token",
    category: "essential",
    purpose: "Autenticação do usuário e sessão segura",
    duration: "Sessão",
  },
  {
    name: "webq-cookie-consent",
    category: "essential",
    purpose: "Armazenar suas preferências de cookies",
    duration: "1 ano",
  },
  {
    name: "webq_login_attempts",
    category: "essential",
    purpose: "Proteção contra ataques de força bruta",
    duration: "24 horas",
  },
  {
    name: "webq-theme",
    category: "preferences",
    purpose: "Lembrar sua preferência de tema (claro/escuro)",
    duration: "Permanente",
  },
  {
    name: "sidebar:state",
    category: "preferences",
    purpose: "Lembrar o estado da barra lateral",
    duration: "Permanente",
  },
  {
    name: "notification-sound-*",
    category: "preferences",
    purpose: "Configurações de sons de notificação",
    duration: "Permanente",
  },
  {
    name: "help_session_id",
    category: "analytics",
    purpose: "Identificar sessão para métricas de ajuda",
    duration: "Sessão",
  },
  {
    name: "help_feedback_*",
    category: "analytics",
    purpose: "Rastrear feedback enviado em artigos",
    duration: "Permanente",
  },
];

// Category configuration
export const categoryConfig: Record<CookieCategory, { label: string; description: string; locked: boolean }> = {
  essential: {
    label: "Necessários",
    description: "Essenciais para o funcionamento básico do site. Não podem ser desativados.",
    locked: true,
  },
  analytics: {
    label: "Análise e Desempenho",
    description: "Nos ajudam a entender como você usa o site para melhorar a experiência.",
    locked: false,
  },
  preferences: {
    label: "Preferências",
    description: "Lembram suas escolhas como tema, idioma e configurações de interface.",
    locked: false,
  },
  marketing: {
    label: "Marketing e Conteúdo Incorporado",
    description: "Permitem conteúdo de terceiros como vídeos do YouTube e mapas do Google.",
    locked: false,
  },
};

function getStoredConsent(): CookieConsentState {
  if (typeof window === "undefined") return defaultState;
  
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultState,
        ...parsed,
        essential: true, // Always true
      };
    }
  } catch (e) {
    console.error("[CookieConsent] Error reading stored consent:", e);
  }
  
  return defaultState;
}

function saveConsent(state: CookieConsentState): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("[CookieConsent] Error saving consent:", e);
  }
}

// Parse user agent to extract browser and OS info
function parseUserAgent(ua: string): { browser: string; browserVersion: string; os: string; deviceType: string } {
  let browser = "Unknown";
  let browserVersion = "";
  let os = "Unknown";
  let deviceType = "desktop";

  // Detect device type
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    deviceType = /iPad|Tablet/i.test(ua) ? "tablet" : "mobile";
  }

  // Detect browser
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || "";
  } else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) {
    browser = "Chrome";
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || "";
  } else if (/Firefox/i.test(ua)) {
    browser = "Firefox";
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || "";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Safari";
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || "";
  } else if (/Opera|OPR/i.test(ua)) {
    browser = "Opera";
    browserVersion = ua.match(/(?:Opera|OPR)\/([\d.]+)/)?.[1] || "";
  }

  // Detect OS
  if (/Windows NT 10/i.test(ua)) os = "Windows 10/11";
  else if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { browser, browserVersion, os, deviceType };
}

// Get locale-based country (limited accuracy but privacy-friendly)
function getLocaleCountry(): { country: string; region: string } {
  try {
    const locale = navigator.language || navigator.languages?.[0] || "en-US";
    const parts = locale.split("-");
    const country = parts[1] || parts[0].toUpperCase();
    
    // Map common country codes to names
    const countryNames: Record<string, string> = {
      BR: "Brasil",
      US: "Estados Unidos",
      PT: "Portugal",
      ES: "Espanha",
      AR: "Argentina",
      MX: "México",
      CO: "Colômbia",
      CL: "Chile",
      PE: "Peru",
      GB: "Reino Unido",
      DE: "Alemanha",
      FR: "França",
      IT: "Itália",
    };
    
    return {
      country: countryNames[country] || country,
      region: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    };
  } catch {
    return { country: "Desconhecido", region: "" };
  }
}

// Track navigation for consent audit
const NAVIGATION_KEY = "consent_navigation";

function trackNavigation(): { pagesVisited: number; timeOnSite: number } {
  try {
    const stored = sessionStorage.getItem(NAVIGATION_KEY);
    const now = Date.now();
    
    if (stored) {
      const data = JSON.parse(stored);
      const timeOnSite = Math.round((now - data.startTime) / 1000);
      // Increment pages visited
      data.pages++;
      sessionStorage.setItem(NAVIGATION_KEY, JSON.stringify(data));
      return { pagesVisited: data.pages, timeOnSite };
    } else {
      // First visit
      sessionStorage.setItem(NAVIGATION_KEY, JSON.stringify({ pages: 1, startTime: now }));
      return { pagesVisited: 1, timeOnSite: 0 };
    }
  } catch {
    return { pagesVisited: 1, timeOnSite: 0 };
  }
}

// Initialize navigation tracking on load
if (typeof window !== "undefined") {
  trackNavigation();
}

// Log consent event to database for LGPD compliance
async function logConsentEvent(
  consentType: string,
  state: CookieConsentState
): Promise<void> {
  try {
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get user profile for email/name if logged in
    let userEmail: string | null = null;
    let userName: string | null = null;
    
    if (user?.id) {
      userEmail = user.email || null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profile) {
        userName = profile.full_name || null;
        userEmail = userEmail || profile.email || null;
      }
    }
    
    // Generate or get session ID
    let sessionId = sessionStorage.getItem("consent_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("consent_session_id", sessionId);
    }

    // Parse user agent
    const ua = navigator.userAgent || "";
    const { browser, browserVersion, os, deviceType } = parseUserAgent(ua);
    
    // Get locale info
    const { country, region } = getLocaleCountry();
    
    // Get navigation data
    const { pagesVisited, timeOnSite } = trackNavigation();

    await supabase.from("cookie_consent_logs").insert({
      user_id: user?.id || null,
      user_email: userEmail,
      user_name: userName,
      session_id: sessionId,
      user_agent: ua.substring(0, 500) || null,
      consent_type: consentType,
      essential: state.essential,
      preferences: state.preferences,
      analytics: state.analytics,
      marketing: state.marketing,
      page_url: window.location.pathname,
      country,
      region,
      device_type: deviceType,
      browser_name: browser,
      browser_version: browserVersion,
      os_name: os,
      referrer_url: document.referrer?.substring(0, 500) || null,
      pages_visited: pagesVisited,
      time_on_site_seconds: timeOnSite,
    });
  } catch (e) {
    console.error("[CookieConsent] Error logging consent:", e);
  }
}

// Clear non-essential cookies/storage when consent is withdrawn
function clearNonEssentialStorage(category: CookieCategory): void {
  if (typeof window === "undefined") return;

  const keysToRemove: Record<CookieCategory, string[]> = {
    essential: [], // Never clear essential
    preferences: ["webq-theme", "sidebar:state", "notification-sound-enabled", "notification-sound-config"],
    analytics: ["help_session_id"],
    marketing: [], // Currently no marketing cookies stored locally
  };

  const keys = keysToRemove[category];
  keys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  // Clear prefixed keys
  if (category === "analytics") {
    const localKeys = Object.keys(localStorage);
    localKeys.forEach((key) => {
      if (key.startsWith("help_feedback_")) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Auto-detect active cookies/storage
export function detectActiveCookies(): { localStorage: string[]; sessionStorage: string[]; cookies: string[] } {
  if (typeof window === "undefined") {
    return { localStorage: [], sessionStorage: [], cookies: [] };
  }

  const localStorageKeys = Object.keys(localStorage);
  const sessionStorageKeys = Object.keys(sessionStorage);
  const documentCookies = document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean);

  return {
    localStorage: localStorageKeys,
    sessionStorage: sessionStorageKeys,
    cookies: documentCookies,
  };
}

// Categorize a detected cookie
export function categorizeCookie(cookieName: string): CookieCategory {
  // Check against predefined patterns
  for (const cookie of predefinedCookies) {
    const pattern = cookie.name.replace(/\*/g, ".*");
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(cookieName)) {
      return cookie.category;
    }
  }

  // Default categorization based on common patterns
  if (cookieName.includes("auth") || cookieName.includes("session") || cookieName.includes("csrf")) {
    return "essential";
  }
  if (cookieName.includes("theme") || cookieName.includes("sidebar") || cookieName.includes("sound")) {
    return "preferences";
  }
  if (cookieName.includes("analytics") || cookieName.includes("feedback") || cookieName.includes("metric")) {
    return "analytics";
  }
  if (cookieName.includes("ad") || cookieName.includes("marketing") || cookieName.includes("_ga") || cookieName.includes("fbp")) {
    return "marketing";
  }

  return "essential"; // Default to essential for unknown cookies
}

export function useCookieConsent() {
  const [consent, setConsentState] = useState<CookieConsentState>(getStoredConsent);

  // Sync with localStorage on mount
  useEffect(() => {
    const stored = getStoredConsent();
    setConsentState(stored);
  }, []);

  const hasConsent = useCallback(
    (category: CookieCategory): boolean => {
      if (category === "essential") return true;
      return consent.consentGiven && consent[category];
    },
    [consent]
  );

  const setConsent = useCallback((category: CookieCategory, value: boolean) => {
    if (category === "essential") return; // Can't change essential

    setConsentState((prev) => {
      const newState = {
        ...prev,
        [category]: value,
        consentGiven: true,
        consentDate: new Date().toISOString(),
      };
      saveConsent(newState);

      // Clear storage if consent is withdrawn
      if (!value) {
        clearNonEssentialStorage(category);
      }

      return newState;
    });
  }, []);

  const acceptAll = useCallback(() => {
    const newState: CookieConsentState = {
      essential: true,
      preferences: true,
      analytics: true,
      marketing: true,
      consentGiven: true,
      consentDate: new Date().toISOString(),
    };
    setConsentState(newState);
    saveConsent(newState);
    logConsentEvent("accept_all", newState);
  }, []);

  const acceptEssentialOnly = useCallback(() => {
    const newState: CookieConsentState = {
      essential: true,
      preferences: false,
      analytics: false,
      marketing: false,
      consentGiven: true,
      consentDate: new Date().toISOString(),
    };
    setConsentState(newState);
    saveConsent(newState);
    logConsentEvent("accept_essential", newState);
    
    // Clear non-essential storage
    clearNonEssentialStorage("preferences");
    clearNonEssentialStorage("analytics");
    clearNonEssentialStorage("marketing");
  }, []);

  const saveCustomConsent = useCallback((preferences: boolean, analytics: boolean, marketing: boolean) => {
    const newState: CookieConsentState = {
      essential: true,
      preferences,
      analytics,
      marketing,
      consentGiven: true,
      consentDate: new Date().toISOString(),
    };
    setConsentState(newState);
    saveConsent(newState);
    logConsentEvent("custom", newState);

    if (!preferences) clearNonEssentialStorage("preferences");
    if (!analytics) clearNonEssentialStorage("analytics");
    if (!marketing) clearNonEssentialStorage("marketing");
  }, []);

  const resetConsent = useCallback(() => {
    const resetState = { ...defaultState };
    setConsentState(resetState);
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    logConsentEvent("reset", resetState);
  }, []);

  return {
    consent,
    hasConsent,
    setConsent,
    acceptAll,
    acceptEssentialOnly,
    saveCustomConsent,
    resetConsent,
    showBanner: !consent.consentGiven,
  };
}

// Utility hook for components that need to check consent before storing data
export function useConsentCheck() {
  const { hasConsent } = useCookieConsent();
  
  const canStorePreferences = hasConsent("preferences");
  const canStoreAnalytics = hasConsent("analytics");
  const canStoreMarketing = hasConsent("marketing");

  return {
    canStorePreferences,
    canStoreAnalytics,
    canStoreMarketing,
    hasConsent,
  };
}
