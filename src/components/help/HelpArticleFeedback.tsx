import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpArticleFeedbackProps {
  articleId: string;
}

// Check if user has given consent for analytics cookies
function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const consent = localStorage.getItem("webq-cookie-consent");
    if (consent) {
      const parsed = JSON.parse(consent);
      return parsed.consentGiven && parsed.analytics;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

export default function HelpArticleFeedback({ articleId }: HelpArticleFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    // Only track session if user has given consent for analytics
    if (hasAnalyticsConsent()) {
      // Generate or get session ID for anonymous tracking
      let sid = sessionStorage.getItem("help_session_id");
      if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem("help_session_id", sid);
      }
      setSessionId(sid);

      // Check if already submitted for this article
      const feedbackKey = `help_feedback_${articleId}`;
      if (localStorage.getItem(feedbackKey)) {
        setSubmitted(true);
      }
    } else {
      // Generate a temporary session ID for this page load only (not stored)
      setSessionId(crypto.randomUUID());
    }
  }, [articleId]);

  const feedbackMutation = useMutation({
    mutationFn: async (isHelpful: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("help_article_feedback").insert({
        article_id: articleId,
        is_helpful: isHelpful,
        user_id: user?.id || null,
        session_id: sessionId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      // Only persist feedback status if user has given consent for analytics
      if (hasAnalyticsConsent()) {
        localStorage.setItem(`help_feedback_${articleId}`, "true");
      }
    },
  });

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <Check className="h-5 w-5 text-primary" />
        <span className="text-sm text-foreground">Obrigado pelo seu feedback!</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/50 rounded-lg border">
      <p className="text-sm font-medium mb-3">Este artigo foi útil?</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => feedbackMutation.mutate(true)}
          disabled={feedbackMutation.isPending}
          className={cn(
            "gap-2",
            feedbackMutation.isPending && "opacity-50"
          )}
        >
          <ThumbsUp className="h-4 w-4" />
          Sim
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => feedbackMutation.mutate(false)}
          disabled={feedbackMutation.isPending}
          className={cn(
            "gap-2",
            feedbackMutation.isPending && "opacity-50"
          )}
        >
          <ThumbsDown className="h-4 w-4" />
          Não
        </Button>
      </div>
    </div>
  );
}
