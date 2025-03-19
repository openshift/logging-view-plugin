import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import React from 'react';
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
    className="lv-plugin__detail_descripton-list"
  >
    {Object.keys(data)
      .filter((key) => key !== '_')
      .sort()
      .map((key) => (
        <DescriptionListGroup key={key}>
          <DescriptionListTerm className="lv-plugin__detail__list-term">{key}</DescriptionListTerm>
          <DescriptionListDescription>{data[key]}</DescriptionListDescription>
        </DescriptionListGroup>
      ))}
  </DescriptionList>
);
