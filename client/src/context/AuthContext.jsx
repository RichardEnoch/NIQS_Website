import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import API from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  // Employer accounts (job board). A third kind of session beside members and
  // admins; at most one of user / admin / employer is ever set.
  const [employer, setEmployer] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const saveToken = (newToken) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  const checkAuth = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await API.get('/auth/me');
      if (data.admin) {
        setAdmin(data.admin);
        setUser(null);
        setEmployer(null);
        setIsAdmin(true);
      } else if (data.user) {
        setUser(data.user);
        setAdmin(null);
        setEmployer(null);
        setIsAdmin(false);
      } else if (data.employer) {
        setEmployer(data.employer);
        setUser(null);
        setAdmin(null);
        setIsAdmin(false);
      } else {
        // Unexpected response — clear state
        saveToken(null);
        setAdmin(null);
        setUser(null);
        setEmployer(null);
        setIsAdmin(false);
      }
    } catch (err) {
      // Only clear auth on explicit 401 — don't wipe state on network errors
      if (err.response?.status === 401) {
        saveToken(null);
        setUser(null);
        setAdmin(null);
        setEmployer(null);
        setIsAdmin(false);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password, loginAsAdmin = false) => {
    const endpoint = loginAsAdmin ? '/auth/admin/login' : '/auth/login';

    const { data } = await API.post(endpoint, { email: email.trim().toLowerCase(), password });
    saveToken(data.token);

    if (loginAsAdmin) {
      setAdmin(data.admin);
      setUser(null);
      setIsAdmin(true);
    } else {
      setUser(data.user);
      setAdmin(null);
      setIsAdmin(false);
    }
    setEmployer(null);

    toast.success('Logged in successfully');
    return data;
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    saveToken(data.token);
    setUser(data.user);
    setAdmin(null);
    setIsAdmin(false);
    toast.success('Registration successful');
    return data;
  };

  /* ── Employer sessions (job board) ── */
  const employerLogin = async (email, password) => {
    const { data } = await API.post('/employers/login', { email: email.trim().toLowerCase(), password });
    saveToken(data.token);
    setEmployer(data.employer);
    setUser(null);
    setAdmin(null);
    setIsAdmin(false);
    toast.success('Signed in');
    return data;
  };

  const employerRegister = async (formData) => {
    const { data } = await API.post('/employers/register', formData);
    saveToken(data.token);
    setEmployer(data.employer);
    setUser(null);
    setAdmin(null);
    setIsAdmin(false);
    return data;
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (err) {
      // Logout even if the server call fails
    }

    saveToken(null);
    setUser(null);
    setAdmin(null);
    setEmployer(null);
    setIsAdmin(false);
    toast.success('Logged out');
  };

  const value = {
    user,
    admin,
    setAdmin,
    employer,
    setEmployer,
    employerLogin,
    employerRegister,
    token,
    loading,
    isAdmin,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
