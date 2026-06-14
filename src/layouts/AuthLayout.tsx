import { CheckCircle2, LogOut } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DuctapeBrand from '@/components/auth/DuctapeBrand';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/useAuth';
import { clearOnboardingSession } from '@/utils/onboarding';
import { cn } from '@/lib/utils';

const AUTH_HERO_COPY: Record<string, { eyebrow: string; title: string; bullets: string[] }> = {
  '/login': {
    eyebrow: 'Welcome back',
    title: 'Composable backends. Resilient by default.',
    bullets: [
      'APIs, databases, queues, workflows — one place',
      'Configure in the workbench, run from your SDK',
      'Built-in observability and resilience',
    ],
  },
  '/signup': {
    eyebrow: 'Get started',
    title: 'Snap blocks together. Ship faster.',
    bullets: [
      'Pre-built components, predictable interfaces',
      'Wire environments without glue code',
      'TypeScript, Go, Java, .NET — same runtime',
    ],
  },
  '/forgot-password': {
    eyebrow: 'Account recovery',
    title: 'Reset your password',
    bullets: [
      'We email you a secure code',
      'Your workspaces stay intact',
      'Back to the workbench in minutes',
    ],
  },
};

function AuthSplitLayout({ hero }: { hero: (typeof AUTH_HERO_COPY)[string] }) {
  return (
    <div className="mx-auto w-full min-h-[calc(100vh-4rem)] max-w-6xl">
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_1.05fr]">
        <aside className="relative hidden lg:flex flex-col justify-center px-10 xl:px-14 py-12 border-r border-grey-300/80 bg-gradient-to-br from-white via-white to-primary/[0.04]">
          <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-6 h-40 w-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
            {hero.eyebrow}
          </p>
          <h2 className="text-3xl xl:text-4xl font-bold text-grey leading-tight max-w-md">
            {hero.title}
          </h2>
          <ul className="mt-8 space-y-4">
            {hero.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-grey-600">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex items-center justify-center px-4 sm:px-8 py-10 lg:py-12">
          <div className="w-full max-w-[480px]">
            <div className="lg:hidden mb-6 rounded-xl border border-grey-300/80 bg-white/80 px-4 py-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1">
                {hero.eyebrow}
              </p>
              <p className="text-sm font-semibold text-grey leading-snug">{hero.title}</p>
            </div>
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
}

function OnboardingWideLayout() {
  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 sm:px-8 lg:px-12 xl:px-16 py-8 lg:py-12">
      <Outlet />
    </div>
  );
}

export default function AuthLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isOnboarding = pathname === '/onboarding';
  const isPendingInvites = pathname === '/pending-invites';
  const isWideAuthPage = isOnboarding || isPendingInvites;
  const hero = AUTH_HERO_COPY[pathname] ?? AUTH_HERO_COPY['/login'];
  const showLogout = isWideAuthPage && Boolean(user);

  const handleLogout = () => {
    clearOnboardingSession();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-grey-100 flex flex-col">
      <header
        data-testid="auth-header"
        className="h-16 sticky top-0 z-30 border-b border-grey-400 bg-white flex items-center justify-between px-4 sm:px-6 flex-shrink-0 shadow-sm"
      >
        <DuctapeBrand linkTo="/login" />
        <div className="flex items-center gap-2">
          {showLogout ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-grey-600 hover:text-grey"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        {isWideAuthPage ? <OnboardingWideLayout /> : <AuthSplitLayout hero={hero} />}
      </main>
    </div>
  );
}
