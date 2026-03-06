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

    // Load partial progress if any
    const savedStep = localStorage.getItem('ductape-onboarding-step');
    const savedData = localStorage.getItem('ductape-onboarding-data');
    if (savedStep) setCurrentStep(parseInt(savedStep));
    if (savedData) {
      try {
        setStepData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse onboarding data', e);
      }
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    if (isOnboarding) {
      localStorage.setItem('ductape-onboarding-step', currentStep.toString());
      localStorage.setItem('ductape-onboarding-data', JSON.stringify(stepData));
    }
  }, [currentStep, stepData, isOnboarding]);

  const startOnboarding = () => {
    setIsOnboarding(true);
    setCurrentStep(0);
    setStepData({});
    localStorage.removeItem('ductape-onboarding-step');
    localStorage.removeItem('ductape-onboarding-data');
  };

  const completeOnboarding = () => {
    setIsOnboarding(false);
    setHasCompletedOnboarding(true);
    setCurrentStep(0);
    setStepData({});
    localStorage.setItem('ductape-onboarding-completed', 'true');
    localStorage.removeItem('ductape-is-new-user');
    localStorage.removeItem('ductape-onboarding-step');
    localStorage.removeItem('ductape-onboarding-data');
  };

  const skipOnboarding = () => {
    setIsOnboarding(false);
    setHasCompletedOnboarding(true);
    setCurrentStep(0);
    setStepData({});
    localStorage.setItem('ductape-onboarding-completed', 'true');
    localStorage.removeItem('ductape-is-new-user');
    localStorage.removeItem('ductape-onboarding-step');
    localStorage.removeItem('ductape-onboarding-data');
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
    setStepData: (data) => {
      // Ensure we don't accidentally pass event objects or other non-plain data
      // React synthetic events have a nativeEvent property
      if (data && typeof data === 'object' && !('nativeEvent' in data) && !('preventDefault' in data)) {
        setStepData(prev => ({ ...prev, ...data }));
      }
    },
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

