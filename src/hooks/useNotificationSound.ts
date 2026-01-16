import { useCallback, useRef, useState, useEffect } from "react";

const NOTIFICATION_SOUND_KEY = "notification_sound_enabled";
const NOTIFICATION_SOUND_CONFIG_KEY = "notification_sound_config";

export type NotificationType = "ticket" | "file" | "brand" | "design" | "message" | "project" | "payment" | "default";
export type SoundStyle = "chime" | "bell" | "pop" | "ding" | "soft" | "alert";

interface SoundConfig {
  enabled: boolean;
  style: SoundStyle;
}

interface NotificationSoundConfig {
  globalEnabled: boolean;
  types: Record<NotificationType, SoundConfig>;
}

const defaultConfig: NotificationSoundConfig = {
  globalEnabled: true,
  types: {
    ticket: { enabled: true, style: "chime" },
    file: { enabled: true, style: "pop" },
    brand: { enabled: true, style: "bell" },
    design: { enabled: true, style: "soft" },
    message: { enabled: true, style: "ding" },
    project: { enabled: true, style: "bell" },
    payment: { enabled: true, style: "chime" },
    default: { enabled: true, style: "ding" },
  },
};

// Sound definitions with different frequencies and patterns
const soundDefinitions: Record<SoundStyle, { frequencies: number[]; durations: number[]; type: OscillatorType }> = {
  chime: {
    frequencies: [880, 1108.73, 1318.51],
    durations: [0.1, 0.1, 0.3],
    type: "sine",
  },
  bell: {
    frequencies: [659.25, 783.99, 987.77],
    durations: [0.15, 0.15, 0.4],
    type: "sine",
  },
  pop: {
    frequencies: [523.25, 659.25],
    durations: [0.08, 0.12],
    type: "sine",
  },
  ding: {
    frequencies: [1046.5],
    durations: [0.4],
    type: "sine",
  },
  soft: {
    frequencies: [440, 554.37, 659.25],
    durations: [0.2, 0.2, 0.3],
    type: "sine",
  },
  alert: {
    frequencies: [800, 1000, 800, 1000],
    durations: [0.1, 0.1, 0.1, 0.15],
    type: "square",
  },
};

export const soundLabels: Record<SoundStyle, string> = {
  chime: "Sino harmonioso",
  bell: "Campainha suave",
  pop: "Pop rápido",
  ding: "Ding simples",
  soft: "Tom suave",
  alert: "Alerta urgente",
};

export const typeLabels: Record<NotificationType, string> = {
  ticket: "Tickets",
  file: "Arquivos",
  brand: "Marca",
  design: "Design",
  message: "Mensagens",
  project: "Projetos",
  payment: "Pagamentos",
  default: "Outros",
};

// Check if user has given consent for preferences cookies
function hasPreferencesConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const consent = localStorage.getItem("webq-cookie-consent");
    if (consent) {
      const parsed = JSON.parse(consent);
      return parsed.consentGiven && parsed.preferences;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

// Hook to manage notification sound preferences
export function useNotificationSoundPreference() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined" && hasPreferencesConsent()) {
      const stored = localStorage.getItem(NOTIFICATION_SOUND_KEY);
      return stored !== "false";
    }
    return true;
  });

  const toggleSound = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    // Only persist to localStorage if user has given consent for preferences
    if (hasPreferencesConsent()) {
      localStorage.setItem(NOTIFICATION_SOUND_KEY, String(enabled));
    }
  }, []);

  return { soundEnabled, toggleSound };
}

// Hook to manage advanced notification sound config
export function useNotificationSoundConfig() {
  const [config, setConfig] = useState<NotificationSoundConfig>(() => {
    if (typeof window !== "undefined" && hasPreferencesConsent()) {
      const stored = localStorage.getItem(NOTIFICATION_SOUND_CONFIG_KEY);
      if (stored) {
        try {
          return { ...defaultConfig, ...JSON.parse(stored) };
        } catch {
          return defaultConfig;
        }
      }
    }
    return defaultConfig;
  });

  const updateConfig = useCallback((newConfig: Partial<NotificationSoundConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      // Only persist to localStorage if user has given consent for preferences
      if (hasPreferencesConsent()) {
        localStorage.setItem(NOTIFICATION_SOUND_CONFIG_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const updateTypeConfig = useCallback((type: NotificationType, typeConfig: Partial<SoundConfig>) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        types: {
          ...prev.types,
          [type]: { ...prev.types[type], ...typeConfig },
        },
      };
      // Only persist to localStorage if user has given consent for preferences
      if (hasPreferencesConsent()) {
        localStorage.setItem(NOTIFICATION_SOUND_CONFIG_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return { config, updateConfig, updateTypeConfig };
}

// Simple notification sound using Web Audio API
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { soundEnabled } = useNotificationSoundPreference();
  const { config } = useNotificationSoundConfig();

  const playSound = useCallback((style: SoundStyle) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const soundDef = soundDefinitions[style];
      const now = audioContext.currentTime;
      let currentTime = now;

      soundDef.frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = soundDef.type;
        oscillator.frequency.setValueAtTime(freq, currentTime);

        const duration = soundDef.durations[index];
        
        // Envelope
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.25, currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.2, currentTime + duration * 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);

        oscillator.onended = () => {
          oscillator.disconnect();
          gainNode.disconnect();
        };

        currentTime += duration;
      });
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  }, []);

  const playNotificationSound = useCallback((notificationType?: NotificationType) => {
    if (!soundEnabled || !config.globalEnabled) return;

    const type = notificationType || "default";
    const typeConfig = config.types[type];

    if (!typeConfig?.enabled) return;

    playSound(typeConfig.style);
  }, [soundEnabled, config, playSound]);

  const testSound = useCallback((style: SoundStyle) => {
    playSound(style);
  }, [playSound]);

  return { playNotificationSound, testSound };
}
