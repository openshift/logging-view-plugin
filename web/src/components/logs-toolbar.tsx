import {
  Alert,
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
import { useTranslation } from 'react-i18next';
import { Severity, severityFromString } from '../severity';
import { TestIds } from '../test-ids';
import { notUndefined } from '../value-utils';
import { ExecuteQueryButton } from './execute-query-button';
import { AttributeFilter } from './filters/attribute-filter';
import { AttributeList, Filters } from './filters/filter.types';
import { LogsQueryInput } from './logs-query-input';
import './logs-toolbar.css';
import { Spacer } from './spacer';
import { TenantDropdown } from './tenant-dropdown';
import { ToggleButton } from './toggle-button';
import { TogglePlay } from './toggle-play';

interface LogsToolbarProps {
  query: string;
  onQueryChange?: (query: string) => void;
  onQueryRun?: () => void;
  invalidQueryErrorMessage?: string | null;
  tenant?: string;
  onTenantSelect?: (tenant: string) => void;
  enableStreaming?: boolean;
  isStreaming?: boolean;
  severityFilter?: Set<Severity>;
  onStreamingToggle?: (e: React.MouseEvent) => void;
  onSeverityChange?: (severityFilter: Set<Severity>) => void;
  onShowResourcesToggle?: (showResources: boolean) => void;
  onShowStatsToggle?: (showStats: boolean) => void;
  showStats?: boolean;
  showResources?: boolean;
  enableTenantDropdown?: boolean;
  isDisabled?: boolean;
  onFiltersChange?: (filters: Filters) => void;
  filters?: Filters;
  attributeList?: AttributeList;
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
  invalidQueryErrorMessage,
  tenant = 'application',
  onTenantSelect,
  onStreamingToggle,
  onShowResourcesToggle,
  showResources = false,
  onShowStatsToggle,
  showStats = false,
  enableStreaming = false,
  isStreaming = false,
  enableTenantDropdown = true,
  isDisabled = false,
  filters,
  onFiltersChange,
  attributeList,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [isSeverityExpanded, setIsSeverityExpanded] = React.useState(false);
  const [isQueryShown, setIsQueryShown] = React.useState(false);
  const severityFilter: Set<Severity> = filters?.severity
    ? new Set(Array.from(filters?.severity).map(severityFromString).filter(notUndefined))
    : new Set();

  const onDeleteSeverityFilter = (
    _category: string | ToolbarChipGroup,
    chip: string | ToolbarChip,
  ) => {
    severityFilter.delete(chip.toString() as Severity);
    const newFilters = { ...(filters ?? {}), severity: severityFilter };
    onFiltersChange?.(newFilters);
  };

  const handleClearAllFilters = () => {
    onFiltersChange?.({});
  };

  const onDeleteSeverityGroup = () => {
    onFiltersChange?.({ ...(filters ?? {}), severity: undefined });
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

    onFiltersChange?.({
      ...(filters ?? {}),
      severity: new Set(severityFilter),
    });
  };

  const severityFilterArray = Array.from(severityFilter);

  return (
    <Toolbar isSticky clearAllFilters={handleClearAllFilters} className="co-logs-toolbar">
      <ToolbarContent>
        {attributeList && (
          <AttributeFilter
            attributeList={attributeList}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        )}
        <ToolbarGroup>
          <ToolbarFilter
            chips={severityFilterArray}
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
              selections={severityFilterArray}
              isOpen={isSeverityExpanded}
              placeholderText="Severity"
              isDisabled={isDisabled}
            >
              {availableSeverityFilters.map((severity) => (
                <SelectOption key={severity} value={severity} />
              ))}
            </Select>
          </ToolbarFilter>
        </ToolbarGroup>

        {enableTenantDropdown && (
          <ToolbarGroup>
            <TenantDropdown
              onTenantSelected={onTenantSelect}
              selectedTenant={tenant}
              isDisabled={isDisabled}
            />
          </ToolbarGroup>
        )}

        <ToolbarGroup>
          <ToggleButton
            isToggled={showResources}
            onToggle={onShowResourcesToggle}
            untoggledText={t('Show Resources')}
            toggledText={t('Hide Resources')}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          <ToggleButton
            isToggled={showStats}
            onToggle={onShowStatsToggle}
            untoggledText={t('Show Stats')}
            toggledText={t('Hide Stats')}
          />
        </ToolbarGroup>

        {!isQueryShown && (
          <>
            <ToolbarGroup>
              <ExecuteQueryButton onClick={onQueryRun} isDisabled={isDisabled} />
            </ToolbarGroup>
            {invalidQueryErrorMessage && (
              <ToolbarGroup>
                <Alert variant="danger" isInline isPlain title={invalidQueryErrorMessage} />
              </ToolbarGroup>
            )}
          </>
        )}

        <Spacer />

        <ToolbarGroup>
          <ToggleButton
            isToggled={isQueryShown}
            onToggle={setIsQueryShown}
            untoggledText={t('Show Query')}
            toggledText={t('Hide Query')}
            data-test={TestIds.ShowQueryToggle}
          />
        </ToolbarGroup>

        {enableStreaming && (
          <ToolbarGroup>
            <TogglePlay isDisabled={isDisabled} active={isStreaming} onClick={onStreamingToggle} />
          </ToolbarGroup>
        )}
      </ToolbarContent>

      {isQueryShown && (
        <LogsQueryInput
          value={query}
          onRun={onQueryRun}
          onChange={onQueryChange}
          invalidQueryErrorMessage={invalidQueryErrorMessage}
          isDisabled={isDisabled}
        />
      )}
    </Toolbar>
  );
};
