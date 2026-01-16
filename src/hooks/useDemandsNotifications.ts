import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAdminDemands } from "./useAdminDemands";
import { useNotificationSound } from "./useNotificationSound";

interface SLANotificationConfig {
  enabled: boolean;
  warningPercent: number;
  soundEnabled: boolean;
  toastEnabled: boolean;
}

const defaultNotificationConfig: SLANotificationConfig = {
  enabled: true,
  warningPercent: 25,
  soundEnabled: true,
  toastEnabled: true,
};

export function useDemandsNotifications() {
  const { demands, overdue, urgent, slaConfig } = useAdminDemands();
  const { playNotificationSound } = useNotificationSound();
  const notifiedDemandsRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<Date>(new Date());

  const config = slaConfig?.notifications || defaultNotificationConfig;

  const checkAndNotify = useCallback(() => {
    if (!config.enabled || demands.length === 0) return;

    const now = new Date();
    
    demands.forEach((demand) => {
      const demandKey = `${demand.type}-${demand.id}`;
      
      // Skip if already notified recently
      if (notifiedDemandsRef.current.has(demandKey)) return;

      const remaining = demand.deadline.getTime() - now.getTime();
      const totalTime = demand.estimatedDays * 24 * 60 * 60 * 1000;
      const percentRemaining = (remaining / totalTime) * 100;
      const isOverdue = remaining < 0;
      const isWarning = !isOverdue && percentRemaining < config.warningPercent;

      if (isOverdue || isWarning) {
        // Mark as notified
        notifiedDemandsRef.current.add(demandKey);

        // Show toast notification
        if (config.toastEnabled) {
          const title = isOverdue 
            ? `⚠️ Prazo vencido: ${demand.title}`
            : `⏰ Prazo urgente: ${demand.title}`;
          
          const description = isOverdue
            ? `${demand.clientName} - Demanda atrasada!`
            : `${demand.clientName} - Menos de ${Math.round(percentRemaining)}% do tempo restante`;

          toast.warning(title, {
            description,
            duration: 10000,
            action: {
              label: "Ver",
              onClick: () => {
                if (demand.type === 'ticket' && demand.projectId) {
                  window.location.href = `/admin/projects/${demand.projectId}?tab=tickets&ticket=${demand.id}`;
                } else {
                  window.location.href = `/admin/design/${demand.id}`;
                }
              },
            },
          });
        }

        // Play sound
        if (config.soundEnabled) {
          playNotificationSound('default');
        }
      }
    });

    // Clear old notifications after 5 minutes to allow re-notification
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (lastCheckRef.current < fiveMinutesAgo) {
      notifiedDemandsRef.current.clear();
      lastCheckRef.current = now;
    }
  }, [demands, config, playNotificationSound]);

  // Check periodically
  useEffect(() => {
    if (!config.enabled) return;

    // Initial check
    checkAndNotify();

    // Check every 30 seconds
    const interval = setInterval(checkAndNotify, 30000);

    return () => clearInterval(interval);
  }, [checkAndNotify, config.enabled]);

  return {
    overdue,
    urgent,
    demandsCount: demands.length,
  };
}
