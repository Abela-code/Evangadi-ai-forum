import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginUser, registerUser } from "../api/auth.api";
import { SESSION_EXPIRED_EVENT } from "../api/axios";

/**
 * Central session state for the application.
 *
 * This context keeps the authenticated user, loading status, and session expiry
 * state in one place so routes and pages can reliably check access without
 * duplicating token storage logic across the app.
 */
const AuthContext = createContext(null);

/**
 * Remove the current browser session so the app behaves as if the user has
 * signed out, even if the token or user snapshot is still present in storage.
 */
function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function readStoredUser() {
  try {
    // Storage can contain stale or manually edited JSON; a bad snapshot should
    // make the user unauthenticated rather than prevent the app from loading.
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

// JWT segments are base64url: "-" and "_" stand in for "+" and "/", and atob
// rejects both. Convert back before decoding, or a valid token reads as expired.
function decodeTokenPayload(token) {
  const segment = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = segment.padEnd(Math.ceil(segment.length / 4) * 4, "=");

  // atob yields one character per byte, so a name like "Zoë" would come back
  // mangled. Read the bytes as UTF-8 instead.
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes));
}

function isTokenExpired(token) {
  if (!token) return true;

  try {
    const payload = decodeTokenPayload(token);
    // Some valid tokens do not include exp, so only reject tokens whose
    // expiration claim is present and has actually passed.
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    // A malformed token is not usable for authenticated requests.
    return true;
  }
}

/**
 * Provides the authenticated user session to the entire application.
 *
 * The provider reads the saved token and user data from localStorage, validates
 * the token, and exposes login/logout helpers plus current auth state to all
 * children components.
 */
export function AuthProvider({ children }) {
  // Read the stored token once when the provider mounts so the app can decide
  // whether the user should be treated as authenticated on refresh.
  const storedToken = localStorage.getItem("token");
  const [user, setUser] = useState(
    !isTokenExpired(storedToken) ? readStoredUser() : null,
  );
  const [loading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const isAuthenticated = Boolean(
    user && storedToken && !isTokenExpired(storedToken),
  );

  async function login(credentials) {
    const data = await loginUser(credentials);

    // Persist the token separately from the user snapshot because API clients
    // use the token for requests while the UI uses the snapshot for display.
    if (data?.token) {
      localStorage.setItem("token", data.token);
    }

    // Keep the previous auth state if the API response contains no user. This
    // also lets the caller handle unusual but successful response shapes.
    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setSessionExpired(false);
    }

    return data;
  }

  async function register(payload) {
    return registerUser(payload);
  }

  function logout() {
    clearStoredSession();
    setUser(null);
  }

  // The axios interceptor already cleared storage, but only React can clear
  // React. Without this the guard keeps rendering a page whose session is gone.
  // The handler does the work itself rather than calling logout(), so the
  // listener is attached once instead of on every render.
  useEffect(() => {
    function handleSessionExpired() {
      clearStoredSession();
      setUser(null);
      setSessionExpired(true);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  function refreshUser() {
    const token = localStorage.getItem("token");

    // Re-check storage when another part of the app may have changed it, such
    // as after returning from a separate tab or completing a profile update.
    if (!token || isTokenExpired(token)) {
      logout();
      return false;
    }

    const storedUser = readStoredUser();
    setUser(storedUser);
    return Boolean(storedUser);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      sessionExpired,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, isAuthenticated, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Access the current authentication state from any component in the app.
 *
 * This hook returns the current user, auth flags, and session actions so that
 * components can decide whether to render protected content or redirect the
 * user to the sign-in flow.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
