import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from './ui/button';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 p-0"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-grey-600" />
      ) : (
        <Sun className="h-5 w-5 text-grey-600" />
      )}
    </Button>
  );
}
