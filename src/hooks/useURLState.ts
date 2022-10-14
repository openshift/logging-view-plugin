import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { filtersFromQuery } from '../attribute-filters';
import { AttributeList, Filters } from '../components/filters/filter.types';
import { useQueryParams } from './useQueryParams';

interface UseURLStateHook {
  defaultQuery?: string;
  attributes: AttributeList;
}

const QUERY_PARAM_KEY = 'q';
const TENANT_PARAM_KEY = 'tenant';
const SHOW_RESOURCES_PARAM_KEY = 'showResources';
const DEFAULT_TENANT = 'application';
const DEFAULT_SHOW_RESOURCES = '0';
const DEFAULT_QUERY = '{ log_type =~ ".+" } | json';

export const useURLState = ({ defaultQuery = DEFAULT_QUERY, attributes }: UseURLStateHook) => {
  const queryParams = useQueryParams();
  const history = useHistory();
  const location = useLocation();

  const initialQuery = queryParams.get(QUERY_PARAM_KEY) ?? defaultQuery;
  const initialTenant = queryParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;

  const [query, setQuery] = React.useState(initialQuery);
  const [tenant, setTenant] = React.useState(initialTenant);
  const [filters, setFilters] = React.useState<Filters | undefined>({});
  const [areResourcesShown, setAreResourcesShown] = React.useState(false);

  const setTenantInURL = (tenant: string) => {
    queryParams.set(TENANT_PARAM_KEY, tenant);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setShowResourcesInURL = (showResources: boolean) => {
    queryParams.set(SHOW_RESOURCES_PARAM_KEY, showResources ? '1' : '0');
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setQueryInURL = (newQuery: string) => {
    queryParams.set(QUERY_PARAM_KEY, newQuery);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  React.useEffect(() => {
    const queryValue = queryParams.get(QUERY_PARAM_KEY) ?? initialQuery;
    const tenantValue = queryParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;
    const showResourcesValue = queryParams.get(SHOW_RESOURCES_PARAM_KEY) ?? DEFAULT_SHOW_RESOURCES;

    setQuery(queryValue);
    setTenant(tenantValue);
    setAreResourcesShown(showResourcesValue === '1');
    setFilters(filtersFromQuery({ query: queryValue, attributes }));
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
  };
};
