import React from 'react';
import { Attribute, Option } from './filter.types';
import { useBoolean } from '../../hooks/useBoolean';

type UseAttributeValueDataHookResult = {
  getAttributeOptions: (searchQuery?: string) => void;
  attributeOptions: Array<Option>;
  attributeError: Error | undefined;
  attributeLoading: boolean;
};

export const useAttributeValueData = (attribute: Attribute): UseAttributeValueDataHookResult => {
  const [attributeOptions, setAttributeOptions] = React.useState<Array<Option>>([]);
  const { value: attributeLoading, setValue: setAttributeLoading } = useBoolean(true);
  const [attributeError, setAttributeError] = React.useState<Error | undefined>();

  const getAttributeOptions = React.useCallback(
    (searchQuery?: string) => {
      setAttributeError(undefined);
      if (attribute.options) {
        if (Array.isArray(attribute.options)) {
          setAttributeOptions(attribute.options);
        } else {
          setAttributeLoading(true);
          attribute
            .options(searchQuery)
            .then((asyncOptions) => {
              setAttributeOptions(asyncOptions ?? []);
            })
            .catch((searchError) => {
              try {
                const jsonError = JSON.parse(searchError.message);
                setAttributeError(jsonError.message || searchError);
              } catch {
                setAttributeError(searchError);
              }
            })
            .finally(() => setAttributeLoading(false));
        }
      }
    },
    [attribute],
  );

  return { getAttributeOptions, attributeOptions, attributeError, attributeLoading };
};
