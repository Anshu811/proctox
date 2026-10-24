import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

// Where a user lands after logging in or registering
export const homePathFor = (user) => (user?.role === "teacher" ? "/teacher" : "/student");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page refresh, restore the user from the saved token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const d = await api("/auth/login", { method: "POST", body: { email, password } });
    localStorage.setItem("token", d.token);
    setUser(d.user);
    return d.user;
  };

  const register = async (form) => {
    const d = await api("/auth/register", { method: "POST", body: form });
    localStorage.setItem("token", d.token);
    setUser(d.user);
    return d.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);