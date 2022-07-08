import {
  Action,
  Alert,
  ExtensionHook,
} from '@openshift-console/dynamic-plugin-sdk';
import { ListIcon } from '@patternfly/react-icons';
import React from 'react';

type LogActionsExtensionOptions = {
  alert?: Alert;
};

const useLogActionsExtension: ExtensionHook<
  Array<Action>,
  LogActionsExtensionOptions
> = (options) => {
  // TODO: transform promQL into logQL
  const alertQuery = options.alert?.rule?.query ?? '';
  const href = `/monitoring/logs?q=${alertQuery}`;
  const [actions] = React.useState([
    {
      id: 'link-to-logs',
      label: (
        <>
          <ListIcon /> See related logs
        </>
      ),
      cta: { href },
    },
  ]);

  return [actions, true, null];
};

export default useLogActionsExtension;
