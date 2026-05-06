import {
  Alert,
  Badge,
  Button,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarLabel,
  ToolbarLabelGroup,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { useLogsConfig } from '../hooks/LogsConfigProvider';
import { Schema, SchemaConfig } from '../logs.types';
import { Severity, severityFromString } from '../severity';
import { TestIds } from '../test-ids';
import { notUndefined } from '../value-utils';
import { ExecuteQueryButton } from './execute-query-button';
import { ExecuteVolumeButton } from './execute-volume-button';
import { AttributeFilter } from './filters/attribute-filter';
import { AttributeList, Filters } from './filters/filter.types';
import { isOption } from './filters/filters-from-params';
import { LogsQueryInput } from './logs-query-input';
import './logs-toolbar.css';
import { SchemaDropdown } from './schema-dropdown';
import { Spacer } from './spacer';
import { TenantDropdown } from './tenant-dropdown';
import { ToggleButton } from './toggle-button';
import { TogglePlay } from './toggle-play';
import {
  CSSProperties,
  FC,
  MouseEvent as ReactMouseEvent,
  Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface LogsToolbarProps {
  query: string;
  onQueryChange?: (query: string) => void;
  onQueryRun?: () => void;
  onVolumeRun?: () => void;
  invalidQueryErrorMessage?: string | null;
  tenant?: string;
  onTenantSelect?: (tenant: string) => void;
  onSchemaSelect?: (schema: Schema) => void;
  enableStreaming?: boolean;
  isStreaming?: boolean;
  severityFilter?: Set<Severity>;
  onStreamingToggle?: (e: ReactMouseEvent) => void;
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
  onDownloadCSV?: () => void;
  schema: Schema;
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

export const LogsToolbar: FC<LogsToolbarProps> = ({
  query,
  onQueryChange,
  onQueryRun,
  onVolumeRun,
  invalidQueryErrorMessage,
  tenant = 'application',
  onTenantSelect,
  onSchemaSelect,
  onStreamingToggle,
  onShowResourcesToggle,
  onDownloadCSV,
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
  schema,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [isSeverityExpanded, setIsSeverityExpanded] = useState(false);
  const [isQueryShown, setIsQueryShown] = useState(false);
  const [isSchemaShown, setIsSchemaShown] = useState(false);

  const { config } = useLogsConfig();

  const severitySelectRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (isSeverityExpanded && !severitySelectRef.current?.contains(event.target as Node)) {
        setIsSeverityExpanded(false);
      }
    },
    [isSeverityExpanded, setIsSeverityExpanded],
  );

  useEffect(() => {
    if (isSeverityExpanded) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isSeverityExpanded, handleClickOutside]);

  useEffect(() => {
    if (config?.schema === SchemaConfig.select) {
      setIsSchemaShown(true);
    }
  }, [config?.schema]);

  const severityFilter: Set<Severity> = filters?.severity
    ? new Set(Array.from(filters?.severity).map(severityFromString).filter(notUndefined))
    : new Set();

  const onDeleteSeverityFilter = (
    _category: string | ToolbarLabelGroup,
    chip: string | ToolbarLabel,
  ) => {
    const newSeverityFilters = new Set(severityFilter);
    newSeverityFilters.delete(chip.toString() as Severity);
    const newFilters = { ...(filters ?? {}), severity: newSeverityFilters };
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
    _: ReactMouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    const severityValue = (isOption(value) ? value.value : String(value)) as Severity;
    const newSeverityFilters = new Set(severityFilter);

    if (newSeverityFilters.has(severityValue)) {
      newSeverityFilters.delete(severityValue);
    } else {
      newSeverityFilters.add(severityValue);
    }

    onFiltersChange?.({
      ...(filters ?? {}),
      severity: newSeverityFilters,
    });
  };

  const severityFilterArray = Array.from(severityFilter);

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      isDisabled={isDisabled}
      ref={toggleRef}
      onClick={onSeverityToggle}
      isExpanded={isSeverityExpanded}
      style={
        {
          width: '200px',
        } as CSSProperties
      }
    >
      {t('Severity')}
      {severityFilterArray.length > 0 && <Badge isRead>{severityFilterArray.length}</Badge>}
    </MenuToggle>
  );

  return (
    <Toolbar isSticky clearAllFilters={handleClearAllFilters} className="lv-plugin__toolbar">
      <ToolbarContent>
        {attributeList && (
          <AttributeFilter
            attributeList={attributeList}
            filters={filters}
            onFiltersChange={onFiltersChange}
            tenant={tenant}
          />
        )}

        <ToolbarGroup>
          <ToolbarFilter
            labels={severityFilterArray}
            deleteLabel={onDeleteSeverityFilter}
            deleteLabelGroup={onDeleteSeverityGroup}
            categoryName="Severity"
            className="lv-plugin__severity-filter"
            data-test={TestIds.SeverityDropdown}
          >
            <div ref={severitySelectRef}>
              <Select
                selected={severityFilterArray}
                onSelect={onSeveritySelect}
                isOpen={isSeverityExpanded}
                onOpenChange={setIsSeverityExpanded}
                toggle={toggle}
                aria-label="Severity"
              >
                <SelectList>
                  {availableSeverityFilters.map((severity) => (
                    <SelectOption
                      key={severity}
                      value={severity}
                      hasCheckbox={true}
                      isSelected={severityFilterArray.includes(severity)}
                    >
                      {severity}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </div>
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

        {isSchemaShown && (
          <ToolbarGroup>
            <SchemaDropdown onSchemaSelected={onSchemaSelect} schema={schema} />
          </ToolbarGroup>
        )}

        <ToolbarGroup>
          <ToggleButton
            isToggled={showResources}
            onToggle={onShowResourcesToggle}
            untoggledText={t('Show Resources')}
            toggledText={t('Hide Resources')}
          />

          <ToggleButton
            isToggled={showStats}
            onToggle={onShowStatsToggle}
            untoggledText={t('Show Stats')}
            toggledText={t('Hide Stats')}
            data-test={TestIds.ShowStatsToggle}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          {onDownloadCSV && (
            <ToolbarGroup>
              <Button variant="secondary" isInline onClick={onDownloadCSV}>
                {t('Export as CSV')}
              </Button>
            </ToolbarGroup>
          )}

          <ToolbarGroup>
            <ExecuteVolumeButton onClick={onVolumeRun} isDisabled={isDisabled} />
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
          tenant={tenant}
        />
      )}
    </Toolbar>
  );
};
