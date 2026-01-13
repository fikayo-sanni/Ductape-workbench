import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import WorkbenchLayout from './components/WorkbenchLayout';
import LoginModal from './components/LoginModal';
import { useThemeStore } from './stores/theme-store';
import { useLoginModalStore } from './stores/login-modal-store';

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

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<WorkbenchLayout />} />
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
