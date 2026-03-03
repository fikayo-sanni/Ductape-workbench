import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import WorkbenchLayout from './components/WorkbenchLayout';
import LoginModal from './components/LoginModal';
import MarketplacePublicLayout from './pages/MarketplacePublicLayout';
import MarketplacePublicIndex from './pages/MarketplacePublicIndex';
import MarketplacePublicAppPage from './pages/MarketplacePublicAppPage';
import MarketplacePublicWorkspacePage from './pages/MarketplacePublicWorkspacePage';
import { useThemeStore } from './stores/theme-store';
import { useLoginModalStore } from './stores/login-modal-store';
import { useAuth } from './store/useAuth';
import { authServices } from './services/authServices';
import toast from 'react-hot-toast';

// Create a client
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
  const { isOpen: isLoginModalOpen, closeLoginModal } = useLoginModalStore();
  const setUser = useAuth((state) => state.setUser);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Handle OAuth callback (Google/GitHub redirect with ?loggedIn=true&token=...)
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
          closeLoginModal();
          toast.success('Login successful');
          window.location.reload();
        })
        .catch(() => {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
          toast.error('Login failed. Please try again.');
        });
    }
  }, [setUser, closeLoginModal]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<WorkbenchLayout />} />
          <Route path="/marketplace" element={<MarketplacePublicLayout />}>
            <Route index element={<MarketplacePublicIndex />} />
            <Route path="app/:appTag" element={<MarketplacePublicAppPage />} />
            <Route path="workspace/:workspaceTag" element={<MarketplacePublicWorkspacePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Login Modal - shown on 401 unauthorized */}
        {isLoginModalOpen && (
          <LoginModal
            onSuccess={() => {
              closeLoginModal();
              // Reload to refresh data with new auth
              window.location.reload();
            }}
            onClose={closeLoginModal}
          />
        )}
      </Router>
    </QueryClientProvider>
  );
}

export default App;
