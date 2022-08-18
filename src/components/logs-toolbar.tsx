import {
  Checkbox,
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
  Toolbar,
  ToolbarChip,
  ToolbarChipGroup,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
} from '@patternfly/react-core';
import React from 'react';
import { Severity } from '../severity';
import { LogsQueryInput } from './logs-query-input';
import { Spacer } from './spacer';
import { TenantDropdown } from './tenant-dropdown';
import { TogglePlay } from './toggle-play';
import './logs-toolbar.css';
import { TestIds } from '../test-ids';

interface LogsToolbarProps {
  query: string;
  onQueryChange?: (query: string) => void;
  onQueryRun?: () => void;
  tenant?: string;
  onTenantSelect?: (tenant: string) => void;
  enableStreaming?: boolean;
  isStreaming?: boolean;
  severityFilter?: Set<Severity>;
  onStreamingToggle?: (e: React.MouseEvent) => void;
  onSeverityChange?: (severityFilter: Set<Severity>) => void;
  onShowResourcesToggle?: (
    showResources: boolean,
    e: React.FormEvent<HTMLInputElement>,
  ) => void;
  showResources?: boolean;
  enableTenantDropdown?: boolean;
  isDisabled?: boolean;
}

const availableSeverityFilters: Array<Severity> = [
  'critical',
  'error',
  'warning',
  'debug',
  'info',
  'trace',
  'unknown',
];

export const LogsToolbar: React.FC<LogsToolbarProps> = ({
  query,
  onQueryChange,
  onQueryRun,
  tenant = 'application',
  onTenantSelect,
  severityFilter,
  onSeverityChange,
  onStreamingToggle,
  onShowResourcesToggle,
  showResources = false,
  enableStreaming = false,
  isStreaming = false,
  enableTenantDropdown = true,
  isDisabled = false,
}) => {
  const [isSeverityExpanded, setIsSeverityExpanded] = React.useState(false);

  const onDeleteSeverityFilter = (
    _category: string | ToolbarChipGroup,
    chip: string | ToolbarChip,
  ) => {
    severityFilter.delete(chip.toString() as Severity);
    onSeverityChange?.(new Set(severityFilter));
  };

  const onDeleteSeverityGroup = () => {
    onSeverityChange(new Set());
  };

  const onSeverityToggle = () => {
    setIsSeverityExpanded(!isSeverityExpanded);
  };

  const onSeveritySelect = (
    _: React.MouseEvent | React.ChangeEvent,
    value: string | SelectOptionObject,
  ) => {
    const severityValue = value.toString() as Severity;
    if (severityFilter.has(severityValue)) {
      severityFilter.delete(severityValue);
    } else {
      severityFilter.add(severityValue);
    }

    onSeverityChange?.(new Set(severityFilter));
  };

  return (
    <Toolbar isSticky clearAllFilters={onDeleteSeverityGroup}>
      <ToolbarContent>
        <ToolbarGroup className="co-logs-toolbar">
          <LogsQueryInput
            value={query}
            onRun={onQueryRun}
            onChange={onQueryChange}
          />

          <ToolbarFilter
            chips={Array.from(severityFilter)}
            deleteChip={onDeleteSeverityFilter}
            deleteChipGroup={onDeleteSeverityGroup}
            categoryName="Severity"
            className="co-logs-severity-filter"
            data-test={TestIds.SeverityDropdown}
          >
            <Select
              variant={SelectVariant.checkbox}
              aria-label="Severity"
              onToggle={onSeverityToggle}
              onSelect={onSeveritySelect}
              selections={Array.from(severityFilter)}
              isOpen={isSeverityExpanded}
              placeholderText="Severity"
              isDisabled={isDisabled}
            >
              {availableSeverityFilters.map((severity) => (
                <SelectOption key={severity} value={severity} />
              ))}
            </Select>
          </ToolbarFilter>

          {enableTenantDropdown && (
            <TenantDropdown
              onTenantSelected={onTenantSelect}
              selectedTenant={tenant}
              isDisabled={isDisabled}
            />
          )}

          <Checkbox
            label="Show Resources"
            isChecked={showResources}
            onChange={onShowResourcesToggle}
            aria-label="checkbox for showing resources names"
            id="showResourcesCheckbox"
          />

          <Spacer />

          {enableStreaming && (
            <TogglePlay
              isDisabled={isDisabled}
              active={isStreaming}
              onClick={onStreamingToggle}
            />
          )}
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};
