import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Eye, EyeOff, Copy, ExternalLink, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import ClientLayout from "@/components/ClientLayout";
import { decryptValue } from "@/lib/crypto";

const ITEMS_PER_PAGE = 6;

export default function ClientProjectEmails() {
  const { projectId } = useParams<{ projectId: string }>();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ["client-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: credentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ["project-credentials", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_credentials")
        .select("*")
        .eq("project_id", projectId)
        .eq("credential_type", "email")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
  
  // Decrypt passwords when credentials load
  useEffect(() => {
    const decryptPasswords = async () => {
      if (credentials) {
        const decrypted: Record<string, string> = {};
        for (const cred of credentials) {
          if (cred.password) {
            try {
              const decryptedPwd = await decryptValue(cred.password);
              decrypted[cred.id] = decryptedPwd || cred.password;
            } catch {
              decrypted[cred.id] = cred.password;
            }
          }
        }
        setDecryptedPasswords(decrypted);
      }
    };
    decryptPasswords();
  }, [credentials]);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/cliente/dashboard" },
    { label: project?.name || "Projeto", href: `/cliente/dashboard` },
    { label: "E-mails" }
  ];

  // Pagination logic
  const totalItems = credentials?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCredentials = credentials?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (isLoadingProject || isLoadingCredentials) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </ClientLayout>
    );
  }

  if (!project) {
    return (
      <ClientLayout breadcrumbs={breadcrumbs}>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Projeto não encontrado.</p>
            <Button asChild className="mt-4">
              <Link to="/cliente/dashboard">Voltar ao Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout breadcrumbs={breadcrumbs} title={`E-mails - ${project.name}`}>
      {/* Bloco descritivo */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Central de E-mails do Projeto
        </h3>
        <p className="text-sm text-muted-foreground">
          Aqui estão as <strong className="text-foreground">contas de e-mail profissionais</strong> configuradas 
          para o seu projeto. Você pode copiar as credenciais clicando nos ícones ao lado de cada campo 
          e acessar o webmail diretamente pelo botão "Acessar Webmail".
        </p>
      </div>

      {credentials && credentials.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedCredentials?.map((credential) => (
              <Card key={credential.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{credential.label}</CardTitle>
                      <CardDescription>{credential.username}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <p className="font-mono text-sm">{credential.username}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(credential.username || "", "Email")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {(credential.password || decryptedPasswords[credential.id]) && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Senha</p>
                        <p className="font-mono text-sm">
                          {visiblePasswords[credential.id]
                            ? decryptedPasswords[credential.id] || credential.password
                            : "••••••••••"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePasswordVisibility(credential.id)}
                        >
                          {visiblePasswords[credential.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(decryptedPasswords[credential.id] || credential.password || "", "Senha")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {credential.url && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={credential.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Acessar Webmail
                      </a>
                    </Button>
                  )}

                  {credential.notes && (
                    <p className="text-sm text-muted-foreground">{credential.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma conta de email configurada
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              As credenciais de email do seu projeto aparecerão aqui assim que forem
              configuradas pela equipe WebQ.
            </p>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  );
}