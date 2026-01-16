import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect to appropriate login page
    const loginPath = requiredRole === "admin" ? "/admin" : "/cliente";
    return <Navigate to={loginPath} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // User doesn't have the required role
    if (requiredRole === "admin" && role !== "admin") {
      return <Navigate to="/cliente" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
