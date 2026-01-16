import { useState, useEffect, useCallback } from "react";
import { Trash2, Shield, AlertTriangle, CheckCircle2, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MAX_CAPTCHA_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Generate a simple math captcha
function generateCaptcha(): { question: string; answer: number } {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ['+', '-', '×'] as const;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let answer: number;
  switch (operator) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = num1 - num2;
      break;
    case '×':
      answer = num1 * num2;
      break;
  }
  
  return {
    question: `${num1} ${operator} ${num2} = ?`,
    answer,
  };
}

export function CookieDataDeletionDialog() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Captcha state
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  
  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingLockoutTime, setRemainingLockoutTime] = useState(0);

  // Check lockout status from localStorage on mount
  useEffect(() => {
    const storedLockout = localStorage.getItem("captcha_lockout");
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem("captcha_lockout");
      }
    }
    
    const storedAttempts = localStorage.getItem("captcha_attempts");
    if (storedAttempts) {
      setFailedAttempts(parseInt(storedAttempts, 10));
    }
  }, []);

  // Update remaining lockout time
  useEffect(() => {
    if (!lockoutUntil) {
      setRemainingLockoutTime(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, lockoutUntil - Date.now());
      setRemainingLockoutTime(remaining);
      
      if (remaining === 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        localStorage.removeItem("captcha_lockout");
        localStorage.removeItem("captcha_attempts");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = lockoutUntil !== null && lockoutUntil > Date.now();

  // Get current session ID if available
  const currentSessionId = typeof window !== "undefined" 
    ? sessionStorage.getItem("consent_session_id") 
    : null;

  // Regenerate captcha
  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer("");
    setCaptchaError(false);
  }, []);

  // Auto-fill session ID and reset captcha when dialog opens
  useEffect(() => {
    if (open) {
      if (currentSessionId && !sessionId) {
        setSessionId(currentSessionId);
      }
      refreshCaptcha();
    }
  }, [open, currentSessionId]);

  const formatLockoutTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if locked out
    if (isLockedOut) {
      toast({
        title: "Bloqueado temporariamente",
        description: `Aguarde ${formatLockoutTime(remainingLockoutTime)} antes de tentar novamente.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate captcha first
    const userAnswer = parseInt(captchaAnswer.trim(), 10);
    if (isNaN(userAnswer) || userAnswer !== captcha.answer) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem("captcha_attempts", newAttempts.toString());
      
      setCaptchaError(true);
      
      if (newAttempts >= MAX_CAPTCHA_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(lockoutTime);
        localStorage.setItem("captcha_lockout", lockoutTime.toString());
        
        toast({
          title: "Muitas tentativas incorretas",
          description: "Você foi bloqueado por 5 minutos.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Captcha incorreto",
          description: `Tentativa ${newAttempts} de ${MAX_CAPTCHA_ATTEMPTS}. Responda corretamente.`,
          variant: "destructive",
        });
      }
      
      refreshCaptcha();
      return;
    }

    // Reset attempts on success
    setFailedAttempts(0);
    localStorage.removeItem("captcha_attempts");

    const idToDelete = sessionId.trim() || currentSessionId;
    
    if (!idToDelete) {
      toast({
        title: "ID de sessão obrigatório",
        description: "Informe seu ID de sessão para deletar os dados.",
        variant: "destructive",
      });
      return;
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idToDelete)) {
      toast({
        title: "ID inválido",
        description: "O ID de sessão informado não está em um formato válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("delete-cookie-data", {
        body: { session_id: idToDelete },
      });

      if (error) throw error;

      setResult({
        success: true,
        message: data.message || "Dados deletados com sucesso",
      });

      // Clear local session ID if it was the current one
      if (idToDelete === currentSessionId) {
        sessionStorage.removeItem("consent_session_id");
      }

      toast({
        title: "Dados deletados",
        description: data.message,
      });
    } catch (error: unknown) {
      console.error("Error deleting cookie data:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Erro ao deletar dados";
      
      setResult({
        success: false,
        message: errorMessage,
      });

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSessionId("");
    setResult(null);
    setCaptchaAnswer("");
    setCaptchaError(false);
  };

  const isCaptchaValid = captchaAnswer.trim() !== "" && parseInt(captchaAnswer.trim(), 10) === captcha.answer;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
          <Shield className="h-3 w-3 mr-1" />
          Direito ao Esquecimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Direito ao Esquecimento (LGPD)
          </DialogTitle>
          <DialogDescription>
            Solicite a exclusão dos seus dados de cookies e navegação de acordo com a Lei Geral de Proteção de Dados.
          </DialogDescription>
        </DialogHeader>

        {isLockedOut ? (
          <div className="py-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-destructive/10">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">Bloqueado temporariamente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Muitas tentativas incorretas. Tente novamente em:
              </p>
              <p className="text-2xl font-mono font-bold mt-2">{formatLockoutTime(remainingLockoutTime)}</p>
            </div>
            <Button variant="outline" onClick={handleClose} className="mt-4">
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Seu ID de Sessão</Label>
              <Input
                id="sessionId"
                placeholder="Digite seu ID de sessão"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                disabled={isLoading}
                className="font-mono text-sm"
              />
              {sessionId === currentSessionId && currentSessionId && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ ID da sua sessão atual identificado automaticamente
                </p>
              )}
            </div>

            {/* Simple Math Captcha */}
            <div className="space-y-2">
              <Label htmlFor="captcha">
                Verificação de Segurança
                {failedAttempts > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({failedAttempts}/{MAX_CAPTCHA_ATTEMPTS} tentativas)
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <div className="px-3 py-2 bg-muted rounded-md font-mono text-sm font-medium select-none">
                    {captcha.question}
                  </div>
                  <Input
                    id="captcha"
                    type="text"
                    inputMode="numeric"
                    placeholder="Resposta"
                    value={captchaAnswer}
                    onChange={(e) => {
                      setCaptchaAnswer(e.target.value);
                      setCaptchaError(false);
                    }}
                    disabled={isLoading}
                    className={`w-24 text-center ${captchaError ? "border-destructive" : ""} ${isCaptchaValid ? "border-green-500" : ""}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={refreshCaptcha}
                  disabled={isLoading}
                  title="Gerar nova conta"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {captchaError && (
                <p className="text-xs text-destructive">Resposta incorreta. Tente novamente.</p>
              )}
              {isCaptchaValid && (
                <p className="text-xs text-green-600 dark:text-green-400">✓ Verificação correta</p>
              )}
            </div>

            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                Esta ação é irreversível. Todos os registros de consentimento e navegação associados a este ID serão permanentemente deletados.
              </AlertDescription>
            </Alert>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1"
                disabled={isLoading || (!sessionId && !currentSessionId) || !isCaptchaValid}
              >
                {isLoading ? (
                  "Processando..."
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Deletar Meus Dados
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {!isLockedOut && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Seu ID de sessão é gerado automaticamente quando você interage com nossos cookies.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
