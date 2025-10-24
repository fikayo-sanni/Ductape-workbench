// Utility functions for onboarding management

export const markUserAsNew = () => {
  localStorage.setItem('ductape-is-new-user', 'true');
};

export const isNewUser = (): boolean => {
  return localStorage.getItem('ductape-is-new-user') === 'true';
};

export const hasCompletedOnboarding = (): boolean => {
  return localStorage.getItem('ductape-onboarding-completed') === 'true';
};

export const resetOnboarding = () => {
  localStorage.removeItem('ductape-onboarding-completed');
  localStorage.removeItem('ductape-is-new-user');
};

export const shouldShowOnboarding = (): boolean => {
  return isNewUser() && !hasCompletedOnboarding();
};

// Trigger onboarding for new users (call this after successful registration)
export const triggerOnboardingForNewUser = () => {
  markUserAsNew();
  // The OnboardingContext will automatically detect this and show the modal
};

