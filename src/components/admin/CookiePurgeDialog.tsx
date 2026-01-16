import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2, Mail, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "initial" | "code-sent" | "verify" | "success";

export default function CookiePurgeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("initial");
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);

  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const response = await supabase.functions.invoke("send-cookie-purge-code", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao enviar código");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setTotalRecords(response.data.total_records || 0);
      setStep("code-sent");
      toast.success("Código enviado para desenvolvedor@webq.com.br");
    } catch (error: any) {
      console.error("Error sending code:", error);
      toast.error(error.message || "Erro ao enviar código de verificação");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const response = await supabase.functions.invoke("verify-cookie-purge-code", {
        body: { code },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao verificar código");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setDeletedCount(response.data.deleted_count || 0);
      setStep("success");
      toast.success(`${response.data.deleted_count || 0} registros excluídos com sucesso`);
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || "Erro ao verificar código");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after dialog animation
    setTimeout(() => {
      setStep("initial");
      setCode("");
      setTotalRecords(0);
      setDeletedCount(0);
    }, 200);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Limpar Registros de Cookies
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        {step === "initial" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Excluir Todos os Registros
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Esta ação irá excluir <strong>permanentemente</strong> todos os registros 
                  de consentimento de cookies do banco de dados.
                </p>
                <p>
                  Para continuar, um código de verificação será enviado para{" "}
                  <strong>desenvolvedor@webq.com.br</strong>.
                </p>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <strong>⚠️ Atenção:</strong> Esta ação não pode ser desfeita. 
                  Todos os dados de auditoria LGPD serão perdidos.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
              <Button 
                onClick={handleSendCode} 
                disabled={isLoading}
                variant="destructive"
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Enviar Código
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === "code-sent" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Código Enviado
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Um código de verificação foi enviado para{" "}
                  <strong>desenvolvedor@webq.com.br</strong>.
                </p>
                <p className="text-muted-foreground">
                  {totalRecords > 0 ? (
                    <>Esta ação irá excluir <strong className="text-destructive">{totalRecords.toLocaleString('pt-BR')}</strong> registros.</>
                  ) : (
                    <>Não há registros para excluir.</>
                  )}
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4 space-y-3">
              <Label htmlFor="verification-code">Digite o código de 6 dígitos:</Label>
              <Input
                id="verification-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                O código expira em 10 minutos
              </p>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
              <Button 
                onClick={handleVerifyCode} 
                disabled={isLoading || code.length !== 6}
                variant="destructive"
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Confirmar Exclusão
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Exclusão Concluída
              </AlertDialogTitle>
              <AlertDialogDescription>
                <p>
                  <strong>{deletedCount.toLocaleString('pt-BR')}</strong> registros de 
                  consentimento de cookies foram excluídos permanentemente.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleClose}>Fechar</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
