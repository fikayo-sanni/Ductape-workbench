import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from 'react-hot-toast';
import WorkbenchLayout from './components/WorkbenchLayout';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import OnboardingPage from './pages/auth/OnboardingPage';
import PendingInvitesPage from './pages/auth/PendingInvitesPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import MarketplacePublicLayout from './pages/MarketplacePublicLayout';
import MarketplacePublicIndex from './pages/MarketplacePublicIndex';
import MarketplacePublicAppPage from './pages/MarketplacePublicAppPage';
import MarketplacePublicWorkspacePage from './pages/MarketplacePublicWorkspacePage';
import AdminPage from './pages/AdminPage';
import { useThemeStore } from './stores/theme-store';
import { isSelfHosted } from './helpers/env';
import { LicenseProvider } from './contexts/LicenseContext';

function RootRoute() {
  const [searchParams] = useSearchParams();
  if (searchParams.get('loggedIn') === 'true' && searchParams.get('token')) {
    return <OAuthCallbackPage />;
  }
  return <WorkbenchLayout />;
}

function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <LicenseProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/pending-invites" element={<PendingInvitesPage />} />
          </Route>

          <Route path="/" element={<RootRoute />} />

          {isSelfHosted() && (
            <Route path="/admin" element={<AdminPage />} />
          )}

          <Route path="/marketplace" element={<MarketplacePublicLayout />}>
            <Route index element={<MarketplacePublicIndex />} />
            <Route path="app/:appTag" element={<MarketplacePublicAppPage />} />
            <Route path="workspace/:workspaceTag" element={<MarketplacePublicWorkspacePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </LicenseProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
