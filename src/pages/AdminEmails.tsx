import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import { EmailLogsPage } from "@/components/admin/emails";
import { NotificationQueueMonitor } from "@/components/admin/NotificationQueueMonitor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, ListTodo } from "lucide-react";

const AdminEmails = () => {
  const breadcrumbs = [
    { label: "Admin", href: "/admin/dashboard" },
    { label: "Emails" }
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Emails</h1>
          <p className="text-muted-foreground">
            Monitore a fila de notificações e visualize o histórico de emails
          </p>
        </div>

        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Fila de Notificações
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Envios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <NotificationQueueMonitor />
          </TabsContent>

          <TabsContent value="logs">
            <EmailLogsPage />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayoutWithSidebar>
  );
};

export default AdminEmails;
