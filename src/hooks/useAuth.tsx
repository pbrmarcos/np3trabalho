import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  isLoginLocked, 
  recordLoginAttempt, 
  formatLockoutTime,
  getLoginRateLimitData 
} from "@/lib/rateLimiter";

type AppRole = "admin" | "client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  loginLockStatus: { locked: boolean; remainingMs: number };
  checkLoginLock: () => { locked: boolean; remainingMs: number };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginLockStatus, setLoginLockStatus] = useState<{ locked: boolean; remainingMs: number }>({ locked: false, remainingMs: 0 });
  const { toast } = useToast();
  
  // Ref to track current role - avoids stale closure issues in onAuthStateChange
  const roleRef = useRef<AppRole | null>(null);

  // Check login lock status periodically
  useEffect(() => {
    const checkLock = () => {
      const status = isLoginLocked();
      setLoginLockStatus(status);
    };
    
    checkLock();
    const interval = setInterval(checkLock, 1000); // Update every second when locked
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetch to avoid deadlock
        if (session?.user) {
          // Use roleRef.current to check if we already have a role
          // This avoids stale closure issues since refs always have current value
          if (roleRef.current === null) {
            setIsLoading(true);
          }
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          roleRef.current = null;
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Fetch all roles for the user and prioritize 'admin' over 'client'
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("[Auth] Error fetching role:", error);
        roleRef.current = "client";
        setRole("client");
      } else if (data && data.length > 0) {
        const hasAdmin = data.some((r) => r.role === "admin");
        const newRole: AppRole = hasAdmin ? "admin" : "client";
        roleRef.current = newRole;
        setRole(newRole);
      } else {
        roleRef.current = "client";
        setRole("client");
      }
    } catch (err) {
      console.error("[Auth] Error fetching role:", err);
      roleRef.current = "client";
      setRole("client");
    } finally {
      setIsLoading(false);
    }
  };

  const checkLoginLock = () => {
    return isLoginLocked();
  };

  const signIn = async (email: string, password: string) => {
    // Check rate limit before attempting login
    const lockStatus = isLoginLocked();
    if (lockStatus.locked) {
      const remainingTime = formatLockoutTime(lockStatus.remainingMs);
      console.warn("[Auth] Login blocked due to rate limiting");
      return { 
        error: new Error(`Muitas tentativas de login. Tente novamente em ${remainingTime}.`) 
      };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Record failed attempt
        const result = recordLoginAttempt(false);
        setLoginLockStatus(isLoginLocked());
        
        if (result.locked) {
          return { 
            error: new Error(`Muitas tentativas de login. Sua conta está bloqueada por ${result.lockoutMinutes} minutos.`) 
          };
        }
        
        // Add remaining attempts info to error
        if (result.remainingAttempts <= 2) {
          console.warn(`[Auth] ${result.remainingAttempts} tentativas restantes`);
        }
        
        return { error };
      }
      
      // Record successful login (resets counter)
      recordLoginAttempt(true);
      setLoginLockStatus({ locked: false, remainingMs: 0 });
      
      return { error: null };
    } catch (error) {
      recordLoginAttempt(false);
      setLoginLockStatus(isLoginLocked());
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        isAdmin: role === "admin",
        loginLockStatus,
        checkLoginLock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
