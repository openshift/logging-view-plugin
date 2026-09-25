import { LabelMatcher, LogQLQuery } from '../logql-query';
import { ResourceLabel, ResourceToStreamLabels } from '../parse-resources';

export type ForbiddenKind = 'none' | 'namespace-selected' | 'no-namespace';

// Both schemas' namespace labels: a custom query may use either, regardless of
// the plugin's selected schema.
const NAMESPACE_LABELS = [
  ResourceToStreamLabels[ResourceLabel.Namespace].otel,
  ResourceToStreamLabels[ResourceLabel.Namespace].viaq,
];

const isNamespaceMatcher = (matcher: LabelMatcher): boolean =>
  matcher.label !== undefined &&
  NAMESPACE_LABELS.includes(matcher.label) &&
  matcher.value !== undefined &&
  matcher.value.replace(/["']/g, '').trim() !== '';

/**
 * Reports whether a LogQL query scopes results to a namespace, so the forbidden
 * state reflects the query that actually ran rather than the pending filter
 * selection. Reads namespace labels directly from the stream selector
 * or a pipeline label filter, so any namespace scope counts even when it uses
 * the other schema's label or targets a namespace that does not exist.
 */
export const queryHasNamespaceFilter = (query: string | undefined): boolean => {
  if (!query) {
    return false;
  }

  const parsedQuery = new LogQLQuery(query);

  return (
    parsedQuery.streamSelector.some(isNamespaceMatcher) ||
    parsedQuery.pipeline.some((stage) => stage.labelsInFilter?.some(isNamespaceMatcher) ?? false)
  );
};

/**
 * Classifies a 403 for the logs views. Without a namespace scope it is
 * not a genuine failure — an admin lacking cluster-wide access hits the unscoped
 * query and just needs to scope to a namespace they can read, so we prompt to
 * select one. With a namespace scope it is a real permission failure for that
 * namespace and keeps the forbidden error.
 */
export const getForbiddenKind = (
  status: number | undefined,
  hasNamespaceFilter: boolean | undefined,
): ForbiddenKind => {
  if (status !== 403) {
    return 'none';
  }

  return hasNamespaceFilter ? 'namespace-selected' : 'no-namespace';
};
