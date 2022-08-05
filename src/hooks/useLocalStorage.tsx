import React from 'react';

export const useLocalStorage = (
  key: string,
): [string, React.Dispatch<string>] => {
  const value = React.useRef(window.localStorage.getItem(key));

  const callback = React.useCallback(
    (event: StorageEvent) => {
      if (event.key === key) {
        value.current = event.newValue;
      }
    },
    [key],
  );

  React.useEffect(() => {
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener('storage', callback);
    };
  }, [callback]);

  const updateValue = React.useCallback(
    (val) => window.localStorage.setItem(key, val),
    [key],
  );

  return [value.current, updateValue];
};
