import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useFavicon } from "@/hooks/useFavicon";
import ErrorBoundary from "@/components/ErrorBoundary";
import PublicLayout from "@/components/PublicLayout";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Index from "./pages/Index";
import Plans from "./pages/Plans";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import ClientLogin from "./pages/ClientLogin";
import AdminLogin from "./pages/AdminLogin";
import ClientDashboard from "./pages/ClientDashboard";
import ClientAccount from "./pages/ClientAccount";
import ClientEditProject from "./pages/ClientEditProject";
import ClientProjectEmails from "./pages/ClientProjectEmails";
import ClientProjectFiles from "./pages/ClientProjectFiles";
import ClientProjectSettings from "./pages/ClientProjectSettings";
import ClientProjectTickets from "./pages/ClientProjectTickets";
import ClientSubscription from "./pages/ClientSubscription";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";
import AdminClients from "./pages/AdminClients";
import AdminBlog from "./pages/AdminBlog";
import AdminPages from "./pages/AdminPages";
import AdminTickets from "./pages/AdminTickets";
import AdminEmails from "./pages/AdminEmails";
import AdminProjectDetails from "./pages/AdminProjectDetails";
import AdminCreateProject from "./pages/AdminCreateProject";
import AdminMedia from "./pages/AdminMedia";
import AdminBrandGuidelines from "./pages/AdminBrandGuidelines";
import AdminAccount from "./pages/AdminAccount";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import OnboardingPage from "./pages/OnboardingPage";
import ClientOnboarding from "./pages/ClientOnboarding";
import Help from "./pages/Help";
import HelpCategory from "./pages/HelpCategory";
import HelpArticle from "./pages/HelpArticle";
import AdminHelp from "./pages/AdminHelp";
import AdminSEO from "./pages/AdminSEO";
import AdminDesignOrders from "./pages/AdminDesignOrders";
import AdminDesignOrderDetails from "./pages/AdminDesignOrderDetails";
import AdminFinanceiro from "./pages/AdminFinanceiro";
import AdminCoupons from "./pages/AdminCoupons";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import IsolatedPage from "./pages/IsolatedPage";
import ClientDesignOrders from "./pages/ClientDesignOrders";

import ClientDesignOrderDetails from "./pages/ClientDesignOrderDetails";
import ClientTimelinePage from "./pages/ClientTimelinePage";
import AdminDeleteClient from "./pages/AdminDeleteClient";
import AdminLogs from "./pages/AdminLogs";
import AdminMigrations from "./pages/AdminMigrations";
import DesignCatalog from "./pages/DesignCatalog";
import DesignCheckout from "./pages/DesignCheckout";
import DesignBriefing from "./pages/DesignBriefing";
import SignupPage from "./pages/SignupPage";
import MigrationPage from "./pages/MigrationPage";
import MigrationCheckout from "./pages/MigrationCheckout";
import MigrationTracking from "./pages/MigrationTracking";
import ClientMigrationTracking from "./pages/ClientMigrationTracking";
import ClientPaymentHistory from "./pages/ClientPaymentHistory";
import SitemapXml from "./pages/SitemapXml";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Legacy redirect component for old plan URLs
function LegacyPlanRedirect() {
  const { planId } = useParams();
  return <Navigate to={`/planos/checkout?plan=${planId}`} replace />;
}

