import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { filtersFromQuery } from '../attribute-filters';
import { AttributeList, Filters } from '../components/filters/filter.types';
import { Direction, TimeRange } from '../logs.types';
import { intervalFromTimeRange } from '../time-range';
import { useQueryParams } from './useQueryParams';

interface UseURLStateHook {
  defaultQuery?: string;
  attributes: AttributeList;
}

const QUERY_PARAM_KEY = 'q';
const TIME_RANGE_START = 'start';
const TIME_RANGE_END = 'end';
const DIRECTION = 'direction';
const TENANT_PARAM_KEY = 'tenant';
const SHOW_RESOURCES_PARAM_KEY = 'showResources';

const DEFAULT_TENANT = 'application';
const DEFAULT_SHOW_RESOURCES = '0';
export const DEFAULT_QUERY = '{ log_type=~".+" } | json';

const getDirectionValue = (value?: string | null): Direction =>
  value !== null ? (value === 'forward' ? 'forward' : 'backward') : 'backward';

export const useURLState = ({ defaultQuery = DEFAULT_QUERY, attributes }: UseURLStateHook) => {
  const queryParams = useQueryParams();
  const history = useHistory();
  const location = useLocation();

  const initialQuery = queryParams.get(QUERY_PARAM_KEY) ?? defaultQuery;
  const initialTenant = queryParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;
  const initialTimeRangeStart = queryParams.get(TIME_RANGE_START);
  const initialTimeRangeEnd = queryParams.get(TIME_RANGE_END);
  const initialDirection = queryParams.get(DIRECTION);

  const [query, setQuery] = React.useState(initialQuery);
  const [tenant, setTenant] = React.useState(initialTenant);
  const [filters, setFilters] = React.useState<Filters | undefined>({});
  const [areResourcesShown, setAreResourcesShown] = React.useState(false);
  const [direction, setDirection] = React.useState<Direction>(getDirectionValue(initialDirection));
  const [timeRange, setTimeRange] = React.useState<TimeRange | undefined>(
    initialTimeRangeStart && initialTimeRangeEnd
      ? {
          start: initialTimeRangeStart,
          end: initialTimeRangeEnd,
        }
      : undefined,
  );

  const setTenantInURL = (tenant: string) => {
    queryParams.set(TENANT_PARAM_KEY, tenant);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setShowResourcesInURL = (showResources: boolean) => {
    queryParams.set(SHOW_RESOURCES_PARAM_KEY, showResources ? '1' : '0');
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setQueryInURL = (newQuery: string) => {
    const trimmedQuery = newQuery.trim();
    queryParams.set(QUERY_PARAM_KEY, trimmedQuery);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setTimeRangeInURL = (timeRange: TimeRange) => {
    queryParams.set(TIME_RANGE_START, String(timeRange.start));
    queryParams.set(TIME_RANGE_END, String(timeRange.end));
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setDirectionInURL = (direction?: 'forward' | 'backward') => {
    if (direction) {
      queryParams.set(DIRECTION, direction);
    } else {
      queryParams.delete(DIRECTION);
    }
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  React.useEffect(() => {
    const queryValue = queryParams.get(QUERY_PARAM_KEY) ?? initialQuery;
    const tenantValue = queryParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;
    const showResourcesValue = queryParams.get(SHOW_RESOURCES_PARAM_KEY) ?? DEFAULT_SHOW_RESOURCES;
    const timeRangeStartValue = queryParams.get(TIME_RANGE_START);
    const timeRangeEndValue = queryParams.get(TIME_RANGE_END);
    const directionValue = queryParams.get(DIRECTION);

    setQuery(queryValue.trim());
    setTenant(tenantValue);
    setDirection(getDirectionValue(directionValue));
    setAreResourcesShown(showResourcesValue === '1');
    setFilters(filtersFromQuery({ query: queryValue, attributes }));
    setTimeRange(
      timeRangeStartValue && timeRangeEndValue
        ? { start: timeRangeStartValue, end: timeRangeEndValue }
        : undefined,
    );
  }, [queryParams]);

  return {
    query,
    setQueryInURL,
    tenant,
    setTenantInURL,
    areResourcesShown,
    setShowResourcesInURL,
    filters,
    setFilters,
    timeRange,
    setTimeRangeInURL,
    setDirectionInURL,
    direction,
    interval: timeRange ? intervalFromTimeRange(timeRange) : undefined,
  };
};
