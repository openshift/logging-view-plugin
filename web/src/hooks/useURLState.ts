import React, { DependencyList, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { filtersFromQuery, queryFromFilters } from '../attribute-filters';
import { AttributeList, Filters } from '../components/filters/filter.types';
import { getBrowserTimezone } from '../date-utils';
import { Config, Direction, Schema, SchemaConfig, TimeRange } from '../logs.types';
import { ResourceLabel, ResourceToStreamLabels } from '../parse-resources';
import { intervalFromTimeRange } from '../time-range';
import { getSchema } from '../value-utils';
import { useLogsConfig } from './LogsConfigProvider';
import { useQueryParams } from './useQueryParams';

interface UseURLStateHook {
  defaultTenant?: string;
  getDefaultQuery?({ tenant, schema }: { tenant: string; schema: Schema }): string;
  getAttributes?: ({
    tenant,
    config,
    schema,
  }: {
    tenant: string;
    config: Config;
    schema: Schema;
  }) => AttributeList | undefined;
  attributesDependencies?: DependencyList;
}

const QUERY_PARAM_KEY = 'q';
const TIME_RANGE_START = 'start';
const TIME_RANGE_END = 'end';
const DIRECTION = 'direction';
const TENANT_PARAM_KEY = 'tenant';
const SCHEMA_PARAM_KEY = 'schema';
const SHOW_RESOURCES_PARAM_KEY = 'showResources';
const SHOW_STATS_PARAM_KEY = 'showStats';
const TIMEZONE_PARAM_KEY = 'tz';
const STORED_TIMEZONE_KEY = 'logging-view-plugin/timezone';

export const DEFAULT_TENANT = 'application';
const DEFAULT_SHOW_RESOURCES = '0';
const DEFAULT_SHOW_STATS = '0';

export const defaultQueryFromTenant = ({
  tenant = DEFAULT_TENANT,
  schema,
}: {
  tenant?: string;
  schema: Schema;
}) => {
  const logType = ResourceToStreamLabels[ResourceLabel.LogType];
  if (schema === Schema.otel) {
    return `{ ${logType.otel}="${tenant}" }`;
  }
  return `{ ${logType.viaq}="${tenant}" } | json`;
};

const getDirectionValue = (value?: string | null): Direction =>
  value !== null ? (value === 'forward' ? 'forward' : 'backward') : 'backward';

export const useURLState = ({
  defaultTenant = DEFAULT_TENANT,
  getDefaultQuery,
  getAttributes,
  attributesDependencies,
}: UseURLStateHook) => {
  const queryParams = useQueryParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { config, configLoaded } = useLogsConfig();

  const initialTenant = queryParams.get(TENANT_PARAM_KEY) ?? defaultTenant;
  const initialSchema: Schema = getSchema(queryParams.get(SCHEMA_PARAM_KEY) ?? config?.schema);

  const initialQuery =
    queryParams.get(QUERY_PARAM_KEY) ??
    getDefaultQuery?.({ tenant: initialTenant, schema: initialSchema }) ??
    defaultQueryFromTenant({ tenant: initialTenant, schema: initialSchema });

  const initialTimeRangeStart = queryParams.get(TIME_RANGE_START);
  const initialTimeRangeEnd = queryParams.get(TIME_RANGE_END);
  const initialDirection = queryParams.get(DIRECTION);
  const initialResorcesShown =
    (queryParams.get(SHOW_RESOURCES_PARAM_KEY) ?? DEFAULT_SHOW_RESOURCES) === '1';

  const intitalStatsShown = (queryParams.get(SHOW_STATS_PARAM_KEY) ?? DEFAULT_SHOW_STATS) === '1';

  // Timezone: URL param takes precedence over localStorage,
  // which takes precedence over browser default
  const getStoredTimezone = (): string | null => {
    try {
      const stored = window.localStorage.getItem(STORED_TIMEZONE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };
  const initialTimezone =
    queryParams.get(TIMEZONE_PARAM_KEY) ?? getStoredTimezone() ?? getBrowserTimezone();

  const [query, setQuery] = React.useState(initialQuery);
  const [tenant, setTenant] = React.useState(initialTenant);
  const [schema, setSchema] = React.useState(initialSchema);
  const attributes = React.useMemo<AttributeList>(
    () => (getAttributes ? getAttributes({ tenant, config, schema }) ?? [] : []),
    [tenant, config, schema, ...(attributesDependencies || [])],
  );
  const [filters, setFilters] = React.useState<Filters | undefined>(
    filtersFromQuery({ query: initialQuery, attributes, schema }),
  );

  const [areResourcesShown, setAreResourcesShown] = React.useState<boolean>(initialResorcesShown);
  const [areStatsShown, setAreStatsShown] = React.useState<boolean>(intitalStatsShown);
  const [direction, setDirection] = React.useState<Direction>(getDirectionValue(initialDirection));
  const [timezone, setTimezone] = React.useState<string>(initialTimezone);
  const [timeRange, setTimeRange] = React.useState<TimeRange | undefined>(
    initialTimeRangeStart && initialTimeRangeEnd
      ? {
          start: initialTimeRangeStart,
          end: initialTimeRangeEnd,
        }
      : undefined,
  );

  const setQueryInURL = (newQuery: string, replace?: boolean) => {
    const trimmedQuery = newQuery.trim();
    queryParams.set(QUERY_PARAM_KEY, trimmedQuery);
    navigate(
      `${location.pathname}?${queryParams.toString()}`,
      replace ? { replace: true } : undefined,
    );
  };

  const setTenantInURL = (selectedTenant: string) => {
    queryParams.set(QUERY_PARAM_KEY, ''); // reset query when changing tenant
    queryParams.set(TENANT_PARAM_KEY, selectedTenant);
    navigate(`${location.pathname}?${queryParams.toString()}`);
  };

  const setSchemaInURL = (selectedSchema: Schema) => {
    if (selectedSchema) {
      queryParams.set(SCHEMA_PARAM_KEY, selectedSchema as string);

      // re create query based on current filters and new schema
      const newQuery = queryFromFilters({
        existingQuery: '',
        filters,
        attributes,
        tenant,
        schema: selectedSchema,
        addJSONParser: true,
      });
      queryParams.set(QUERY_PARAM_KEY, newQuery);

      navigate(`${location.pathname}?${queryParams.toString()}`);
    } else {
      queryParams.delete(SCHEMA_PARAM_KEY);
      navigate(`${location.pathname}?${queryParams.toString()}`);
    }
  };

  const setShowResourcesInURL = (showResources: boolean) => {
    queryParams.set(SHOW_RESOURCES_PARAM_KEY, showResources ? '1' : '0');
    navigate(`${location.pathname}?${queryParams.toString()}`);
  };

  const setShowStatsInURL = (showStats: boolean) => {
    queryParams.set(SHOW_STATS_PARAM_KEY, showStats ? '1' : '0');
    navigate(`${location.pathname}?${queryParams.toString()}`);
  };

  const setTimeRangeInURL = (selectedTimeRange: TimeRange) => {
    queryParams.set(TIME_RANGE_START, String(selectedTimeRange.start));
    queryParams.set(TIME_RANGE_END, String(selectedTimeRange.end));
    navigate(`${location.pathname}?${queryParams.toString()}`);
  };

  const setDirectionInURL = (selectedDirection?: 'forward' | 'backward') => {
    if (selectedDirection) {
      queryParams.set(DIRECTION, selectedDirection);
    } else {
      queryParams.delete(DIRECTION);
    }
    navigate(`${location.pathname}?${queryParams.toString()}`);
  };

  const setTimezoneInURL = (selectedTimezone: string) => {
    queryParams.set(TIMEZONE_PARAM_KEY, selectedTimezone);
    navigate(`${location.pathname}?${queryParams.toString()}`);
    // Also persist to localStorage
    try {
      window.localStorage.setItem(STORED_TIMEZONE_KEY, JSON.stringify(selectedTimezone));
    } catch {
      // Ignore localStorage errors
    }
  };

  useEffect(() => {
    if (config?.schema != SchemaConfig.select) {
      const queryFromParams = queryParams.get(QUERY_PARAM_KEY);

      const queryInNewSchema =
        getDefaultQuery?.({ tenant: initialTenant, schema: initialSchema }) ??
        defaultQueryFromTenant({ tenant: initialTenant, schema: initialSchema });

      if (!queryFromParams) {
        setQueryInURL(queryInNewSchema, true);
      } else {
        // only replace the current query if its the default query
        const defaultOtelQuery =
          getDefaultQuery?.({ tenant: initialTenant, schema: Schema.otel }) ??
          defaultQueryFromTenant({ tenant: initialTenant, schema: Schema.otel });

        const defaultViaqQuery =
          getDefaultQuery?.({ tenant: initialTenant, schema: Schema.viaq }) ??
          defaultQueryFromTenant({ tenant: initialTenant, schema: Schema.viaq });

        if (queryFromParams == defaultOtelQuery || queryFromParams == defaultViaqQuery) {
          setQueryInURL(queryInNewSchema, true);
        }
      }
    }
  }, [initialSchema, schema, configLoaded]);

  useEffect(() => {
    const schemaValue = getSchema(queryParams.get(SCHEMA_PARAM_KEY) ?? config?.schema);
    const queryValue = queryParams.get(QUERY_PARAM_KEY) ?? initialQuery;
    const tenantValue = queryParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;
    const showResourcesValue = queryParams.get(SHOW_RESOURCES_PARAM_KEY) ?? DEFAULT_SHOW_RESOURCES;
    const showStatsValue = queryParams.get(SHOW_STATS_PARAM_KEY) ?? DEFAULT_SHOW_STATS;
    const timeRangeStartValue = queryParams.get(TIME_RANGE_START);
    const timeRangeEndValue = queryParams.get(TIME_RANGE_END);
    const directionValue = queryParams.get(DIRECTION);
    const timezoneValue =
      queryParams.get(TIMEZONE_PARAM_KEY) ?? getStoredTimezone() ?? getBrowserTimezone();

    setQuery(queryValue.trim());
    setTenant(tenantValue);
    setSchema(schemaValue);
    setDirection(getDirectionValue(directionValue));
    setTimezone(timezoneValue);
    setAreResourcesShown(showResourcesValue === '1');
    setAreStatsShown(showStatsValue === '1');
    setFilters(
      filtersFromQuery({ query: queryValue, attributes: attributes, schema: schemaValue }),
    );
    setTimeRange((prevTimeRange) => {
      if (!timeRangeStartValue || !timeRangeEndValue) {
        return undefined;
      }

      if (
        prevTimeRange?.start === timeRangeStartValue &&
        prevTimeRange?.end === timeRangeEndValue
      ) {
        return prevTimeRange;
      }

      return {
        start: timeRangeStartValue,
        end: timeRangeEndValue,
      };
    });
  }, [queryParams, attributes, config?.schema]);

  return {
    initialQuery,
    query,
    setQueryInURL,
    tenant,
    setTenantInURL,
    schema,
    setSchemaInURL,
    areResourcesShown,
    setShowResourcesInURL,
    areStatsShown,
    setShowStatsInURL,
    filters,
    setFilters,
    timeRange,
    setTimeRangeInURL,
    setDirectionInURL,
    timezone,
    setTimezoneInURL,
    attributes,
    direction,
    interval: timeRange ? intervalFromTimeRange(timeRange) : undefined,
  };
};
