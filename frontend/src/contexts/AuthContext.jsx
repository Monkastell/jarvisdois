// AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { watchAuth, logoutUser } from "../services/firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Iniciando watchAuth");
    const unsubscribe = watchAuth((firebaseUser) => {
      console.log("AuthProvider: Estado do auth mudou:", firebaseUser?.email || "null");
      setUser(firebaseUser || null);
      setLoading(false);
    });

    return () => {
      console.log("AuthProvider: Limpando watchAuth");
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      logout,
    }),
    [user, loading]
  );

  console.log("AuthProvider: Renderizando com user:", user?.email || "null", "loading:", loading);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}