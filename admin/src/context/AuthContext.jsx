import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(() => {
    const saved = localStorage.getItem('swastik_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token && !adminUser) {
      setAdminUser({
        name: 'Admin',
        username: 'admin',
        phone: '+919999999999',
        role: 'admin'
      });
    }
    setLoading(false);
  }, []);

  
  const loginWithCredentials = async (identifier, password) => {
    try {
      const data = await api.adminLogin(identifier, password);
      if (data?.token && data?.user) {
        setAdminUser(data.user);
        localStorage.setItem('swastik_admin_user', JSON.stringify(data.user));
        return data.user;
      }
      throw new Error('Invalid response from authentication server.');
    } catch (err) {
      throw err;
    }
  };

  const autoLoginMasterAdmin = async () => {
    try {
      return await loginWithCredentials('admin', 'admin123');
    } catch (err) {
      console.error('Master admin authentication error:', err.message);
      throw err;
    }
  };

  const logout = () => {
    api.setToken(null);
    setAdminUser(null);
    localStorage.removeItem('swastik_admin_user');
  };

  return (
    <AuthContext.Provider value={{
      adminUser,
      isAuthenticated: !!adminUser,
      loading,
      loginWithCredentials,
      autoLoginMasterAdmin,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);





