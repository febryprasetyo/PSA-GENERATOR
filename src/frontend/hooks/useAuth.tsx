"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { appRoutes } from "@/frontend/lib/routes";

interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (u: string, p: string, redirectUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchWithTimeout = (url: string, options: any = {}, timeoutMs = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error("Koneksi timeout. Coba lagi.")), timeoutMs)
    )
  ]);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Fix TV stuck loading
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkSession();
  }, [pathname]);

  const checkSession = async () => {
    try {
      const res = await fetchWithTimeout("/api/auth/me");
      const publicRoutes = [appRoutes.login, "/viewer/login"];
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (pathname === appRoutes.login || pathname === "/viewer/login") {
          const redirectTo = pathname === "/viewer/login" ? appRoutes.viewer : appRoutes.home;
          router.push(redirectTo);
        }
      } else {
        setUser(null);
        if (pathname === appRoutes.viewer) {
          router.push("/viewer/login");
        } else if (!publicRoutes.includes(pathname)) {
          router.push(appRoutes.login);
        }
      }
    } catch (error) {
      setUser(null);
    }
  };

  const login = async (username: string, password: string, redirectUrl: string = appRoutes.home) => {
    setIsLoading(true);
    try {
      const res = await fetchWithTimeout("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk");
      }

      setUser(data.user);
      setIsLoading(false);
      
      // Delay navigation slightly to ensure state is committed before transition starts
      setTimeout(() => {
        router.push(redirectUrl);
      }, 50);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push(appRoutes.login);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
