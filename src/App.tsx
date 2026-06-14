import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import WorkbenchLayout from './components/WorkbenchLayout';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import OnboardingPage from './pages/auth/OnboardingPage';
import PendingInvitesPage from './pages/auth/PendingInvitesPage';
import MarketplacePublicLayout from './pages/MarketplacePublicLayout';
import MarketplacePublicIndex from './pages/MarketplacePublicIndex';
import MarketplacePublicAppPage from './pages/MarketplacePublicAppPage';
import MarketplacePublicWorkspacePage from './pages/MarketplacePublicWorkspacePage';
import { useThemeStore } from './stores/theme-store';
import { useAuth } from './store/useAuth';
import { authServices } from './services/authServices';
import toast from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  const theme = useThemeStore((state) => state.theme);
  const setUser = useAuth((state) => state.setUser);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loggedIn = params.get('loggedIn');
    const token = params.get('token');
    if (loggedIn === 'true' && token) {
      authServices
        .exchangeOAuthToken(token)
        .then((res) => {
          const user = res.data.result;
          setUser({
            _id: user._id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            active: user.active,
            auth_token: user.auth_token,
            public_key: user.public_key,
            workspaces: user.workspaces,
          });
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
          toast.success('Login successful');
          window.location.href = '/';
        })
        .catch(() => {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
          toast.error('Login failed. Please try again.');
          window.location.href = '/login';
        });
    }
  }, [setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/pending-invites" element={<PendingInvitesPage />} />
          </Route>

          <Route
            path="/"
            element={<WorkbenchLayout />}
          />

          <Route path="/marketplace" element={<MarketplacePublicLayout />}>
            <Route index element={<MarketplacePublicIndex />} />
            <Route path="app/:appTag" element={<MarketplacePublicAppPage />} />
            <Route path="workspace/:workspaceTag" element={<MarketplacePublicWorkspacePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
