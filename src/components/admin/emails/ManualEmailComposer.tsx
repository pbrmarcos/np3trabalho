import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Eye, Code, Loader2, Info, Users } from "lucide-react";
import DOMPurify from "dompurify";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  sender_email: string;
  sender_name: string;
}

interface ManualEmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EmailTemplate[];
}

const SENDER_OPTIONS = [
  { email: "noreply@webq.com.br", name: "WebQ Sistema" },
  { email: "suporte@webq.com.br", name: "WebQ Suporte" },
  { email: "contato@webq.com.br", name: "WebQ Contato" },
];

export default function ManualEmailComposer({
  open,
  onOpenChange,
  templates,
}: ManualEmailComposerProps) {
  const [recipient, setRecipient] = useState("");
  const [senderEmail, setSenderEmail] = useState(SENDER_OPTIONS[0].email);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState("compose");
  const [useUserId, setUseUserId] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{id: string, email: string, name?: string}[]>([]);

  const selectedSender = SENDER_OPTIONS.find((s) => s.email === senderEmail);

  // Fetch available users for user_id resolution testing
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .limit(20);
      
      if (profiles) {
        // Get emails from auth (we'll display user_id with name)
        setAvailableUsers(profiles.map(p => ({
          id: p.user_id,
          email: p.user_id, // Will be resolved by edge function
          name: p.full_name || 'Sem nome'
        })));
      }
    };
    if (open) fetchUsers();
  }, [open]);

  const handleSend = async () => {
    if (!recipient || !subject || !htmlBody) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const recipients = recipient.split(",").map((e) => e.trim());
    
    // If not using user_id mode, validate email format
    if (!useUserId) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = recipients.filter((e) => !emailRegex.test(e));
      if (invalidEmails.length > 0) {
        toast.error(`Emails inválidos: ${invalidEmails.join(", ")}`);
        return;
      }
    } else {
      // Validate UUID format for user_ids
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidIds = recipients.filter((e) => !uuidRegex.test(e));
      if (invalidIds.length > 0) {
        toast.error(`IDs inválidos: ${invalidIds.join(", ")}`);
        return;
      }
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: recipients,
          manual_content: {
            subject,
            html_body: htmlBody,
          },
        },
      });

      if (error) throw error;

      if (useUserId) {
        toast.success("Email enviado! User IDs foram resolvidos para emails automaticamente.");
      } else {
        toast.success("Email enviado com sucesso!");
      }
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Erro ao enviar email: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setRecipient("");
    setSubject("");
    setHtmlBody("");
    setSenderEmail(SENDER_OPTIONS[0].email);
    setActiveTab("compose");
    setUseUserId(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Email Manual
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose" className="gap-2">
              <Code className="h-4 w-4" />
              Compor
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="flex-1 overflow-auto space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                O rodapé padrão do sistema será adicionado automaticamente ao email.
              </AlertDescription>
            </Alert>

            {/* User ID Testing Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="use-user-id" className="text-sm font-medium">Modo de Teste: User ID</Label>
                  <p className="text-xs text-muted-foreground">
                    Enviar usando User IDs para testar resolução automática de emails
                  </p>
                </div>
              </div>
              <Switch
                id="use-user-id"
                checked={useUserId}
                onCheckedChange={setUseUserId}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">{useUserId ? "User ID(s) *" : "Destinatário(s) *"}</Label>
                {useUserId ? (
                  <>
                    <Select onValueChange={(value) => setRecipient(prev => prev ? `${prev}, ${value}` : value)}>
                      <SelectTrigger aria-label="Selecionar usuário">
                        <SelectValue placeholder="Selecionar usuário..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.id.substring(0, 8)}...)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="recipient"
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="uuid-do-usuario-1, uuid-do-usuario-2"
                      aria-label="User IDs"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Selecione usuários ou cole UUIDs separados por vírgula
                    </p>
                  </>
                ) : (
                  <>
                    <Input
                      id="recipient"
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="email@exemplo.com, outro@exemplo.com"
                      aria-label="Email do destinatário"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separe múltiplos emails com vírgula
                    </p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender">Remetente</Label>
                <Select value={senderEmail} onValueChange={setSenderEmail}>
                  <SelectTrigger id="sender" aria-label="Selecionar remetente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENDER_OPTIONS.map((sender) => (
                      <SelectItem key={sender.email} value={sender.email}>
                        {sender.name} &lt;{sender.email}&gt;
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="html-body">Corpo do Email (HTML) *</Label>
              <Textarea
                id="html-body"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                className="font-mono text-sm min-h-[250px]"
                placeholder="<p>Seu conteúdo HTML aqui...</p>"
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            <div className="border rounded-lg p-4 bg-white">
              <div className="mb-4 pb-4 border-b space-y-1">
                <p className="text-sm text-muted-foreground">
                  <strong>De:</strong> {selectedSender?.name} &lt;{selectedSender?.email}&gt;
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Para:</strong> {recipient || "(destinatário não informado)"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Assunto:</strong> {subject || "(assunto não informado)"}
                </p>
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(htmlBody || "<p class='text-muted-foreground'>(corpo vazio)</p>"),
                }}
              />
              <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
                <p>WebQ - Sites Profissionais</p>
                <p>suporte@webq.com.br</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
