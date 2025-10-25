import { createContext, useContext, useState, useEffect } from 'react';

interface Variable {
  isSelected: boolean;
  value: string;
  environment: string;
  environmentValues: Record<string, string>;
}

interface IntegrationState {
  productTag?: string;
  accessTag?: string;
  environmentMappings: Array<{
    isSelected: boolean;
    app_env_slug: string;
    product_env_slug: string;
  }>;
  variables: Record<string, Variable>;
  authFields?: {
    auth_tag: string;
    fields: Array<{
      key: string;
      value: string;
      addTo: 'headers' | 'params' | 'query' | 'body';
      environment: string;
      environmentValues: Record<string, string>;
    }>;
  };
  appTag?: string;
}

interface IntegrationContextType {
  data: IntegrationState;
  setProductTag: (tag: string) => void;
  setAccessTag: (tag: string) => void;
  setEnvironmentMappings: (mappings: IntegrationState['environmentMappings']) => void;
  setVariables: (variables: Record<string, Variable>) => void;
  setAuthFields: (fields: IntegrationState['authFields']) => void;
  setAppTag: (tag: string) => void;
  resetIntegration: () => void;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

const STORAGE_KEY = 'integration_state';

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<IntegrationState>(() => {
    // Try to load saved state from localStorage
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (e) {
        console.error('Failed to parse saved integration state:', e);
      }
    }
    
    // Default state if no saved state exists
    return {
      environmentMappings: [],
      variables: {},
    };
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setProductTag = (tag: string) => {
    setState(prev => ({ ...prev, productTag: tag }));
  };

  const setAccessTag = (tag: string) => {
    setState(prev => ({ ...prev, accessTag: tag }));
  };

  const setEnvironmentMappings = (mappings: IntegrationState['environmentMappings']) => {
    setState(prev => ({ ...prev, environmentMappings: mappings }));
  };

  const setVariables = (variables: Record<string, Variable>) => {
    setState(prev => ({ ...prev, variables }));
  };

  const setAuthFields = (fields: IntegrationState['authFields']) => {
    setState(prev => ({ ...prev, authFields: fields }));
  };

  const setAppTag = (tag: string) => {
    setState(prev => ({ ...prev, appTag: tag }));
  };

  const resetIntegration = () => {
    setState({
      environmentMappings: [],
      variables: {},
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <IntegrationContext.Provider
      value={{
        data: state,
        setProductTag,
        setAccessTag,
        setEnvironmentMappings,
        setVariables,
        setAuthFields,
        setAppTag,
        resetIntegration,
      }}
    >
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegration() {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  return context;
}
