import { Attribute, Filters, Option } from './filter.types';
import { useBoolean } from '../../hooks/useBoolean';
import { useCallback, useRef, useState } from 'react';

type UseAttributeValueDataHookResult = {
  getAttributeOptions: (filters?: Filters) => void;
  attributeOptions: Array<Option>;
  attributeError: Error | undefined;
  // true until the first non-empty partial result or the final result arrives
  attributeLoading: boolean;
  // true while partial options are displayed and slower sources are still pending
  attributeLoadingMore: boolean;
};

const uniqueOptions = (options: Array<Option>): Array<Option> =>
  Array.from(new Set(options.map(({ option, value }) => `${option}|||${value}`))).map((str) => {
    const [option, value] = str.split('|||');
    return { option, value };
  });

export const useAttributeValueData = (attribute: Attribute): UseAttributeValueDataHookResult => {
  const [attributeOptions, setAttributeOptions] = useState<Array<Option>>([]);
  const { value: attributeLoading, setValue: setAttributeLoading } = useBoolean(true);
  const { value: attributeLoadingMore, setValue: setAttributeLoadingMore } = useBoolean(false);
  const [attributeError, setAttributeError] = useState<Error | undefined>();
  const requestIdRef = useRef(0);

  const getAttributeOptions = useCallback(
    (filters?: Filters) => {
      // Partial results widen the window in which an older request can land after a
      // newer one (e.g. on tenant change), so only the latest request may update state.
      const requestId = ++requestIdRef.current;
      const isCurrent = () => requestId === requestIdRef.current;

      setAttributeError(undefined);
      if (attribute.options) {
        if (Array.isArray(attribute.options)) {
          setAttributeLoading(false);
          setAttributeLoadingMore(false);
          setAttributeOptions(uniqueOptions(attribute.options));
        } else {
          // Drop results from a previous request (e.g. another tenant) so they cannot be
          // selected while the new request is pending
          setAttributeOptions([]);
          setAttributeLoading(true);
          setAttributeLoadingMore(false);

          const onPartial = (partialOptions: Array<Option>) => {
            // An empty partial would flash the empty state before slower sources reply
            if (!isCurrent() || partialOptions.length === 0) {
              return;
            }
            setAttributeOptions(uniqueOptions(partialOptions));
            setAttributeLoading(false);
            setAttributeLoadingMore(true);
          };

          attribute
            .options(filters, onPartial)
            .then((asyncOptions) => {
              if (isCurrent()) {
                setAttributeOptions(uniqueOptions(asyncOptions ?? []));
              }
            })
            .catch((searchError) => {
              if (!isCurrent()) {
                return;
              }
              try {
                const jsonError = JSON.parse(searchError.message);
                setAttributeError(jsonError.message || searchError);
              } catch {
                setAttributeError(searchError);
              }
            })
            .finally(() => {
              if (isCurrent()) {
                setAttributeLoading(false);
                setAttributeLoadingMore(false);
              }
            });
        }
      }
    },
    [attribute, setAttributeLoading, setAttributeLoadingMore],
  );

  return {
    getAttributeOptions,
    attributeOptions,
    attributeError,
    attributeLoading,
    attributeLoadingMore,
  };
};
