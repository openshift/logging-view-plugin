import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { filtersFromQuery } from '../attribute-filters';
import { AttributeList, Filters } from '../components/filters/filter.types';
import { Direction, TimeRange } from '../logs.types';
import { intervalFromTimeRange } from '../time-range';
import { useQueryParams } from './useQueryParams';

interface UseURLStateHook {
  defaultQuery?: string;
  defaultTenant?: string;
  attributes: AttributeList;
}

const QUERY_PARAM_KEY = 'q';
const TIME_RANGE_START = 'start';
const TIME_RANGE_END = 'end';
const DIRECTION = 'direction';
const TENANT_PARAM_KEY = 'tenant';
const SHOW_RESOURCES_PARAM_KEY = 'showResources';
const SHOW_STATS_PARAM_KEY = 'showStats';

const DEFAULT_TENANT = 'application';
const DEFAULT_SHOW_RESOURCES = '0';
const DEFAULT_SHOW_STATS = '0';
export const defaultQueryFromTenant = (tenant: string = DEFAULT_TENANT) =>
  `{ log_type="${tenant}" } | json`;

const getDirectionValue = (value?: string | null): Direction =>
  value !== null ? (value === 'forward' ? 'forward' : 'backward') : 'backward';

export const useURLState = ({
  defaultQuery,
  defaultTenant = DEFAULT_TENANT,
  attributes,
}: UseURLStateHook) => {
  const queryParams = useQueryParams();
  const history = useHistory();
  const location = useLocation();

  const initialTenant = queryParams.get(TENANT_PARAM_KEY) ?? defaultTenant;
  const initialQuery =
    queryParams.get(QUERY_PARAM_KEY) ?? defaultQuery ?? defaultQueryFromTenant(initialTenant);
  const initialTimeRangeStart = queryParams.get(TIME_RANGE_START);
  const initialTimeRangeEnd = queryParams.get(TIME_RANGE_END);
  const initialDirection = queryParams.get(DIRECTION);
  const initialResorcesShown =
    (queryParams.get(SHOW_RESOURCES_PARAM_KEY) ?? DEFAULT_SHOW_RESOURCES) === '1';

  const intitalStatsShown = (queryParams.get(SHOW_STATS_PARAM_KEY) ?? DEFAULT_SHOW_STATS) === '1';

  const [query, setQuery] = React.useState(initialQuery);
  const [tenant, setTenant] = React.useState(initialTenant);
  const [filters, setFilters] = React.useState<Filters | undefined>(
    filtersFromQuery({ query: initialQuery, attributes }),
  );
  const [areResourcesShown, setAreResourcesShown] = React.useState<boolean>(initialResorcesShown);
  const [areStatsShown, setAreStatsShown] = React.useState<boolean>(intitalStatsShown);
  const [direction, setDirection] = React.useState<Direction>(getDirectionValue(initialDirection));
  const [timeRange, setTimeRange] = React.useState<TimeRange | undefined>(
    initialTimeRangeStart && initialTimeRangeEnd
      ? {
          start: initialTimeRangeStart,
          end: initialTimeRangeEnd,
        }
      : undefined,
  );

  const setTenantInURL = (selectedTenant: string) => {
    queryParams.set(TENANT_PARAM_KEY, selectedTenant);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setShowResourcesInURL = (showResources: boolean) => {
    queryParams.set(SHOW_RESOURCES_PARAM_KEY, showResources ? '1' : '0');
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setShowStatsInURL = (showStats: boolean) => {
    queryParams.set(SHOW_STATS_PARAM_KEY, showStats ? '1' : '0');
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setQueryInURL = (newQuery: string) => {
    const trimmedQuery = newQuery.trim();
    queryParams.set(QUERY_PARAM_KEY, trimmedQuery);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setTimeRangeInURL = (selectedTimeRange: TimeRange) => {
    queryParams.set(TIME_RANGE_START, String(selectedTimeRange.start));
    queryParams.set(TIME_RANGE_END, String(selectedTimeRange.end));
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setDirectionInURL = (selectedDirection?: 'forward' | 'backward') => {
    if (selectedDirection) {
      queryParams.set(DIRECTION, selectedDirection);
    } else {
      queryParams.delete(DIRECTION);
    }
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  React.useEffect(() => {
    const queryValue = queryParams.get(QUERY_PARAM_KEY) ?? initialQuery;
    const tenantValue = queryParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;
    const showResourcesValue = queryParams.get(SHOW_RESOURCES_PARAM_KEY) ?? DEFAULT_SHOW_RESOURCES;
    const showStatsValue = queryParams.get(SHOW_STATS_PARAM_KEY) ?? DEFAULT_SHOW_STATS;
    const timeRangeStartValue = queryParams.get(TIME_RANGE_START);
    const timeRangeEndValue = queryParams.get(TIME_RANGE_END);
    const directionValue = queryParams.get(DIRECTION);

    setQuery(queryValue.trim());
    setTenant(tenantValue);
    setDirection(getDirectionValue(directionValue));
    setAreResourcesShown(showResourcesValue === '1');
    setAreStatsShown(showStatsValue === '1');
    setFilters(filtersFromQuery({ query: queryValue, attributes }));
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
  }, [queryParams]);

  return {
    query,
    setQueryInURL,
    tenant,
    setTenantInURL,
    areResourcesShown,
    setShowResourcesInURL,
    areStatsShown,
    setShowStatsInURL,
    filters,
    setFilters,
    timeRange,
    setTimeRangeInURL,
    setDirectionInURL,
    direction,
    interval: timeRange ? intervalFromTimeRange(timeRange) : undefined,
  };
};
