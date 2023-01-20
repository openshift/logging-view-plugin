import { Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';

export const CenteredContainer: React.FC = ({ children }) => {
  return (
    <Flex
      justifyContent={{ default: 'justifyContentCenter' }}
      alignContent={{ default: 'alignContentCenter' }}
      style={{ height: '100%' }}
    >
      <FlexItem>{children}</FlexItem>
    </Flex>
  );
};
