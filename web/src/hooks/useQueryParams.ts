import React from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

export const useQueryParams = () => {
  const location = useLocation();
  return React.useMemo(() => new URLSearchParams(location.search), [location.search]);
};
