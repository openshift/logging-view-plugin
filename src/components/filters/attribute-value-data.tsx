import React from 'react';
import { Attribute, Option } from './filter.types';

type UseAttributeValueDataHookResult = [
  fetchData: (searchQuery?: string) => void,
  data: Array<Option> | undefined,
];

export const useAttributeValueData = (attribute: Attribute): UseAttributeValueDataHookResult => {
  const [data, setData] = React.useState<Array<Option> | undefined>();

  const fetchData = React.useCallback(
    (searchQuery?: string) => {
      if (attribute.options) {
        if (Array.isArray(attribute.options)) {
          setData(attribute.options);
        } else {
          attribute.options(searchQuery).then((asyncOptions) => {
            setData(asyncOptions);
          });
        }
      }
    },
    [attribute],
  );

  return [fetchData, data];
};
