import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OnboardingContextType {
  isOnboarding: boolean;
  hasCompletedOnboarding: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  stepData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  // Check if user has completed onboarding on mount
  useEffect(() => {
    const completed = localStorage.getItem('ductape-onboarding-completed');
    if (completed === 'true') {
      setHasCompletedOnboarding(true);
    }
  }, []);

  // Note: Removed automatic onboarding trigger based on 'ductape-is-new-user' flag.
  // Onboarding is now triggered from WorkbenchLayout.tsx only after workspace fetch
  // completes and confirms the user has no workspaces.

  const startOnboarding = () => {
    setIsOnboarding(true);
    setCurrentStep(0);
    setStepData({});
  };

  const completeOnboarding = () => {
    setIsOnboarding(false);
    setHasCompletedOnboarding(true);
    setCurrentStep(0);
    setStepData({});
    localStorage.setItem('ductape-onboarding-completed', 'true');
    localStorage.removeItem('ductape-is-new-user');
  };

  const skipOnboarding = () => {
    setIsOnboarding(false);
    setHasCompletedOnboarding(true);
    setCurrentStep(0);
    setStepData({});
    localStorage.setItem('ductape-onboarding-completed', 'true');
    localStorage.removeItem('ductape-is-new-user');
  };

  const value: OnboardingContextType = {
    isOnboarding,
    hasCompletedOnboarding,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    currentStep,
    setCurrentStep,
    stepData,
    setStepData,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

