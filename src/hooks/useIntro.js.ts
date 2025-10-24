import { useEffect, useRef } from 'react';
import introJs from 'intro.js';
import 'intro.js/minified/introjs.min.css';
import '../styles/introjs-custom.css';

interface IntroStep {
  element?: string;
  intro: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  tooltipClass?: string;
  highlightClass?: string;
  hidePrev?: boolean;
  hideNext?: boolean;
  showStepNumber?: boolean;
  disableInteraction?: boolean;
}

interface UseIntroOptions {
  steps: IntroStep[];
  onComplete?: () => void;
  onExit?: () => void;
  onBeforeChange?: (element: HTMLElement) => void;
  onAfterChange?: (element: HTMLElement) => void;
  showProgress?: boolean;
  showBullets?: boolean;
  exitOnOverlayClick?: boolean;
  exitOnEsc?: boolean;
  nextLabel?: string;
  prevLabel?: string;
  skipLabel?: string;
  doneLabel?: string;
  hidePrev?: boolean;
  hideNext?: boolean;
  showStepNumbers?: boolean;
  keyboardNavigation?: boolean;
  disableInteraction?: boolean;
}

export function useIntro(options: UseIntroOptions) {
  const introRef = useRef<any>(null);

  useEffect(() => {
    // Initialize intro.js
    introRef.current = introJs();

    // Configure intro.js
    if (introRef.current) {
      introRef.current.setOptions({
        steps: options.steps as any,
        showProgress: options.showProgress ?? true,
        showBullets: options.showBullets ?? false, // Hide default bullets
        exitOnOverlayClick: options.exitOnOverlayClick ?? true,
        exitOnEsc: options.exitOnEsc ?? true,
        nextLabel: options.nextLabel ?? 'Next',
        prevLabel: options.prevLabel ?? 'Previous',
        skipLabel: options.skipLabel ?? 'Skip',
        doneLabel: options.doneLabel ?? 'Done',
        hidePrev: options.hidePrev ?? false,
        hideNext: options.hideNext ?? false,
        showStepNumbers: options.showStepNumbers ?? false, // Hide default step numbers
        keyboardNavigation: options.keyboardNavigation ?? true,
        disableInteraction: options.disableInteraction ?? false,
        tooltipClass: 'custom-introjs-tooltip', // Add custom tooltip class
        highlightClass: 'custom-introjs-highlight', // Add custom highlight class
      });

      // Set up event handlers
      if (options.onComplete) {
        introRef.current.oncomplete(options.onComplete);
      }

      if (options.onExit) {
        introRef.current.onexit(options.onExit);
      }

      if (options.onBeforeChange) {
        introRef.current.onbeforechange(options.onBeforeChange);
      }

      if (options.onAfterChange) {
        introRef.current.onafterchange(options.onAfterChange);
      }

      // Add debugging event handlers
      introRef.current.onbeforechange((element: any) => {
        console.log('Intro.js before change:', element);
      });

      introRef.current.onafterchange((element: any) => {
        console.log('Intro.js after change:', element);
      });
    }

    return () => {
      if (introRef.current) {
        introRef.current.exit();
      }
    };
  }, [options]);

  const startIntro = () => {
    if (introRef.current) {
      console.log('Starting intro.js with steps:', options.steps);
      introRef.current.start();
    }
  };

  const exitIntro = () => {
    if (introRef.current) {
      introRef.current.exit();
    }
  };

  const goToStep = (step: number) => {
    if (introRef.current) {
      introRef.current.goToStep(step);
    }
  };

  const nextStep = () => {
    if (introRef.current) {
      introRef.current.nextStep();
    }
  };

  const previousStep = () => {
    if (introRef.current) {
      introRef.current.previousStep();
    }
  };

  return {
    startIntro,
    exitIntro,
    goToStep,
    nextStep,
    previousStep,
  };
}

// Predefined intro tours for different parts of the app
export const introTours = {
  // Tour for the main workbench interface
  workbench: [
    {
      element: '[data-intro="sidebar"]',
      intro: 'This is your main navigation sidebar. Here you can access all your workspaces, products, and apps.',
      position: 'right' as const,
    },
    {
      element: '[data-intro="header"]',
      intro: 'The header contains the +New button to create new items, user menu, and workspace selector.',
      position: 'bottom' as const,
    },
    {
      element: '[data-intro="tabs"]',
      intro: 'Your open tabs appear here. Click on any tab to switch between different items.',
      position: 'bottom' as const,
    },
    {
      element: '[data-intro="content"]',
      intro: 'This is the main content area where you\'ll work with your selected item.',
      position: 'top' as const,
    },
  ],

  // Tour for creating a new request
  newRequest: [
    {
      element: '[data-intro="method-selector"]',
      intro: 'Select the HTTP method for your request (GET, POST, PUT, etc.).',
      position: 'bottom' as const,
    },
    {
      element: '[data-intro="url-input"]',
      intro: 'Enter the URL for your API endpoint here.',
      position: 'bottom' as const,
    },
    {
      element: '[data-intro="send-button"]',
      intro: 'Click this button to send your request and see the response.',
      position: 'left' as const,
    },
    {
      element: '[data-intro="tabs"]',
      intro: 'Use these tabs to configure headers, query parameters, and request body.',
      position: 'top' as const,
    },
  ],

  // Tour for app management
  appManagement: [
    {
      element: '[data-intro="app-header"]',
      intro: 'This shows your app information and current version.',
      position: 'bottom' as const,
    },
    {
      element: '[data-intro="actions-section"]',
      intro: 'Your API actions (endpoints) are listed here. Click on any action to test it.',
      position: 'top' as const,
    },
    {
      element: '[data-intro="environments-section"]',
      intro: 'Manage different environments (dev, staging, prod) for your app.',
      position: 'top' as const,
    },
    {
      element: '[data-intro="auth-section"]',
      intro: 'Configure authentication methods for your API calls.',
      position: 'top' as const,
    },
  ],
};

