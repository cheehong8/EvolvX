// contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'
    : 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const stored = await AsyncStorage.getItem('auth_token');
  if (stored) config.headers.Authorization = `Bearer ${stored}`;
  return config;
});

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,   setUser]   = useState(null);
  const [token,  setToken]  = useState(null);      
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState('');

  /* ───── boot ───── */
  useEffect(() => {
    (async () => {
      try {
        const [[, storedToken], [, userJson]] = await AsyncStorage.multiGet([
          'auth_token',
          'user',
        ]);
        if (storedToken) setToken(storedToken);
        if (userJson)    setUser(JSON.parse(userJson));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ───── helpers ───── */
  const login = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { access_token, user_id, username } = data;

      await AsyncStorage.multiSet([
        ['auth_token', access_token],
        ['user', JSON.stringify({ id: user_id, username, email })],
      ]);

      api.defaults.headers.common.Authorization = `Bearer ${access_token}`; // NEW
      setToken(access_token);                                               // NEW
      setUser({ id: user_id, username, email });
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.error || 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    username,
    email,
    password,
    dateOfBirth,
    gender,
    height,
    weight
  ) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password,
        date_of_birth: dateOfBirth,
        gender,
        height,
        weight,
      });
      const { access_token, user_id } = data;
      const userData = { id: user_id, username, email };

      await AsyncStorage.multiSet([
        ['auth_token', access_token],
        ['user', JSON.stringify(userData)],
      ]);

      api.defaults.headers.common.Authorization = `Bearer ${access_token}`; // NEW
      setToken(access_token);                                               // NEW
      setUser(userData);
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.error || 'Registration failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }; // ← function now properly closed

  const logout = async () => {
    setLoading(true);
    try {
      await AsyncStorage.multiRemove(['auth_token', 'user']);
      delete api.defaults.headers.common.Authorization; // NEW
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, error, login, register, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
export default AuthContext;
