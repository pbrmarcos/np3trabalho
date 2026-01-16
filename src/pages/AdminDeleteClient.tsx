import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Trash2, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEVELOPER_EMAIL = "desenvolvedor@webq.com.br";

export default function AdminDeleteClient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get("client");

  // Persist state in sessionStorage to survive tab switches
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return sessionStorage.getItem("delete_client_id") || preselectedClientId || "";
  });
  const [verificationCode, setVerificationCode] = useState(() => {
    return sessionStorage.getItem("delete_verification_code") || "";
  });
  const [codeSent, setCodeSent] = useState(() => {
    return sessionStorage.getItem("delete_code_sent") === "true";
  });
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Persist state changes to sessionStorage
  useEffect(() => {
    if (selectedClientId) {
      sessionStorage.setItem("delete_client_id", selectedClientId);
    }
  }, [selectedClientId]);

  useEffect(() => {
    sessionStorage.setItem("delete_verification_code", verificationCode);
  }, [verificationCode]);

  useEffect(() => {
    sessionStorage.setItem("delete_code_sent", codeSent.toString());
  }, [codeSent]);

  const isDeveloper = user?.email === DEVELOPER_EMAIL;

  // Fetch all clients for selection
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["all-clients-for-deletion"],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from("client_projects")
        .select("client_id, name")
        .order("name");

      if (error) throw error;

      // Get unique clients with their project names
      const uniqueClients = projects?.reduce((acc, project) => {
        if (!acc.find(c => c.client_id === project.client_id)) {
          acc.push({ client_id: project.client_id, name: project.name });
        }
        return acc;
      }, [] as { client_id: string; name: string }[]);

      return uniqueClients || [];
    },
    enabled: isDeveloper,
  });

  // Get selected client details
  const selectedClient = clients?.find(c => c.client_id === selectedClientId);

  useEffect(() => {
    if (preselectedClientId && !selectedClientId) {
      setSelectedClientId(preselectedClientId);
    }
  }, [preselectedClientId, selectedClientId]);

  // Redirect if not developer
  useEffect(() => {
    if (user && !isDeveloper) {
      toast.error("Acesso não autorizado");
      navigate("/admin");
    }
  }, [user, isDeveloper, navigate]);

  const handleSendDeletionCode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedClientId) {
      toast.error("Selecione um cliente primeiro");
      return;
    }

    setIsSendingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsSendingCode(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-deletion-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            client_id: selectedClientId,
            client_name: selectedClient?.name || "Cliente"
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar código");
      }

      setCodeSent(true);
      toast.success("Código enviado para seu email!");
    } catch (error: any) {
      console.error("Error sending deletion code:", error);
      toast.error(error.message || "Erro ao enviar código");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleDeleteClient = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedClientId || verificationCode.length !== 6) return;

    setIsDeleting(true);
    try {
      // Use refreshSession here to ensure we have a valid token for deletion
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !session) {
        console.error("Session refresh error:", refreshError);
        toast.error("Sessão expirada. Faça login novamente.");
        setIsDeleting(false);
        return;
      }
      
      console.log("Deleting with user:", session.user?.email);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-client-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            client_id: selectedClientId,
            verification_code: verificationCode
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir cliente");
      }

      toast.success("Cliente excluído com sucesso!");
      clearDeletionState();
      navigate("/admin/clients");
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(error.message || "Erro ao excluir cliente");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCodeSent(false);
    setVerificationCode("");
    // Clear sessionStorage
    sessionStorage.removeItem("delete_code_sent");
    sessionStorage.removeItem("delete_verification_code");
  };

  // Clear sessionStorage after successful deletion
  const clearDeletionState = () => {
    sessionStorage.removeItem("delete_client_id");
    sessionStorage.removeItem("delete_code_sent");
    sessionStorage.removeItem("delete_verification_code");
  };

  if (!isDeveloper) {
    return null;
  }

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Excluir Cliente" }
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Excluir Cliente
            </h1>
            <p className="text-muted-foreground">
              Exclusão permanente de cliente e todos os dados associados
            </p>
          </div>
        </div>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription className="text-destructive/80">
              Esta ação é IRREVERSÍVEL. Todos os dados serão permanentemente excluídos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Select Client */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">1. Selecione o Cliente</Label>
              <Select 
                value={selectedClientId} 
                onValueChange={(value) => {
                  setSelectedClientId(value);
                  handleReset();
                }}
                disabled={codeSent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClients ? (
                    <div className="p-2 text-center text-muted-foreground">Carregando...</div>
                  ) : (
                    clients?.map((client) => (
                      <SelectItem key={client.client_id} value={client.client_id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedClientId && (
              <>
                {/* Data to be deleted */}
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <p className="font-medium text-destructive mb-2">Dados que serão excluídos:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Dados de onboarding</li>
                    <li>Projetos e configurações</li>
                    <li>Credenciais (logins/senhas)</li>
                    <li>Arquivos enviados</li>
                    <li>Tickets e mensagens</li>
                    <li>Notificações</li>
                    <li>Perfil e conta do usuário</li>
                  </ul>
                </div>

                {/* Step 2: Send Code OR Show Code Sent */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">2. Solicitar Código de Verificação</Label>
                  
                  {!codeSent ? (
                    <Button
                      type="button"
                      onClick={handleSendDeletionCode}
                      disabled={isSendingCode || !selectedClientId}
                      variant="outline"
                      className="w-full"
                    >
                      {isSendingCode ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar Código para {DEVELOPER_EMAIL}
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 p-4 rounded-lg flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Código enviado!</p>
                        <p className="text-sm opacity-80">Verifique seu email: {DEVELOPER_EMAIL}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Enter Code - Only visible after code is sent */}
                {codeSent && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">3. Digite o Código de Verificação</Label>
                    <Input
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="text-center text-2xl tracking-widest font-mono h-14"
                      maxLength={6}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Digite o código de 6 dígitos enviado para seu email
                    </p>
                  </div>
                )}

                {/* Step 4: Confirm Deletion - Only visible after code is sent */}
                {codeSent && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteClient}
                      disabled={isDeleting || verificationCode.length !== 6}
                      className="flex-1"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Confirmar Exclusão
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayoutWithSidebar>
  );
}
