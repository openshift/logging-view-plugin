import React from 'react';
import { Attribute, Option } from './filter.types';

type UseAttributeValueDataHookResult = [
  fetchData: (searchQuery?: string) => void,
  data: Array<Option> | undefined,
  error: Error | undefined,
];

export const useAttributeValueData = (attribute: Attribute): UseAttributeValueDataHookResult => {
  const [data, setData] = React.useState<Array<Option> | undefined>();
  const [error, setError] = React.useState<Error | undefined>();

  const fetchData = React.useCallback(
    (searchQuery?: string) => {
      setError(undefined);
      if (attribute.options) {
        if (Array.isArray(attribute.options)) {
          setData(attribute.options);
        } else {
          attribute
            .options(searchQuery)
            .then((asyncOptions) => {
              setData(asyncOptions);
            })
            .catch((searchError) => {
              try {
                const jsonError = JSON.parse(searchError.message);
                setError(jsonError.message || searchError);
              } catch {
                setError(searchError);
              }
            });
        }
      }
    },
    [attribute],
  );

  return [fetchData, data, error];
};
