import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { defaultConfig, getConfig } from '../backend-client';
import { Config } from '../logs.types';

interface LogsContextType {
  config: Config;
  fetchConfig: () => Promise<Config>;
  configLoaded: boolean;
}

export const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const LogsConfigProvider: React.FC<{ children?: React.ReactNode | undefined }> = ({
  children,
}) => {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [configLoaded, setConfigLoaded] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      if (!configLoaded) {
        const configData = await getConfig();
        const mergedConfig = { ...defaultConfig, ...configData };
        setConfig(mergedConfig);
        setConfigLoaded(true);

        return mergedConfig;
      }

      return config;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching logging plugin configuration', error);
      setConfig(defaultConfig);
      return defaultConfig;
    }
  }, [config]);

  return (
    <LogsContext.Provider value={{ config, fetchConfig, configLoaded }}>
      {children}
    </LogsContext.Provider>
  );
};

export const useLogsConfig = (): LogsContextType => {
  const context = useContext(LogsContext);

  if (context === undefined) {
    throw new Error('useLogsConfig must be used within a LogsConfigProvider');
  }

  useEffect(() => {
    context.fetchConfig();
  }, []);

  return context;
};
