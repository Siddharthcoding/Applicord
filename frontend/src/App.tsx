import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ThemeProvider } from './context/ThemeContext';
import { NotFoundPage, PrivacyPage, TermsPage } from './pages/PublicInfoPages';
import { RouteMetadata } from './components/common/RouteMetadata';

// Code-split internal workspace pages to keep initial bundle small & optimize Core Web Vitals
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })));
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage').then((m) => ({ default: m.ApplicationDetailPage })));
const KanbanPage = lazy(() => import('./pages/KanbanPage').then((m) => ({ default: m.KanbanPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const AutomationPage = lazy(() => import('./pages/AutomationPage').then((m) => ({ default: m.AutomationPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const ContactsPage = lazy(() => import('./pages/ContactsPage').then((m) => ({ default: m.ContactsPage })));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const ImportExportPage = lazy(() => import('./pages/ImportExportPage').then((m) => ({ default: m.ImportExportPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const SuspenseLoading: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-display font-black text-xs text-white animate-pulse shadow-glow-cyan">
        A
      </div>
      <div className="w-5 h-5 rounded-full border-2 border-indigo-500/60 border-t-indigo-400 animate-spin" />
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cosmic-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-display font-black text-sm text-white animate-pulse shadow-glow-cyan">
            A
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500/60 border-t-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Root smart redirect: landing for guests, dashboard for logged-in users
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/landing" replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <RouteMetadata />
          <Suspense fallback={<SuspenseLoading />}>
            <Routes>
              {/* Smart root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public Marketing & Legal Pages — accessible by everyone & search crawlers */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />

              {/* Public Auth Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />

              {/* Password reset */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected Application Workspace */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
              </Route>

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="applications/:id" element={<ApplicationDetailPage />} />
                <Route path="kanban" element={<KanbanPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="automation" element={<AutomationPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="import-export" element={<ImportExportPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Analytics />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
