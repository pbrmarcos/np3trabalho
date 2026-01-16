import { useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailConfirmationAlertProps {
  email: string;
}

export default function EmailConfirmationAlert({ email }: EmailConfirmationAlertProps) {
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      toast.success("Email de confirmação reenviado!");
    } catch (error) {
      toast.error("Erro ao reenviar email. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground mb-1">
            Confirme seu email para garantir acesso à sua conta
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Enviamos um email de confirmação para: <span className="font-medium">{email}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResendEmail}
            disabled={isResending}
            className="h-8 text-xs border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
          >
            {isResending ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Reenviar email de confirmação
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
