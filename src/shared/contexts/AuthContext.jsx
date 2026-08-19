import { createContext, useEffect, useState } from "react";

import {
  fetchCurrentUserApi,
  forgotPasswordApi,
  refreshSessionApi,
  signInApi,
  signUpApi,
} from "../../features/auth/api/authApi";

const SESSION_STORAGE_KEY = "forge_auth_session";
const CAN_USE_DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_BYPASS === "true";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(payload) {
  if (!payload) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

async function hydrateFromSession(setSession, setUser, setLoading, stored) {
  const accessToken = stored?.session?.access_token;
  if (!accessToken) {
    clearStoredSession();
    setSession(null);
    setUser(null);
    setLoading(false);
    return;
  }

  try {
    const me = await fetchCurrentUserApi(accessToken);
    setSession(stored.session);
    setUser(me.user);
    setLoading(false);
    return;
  } catch {
    clearStoredSession();
    setSession(null);
    setUser(null);
    setLoading(false);
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredSession();
    hydrateFromSession(setSession, setUser, setLoading, stored);

    const onStorage = (event) => {
      if (event.key === SESSION_STORAGE_KEY) {
        const next = event.newValue ? JSON.parse(event.newValue) : null;
        if (!next) {
          setSession(null);
          setUser(null);
          return;
        }
        hydrateFromSession(setSession, setUser, () => {}, next);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = async (email, password) => {
    const res = await signInApi(email, password);
    const nextSession = res.session || null;
    let nextUser = res.user || null;

    if (nextSession?.access_token) {
      try {
        const me = await fetchCurrentUserApi(nextSession.access_token);
        nextUser = me.user;
      } catch {
        // keep the auth user if profile fetch fails
      }
    }

    const nextState = { session: nextSession, user: nextUser };
    writeStoredSession(nextState);
    setSession(nextSession);
    setUser(nextUser);
    return nextState;
  };

  const signUp = async ({ fullName, email, department, vertical, password }) => {
    const res = await signUpApi({ fullName, email, department, vertical, password });
    const nextSession = res.session || null;
    let nextUser = res.user || null;

    if (nextSession?.access_token) {
      try {
        const me = await fetchCurrentUserApi(nextSession.access_token);
        nextUser = me.user;
      } catch {
        // keep the auth user if profile fetch fails
      }
    }

    const nextState = { session: nextSession, user: nextUser };
    if (nextSession) {
      writeStoredSession(nextState);
      setSession(nextSession);
      setUser(nextUser);
    }
    return { ...res, nextState };
  };

  const signOut = async () => {
    clearStoredSession();
    setSession(null);
    setUser(null);
  };

  const requestPasswordReset = async (email) => {
    return forgotPasswordApi(email);
  };

  const bypassAuth = () => {
    if (!CAN_USE_DEV_BYPASS) {
      throw new Error("Dev bypass authentication is disabled.");
    }

    const testUserId = import.meta.env.VITE_TEST_USER_ID;
    if (!testUserId) {
      throw new Error("Dev bypass authentication is not configured.");
    }

    const nextSession = { access_token: "dev-bypass-token" };
    const nextUser = {
      id: testUserId,
      email: "forge-test-user@pvinsight.local",
      full_name: "Developer Bypass",
      role: "Electrical Design Engineer",
      department: "Electrical",
      vertical: "PV",
      organization_id: "default-org-id",
    };
    const nextState = { session: nextSession, user: nextUser };
    writeStoredSession(nextState);
    setSession(nextSession);
    setUser(nextUser);
    return nextState;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        setSession,
        bypassAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
