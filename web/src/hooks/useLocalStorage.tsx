import React from 'react';

const parseValue = <T,>(value: string | null): T | null => {
  if (value) {
    try {
      const json = JSON.parse(value);
      return json as T;
      // eslint-disable-next-line no-empty
    } catch (ignore) {}
  }

  return null;
};

export const useLocalStorage = <T,>(key: string): [T | null, React.Dispatch<T>] => {
  const value = React.useRef<T | null>(parseValue(window.localStorage.getItem(key)));

  const callback = React.useCallback(
    (event: StorageEvent) => {
      if (event.key === key) {
        value.current = parseValue(event.newValue);
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
    (val: T) => window.localStorage.setItem(key, JSON.stringify(val)),
    [key],
  );

  return [value.current, updateValue];
};
