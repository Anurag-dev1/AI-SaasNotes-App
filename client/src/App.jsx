import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import api from './lib/api';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import NoteEditorPage from './pages/NoteEditorPage';
import SearchPage from './pages/SearchPage';
import AdminMembersPage from './pages/AdminMembersPage';

function App() {
  const { isAuthenticated, isLoading, setLoading, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await api.post('/auth/refresh');
        setAuth(response.data.user, response.data.accessToken);
      } catch (error) {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [setAuth, clearAuth, setLoading]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/notes/:id" element={<NoteEditorPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route element={<ProtectedRoute requiredRole="Admin" />}>
            <Route path="/admin/members" element={<AdminMembersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
