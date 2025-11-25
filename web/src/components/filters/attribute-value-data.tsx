import React from 'react';
import { Attribute, Option } from './filter.types';
import { useBoolean } from '../../hooks/useBoolean';

type UseAttributeValueDataHookResult = {
  getAttributeOptions: (searchQuery?: string) => void;
  attributeOptions: Array<Option>;
  attributeError: Error | undefined;
  attributeLoading: boolean;
};

const uniqueOptions = (options: Array<Option>): Array<Option> =>
  Array.from(new Set(options.map(({ option, value }) => `${option}|||${value}`))).map((str) => {
    const [option, value] = str.split('|||');
    return { option, value };
  });

export const useAttributeValueData = (attribute: Attribute): UseAttributeValueDataHookResult => {
  const [attributeOptions, setAttributeOptions] = React.useState<Array<Option>>([]);
  const { value: attributeLoading, setValue: setAttributeLoading } = useBoolean(true);
  const [attributeError, setAttributeError] = React.useState<Error | undefined>();

  const getAttributeOptions = React.useCallback(
    (searchQuery?: string) => {
      setAttributeError(undefined);
      if (attribute.options) {
        if (Array.isArray(attribute.options)) {
          setAttributeLoading(false);
          setAttributeOptions(uniqueOptions(attribute.options));
        } else {
          attribute
            .options(searchQuery)
            .then((asyncOptions) => {
              setAttributeOptions(uniqueOptions(asyncOptions ?? []));
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