// Component to apply favicon from settings
function FaviconApplier() {
  useFavicon();
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <AuthProvider>
          <TooltipProvider>
            <FaviconApplier />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Public routes with layout */}
              <Route
                path="/"
                element={
                  <PublicLayout>
                    <Index />
                  </PublicLayout>
                }
              />
              <Route
                path="/planos"
                element={
                  <PublicLayout>
                    <Plans />
                  </PublicLayout>
                }
              />
              <Route
                path="/blog"
                element={
                  <PublicLayout>
                    <Blog />
                  </PublicLayout>
                }
              />
              <Route
                path="/ajuda"
                element={
                  <PublicLayout>
                    <Help />
                  </PublicLayout>
                }
              />
              <Route
                path="/ajuda/:categorySlug"
                element={
                  <PublicLayout>
                    <HelpCategory />
                  </PublicLayout>
                }
              />
              <Route
                path="/ajuda/:categorySlug/:articleSlug"
                element={
                  <PublicLayout>
                    <HelpArticle />
                  </PublicLayout>
                }
              />
              <Route
                path="/blog/:slug"
                element={
                  <PublicLayout>
                    <BlogPost />
                  </PublicLayout>
                }
              />
              <Route
                path="/design"
                element={
                  <PublicLayout>
                    <DesignCatalog />
                  </PublicLayout>
                }
              />
              <Route path="/migracao" element={<MigrationPage />} />
              <Route path="/migracao/checkout" element={<MigrationCheckout />} />
              <Route path="/migracao/acompanhar" element={<MigrationTracking />} />
              <Route path="/design/checkout" element={<DesignCheckout />} />
              <Route path="/planos/checkout" element={<OnboardingPage />} />
              <Route
                path="/politica-privacidade"
                element={
                  <PublicLayout>
                    <PrivacyPolicyPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/termos"
                element={
                  <PublicLayout>
                    <TermsPage />
                  </PublicLayout>
                }
              />
              <Route path="/sitemap.xml" element={<SitemapXml />} />

              {/* Auth routes - no public layout */}
              <Route path="/cliente" element={<ClientLogin />} />
              <Route path="/cadastro" element={<SignupPage />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/recuperar-senha" element={<ForgotPassword />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              
              {/* Payment feedback routes */}
              <Route path="/pagamento/sucesso" element={<PaymentSuccess />} />
              <Route path="/pagamento/cancelado" element={<PaymentCancelled />} />
              
              {/* Legacy route redirects (301) */}
              <Route path="/assinar/:planId" element={<LegacyPlanRedirect />} />
              <Route path="/cliente/design/novo" element={<Navigate to="/design/checkout" replace />} />
              
              {/* Post-payment onboarding */}
              <Route
                path="/cliente/onboarding"
                element={
                  <ProtectedRoute>
                    <ClientOnboarding />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected client routes */}
              <Route
                path="/cliente/dashboard"
                element={
                  <ProtectedRoute>
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/conta"
                element={
                  <ProtectedRoute>
                    <ClientAccount />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/projeto/editar"
                element={
                  <ProtectedRoute>
                    <ClientEditProject />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/projeto/:projectId/emails"
                element={
                  <ProtectedRoute>
                    <ClientProjectEmails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/projeto/:projectId/arquivos"
                element={
                  <ProtectedRoute>
                    <ClientProjectFiles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/projeto/:projectId/configuracoes"
                element={
                  <ProtectedRoute>
                    <ClientProjectSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/projeto/:projectId/tickets"
                element={
                  <ProtectedRoute>
                    <ClientProjectTickets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/assinatura"
                element={
                  <ProtectedRoute>
                    <ClientSubscription />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/design"
                element={
                  <ProtectedRoute>
                    <ClientDesignOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/design/:orderId"
                element={
                  <ProtectedRoute>
                    <ClientDesignOrderDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/design/briefing"
                element={
                  <ProtectedRoute>
                    <DesignBriefing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/timeline"
                element={
                  <ProtectedRoute>
                    <ClientTimelinePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/migracao"
                element={
                  <ProtectedRoute>
                    <ClientMigrationTracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/pagamentos"
                element={
                  <ProtectedRoute>
                    <ClientPaymentHistory />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected admin routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/clients"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminClients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/blog"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminBlog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/paginas"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminPages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tickets"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminTickets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/emails"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminEmails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/media"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminMedia />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/brand-guidelines"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminBrandGuidelines />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/projects/:projectId"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminProjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/create-project/:onboardingId"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminCreateProject />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/account"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminAccount />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ajuda"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminHelp />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/seo"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminSEO />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/design"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDesignOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/design/:orderId"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDesignOrderDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/financeiro"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminFinanceiro />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/delete-client"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDeleteClient />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/migrations"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminMigrations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cupons"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminCoupons />
                  </ProtectedRoute>
                }
              />

              {/* Isolated pages at root level - must be after all specific routes */}
              <Route
                path="/:slug"
                element={
                  <PublicLayout>
                    <IsolatedPage />
                  </PublicLayout>
                }
              />

              {/* Catch-all */}
              <Route
                path="*"
                element={
                  <PublicLayout>
                    <NotFound />
                  </PublicLayout>
                }
              />
            </Routes>
            <CookieConsentBanner />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;