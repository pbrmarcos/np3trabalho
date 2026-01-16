import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Send, CheckCircle2, AlertTriangle, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  message: string;
  message_type: string;
  created_at: string;
  read_at: string | null;
  project_id: string | null;
}

interface MessagePopupProps {
  message: Message;
  projectId: string;
}

const VIEW_COUNT_KEY = "message_popup_view_count_";
const MAX_VIEWS = 3;
const AUTO_CLOSE_MS = 20000;

const messageTypeConfig = {
  info: {
    icon: Send,
    color: "border-primary/30 bg-primary/10",
    iconColor: "text-primary",
    title: "Nova mensagem da WebQ",
    progressColor: "bg-primary",
  },
  success: {
    icon: CheckCircle2,
    color: "border-emerald-500/30 bg-emerald-500/10",
    iconColor: "text-emerald-600",
    title: "Atualização da WebQ",
    progressColor: "bg-emerald-500",
  },
  warning: {
    icon: AlertTriangle,
    color: "border-amber-500/30 bg-amber-500/10",
    iconColor: "text-amber-600",
    title: "Aviso importante",
    progressColor: "bg-amber-500",
  },
};

export default function MessagePopup({ message, projectId }: MessagePopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isUnread = !message.read_at;
  const storageKey = `${VIEW_COUNT_KEY}${message.id}`;

  const normalizedType = (() => {
    const t = (message.message_type || "info").toLowerCase().trim();
    if (["success", "sucesso", "ok", "positivo"].includes(t)) return "success";
    if (["warning", "warn", "aviso", "atencao", "atenção"].includes(t)) return "warning";
    return "info";
  })();

  const config =
    messageTypeConfig[normalizedType as keyof typeof messageTypeConfig] || messageTypeConfig.info;
  const Icon = config.icon;

  useEffect(() => {
    if (!isUnread) return;

    const viewCount = parseInt(localStorage.getItem(storageKey) || "0", 10);
    if (viewCount >= MAX_VIEWS) return;

    localStorage.setItem(storageKey, String(viewCount + 1));

    const showTimer = setTimeout(() => {
      setIsVisible(true);
      setProgress(100);

      const startTime = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / AUTO_CLOSE_MS) * 100);
        setProgress(remaining);

        if (remaining <= 0) {
          setIsVisible(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 100);
    }, 500);

    return () => {
      clearTimeout(showTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isUnread, storageKey, message.id]);

  const markAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("timeline_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", message.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-messages-data", projectId] });
      queryClient.invalidateQueries({ queryKey: ["client-unread-admin-messages"] });
      queryClient.invalidateQueries({ queryKey: ["client-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["client-latest-unread-message"] });
      localStorage.removeItem(storageKey);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsVisible(false);
    },
  });

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsVisible(false);
  };

  if (!isUnread) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 transition-all duration-500 ease-out ${
        isVisible ? "translate-x-0 opacity-100" : "-translate-x-[120%] opacity-0"
      }`}
    >
      <Card className={`w-80 md:w-96 shadow-xl overflow-hidden ${config.color}`}
      >
        {/* Progress bar */}
        <div className="h-1 w-full bg-muted/30">
          <div
            className={`h-full transition-all duration-100 ${config.progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`h-4 w-4 ${config.iconColor}`} />
              </div>
              <div>
                <span className={`text-sm font-medium ${config.iconColor}`}>{config.title}</span>
                <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0 h-4">
                  Nova
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-60 hover:opacity-100"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-foreground mb-2 line-clamp-3">{message.message}</p>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => markAsRead.mutate()}
              disabled={markAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar como lida
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
