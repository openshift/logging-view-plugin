import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import * as React from 'react';
import './log-detail.css';

interface LogDetailProps {
  data: Record<string, string>;
}

export const LogDetail: React.FC<LogDetailProps> = ({ data }) => (
  <DescriptionList
    isHorizontal
    isCompact
    isFluid
    columnModifier={{
      default: '2Col',
    }}
    className="co-logs-detail_descripton-list"
  >
    {Object.keys(data)
      .filter((key) => key !== '_')
      .map((key) => (
        <DescriptionListGroup key={key}>
          <DescriptionListTerm className="co-logs-detail__list-term">
            {key}
          </DescriptionListTerm>
          <DescriptionListDescription>{data[key]}</DescriptionListDescription>
        </DescriptionListGroup>
      ))}
  </DescriptionList>
);
