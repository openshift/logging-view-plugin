import { Attribute, Filters } from './filter.types';

/**
 * While options are only partially loaded, a filter value may be selected even though its
 * option has not arrived yet. Selections are derived from the listed options, so expanding
 * them would silently drop those unlisted filter values. This keeps the filter values that
 * are not accounted for by the currently listed selections.
 */
export const preserveUnlistedSelections = ({
  filters,
  expandSelection,
  listedSelections,
  expandedSelections,
}: {
  filters: Filters;
  expandSelection: NonNullable<Attribute['expandSelection']>;
  listedSelections: Iterable<string>;
  expandedSelections: Map<string, Set<string>>;
}): Map<string, Set<string>> => {
  const listedExpanded = expandSelection(new Set(listedSelections));
  const result = new Map<string, Set<string>>();

  for (const [key, values] of expandedSelections) {
    const merged = new Set(values);
    const listed = listedExpanded.get(key);
    for (const filterValue of filters[key] ?? []) {
      if (!listed?.has(filterValue)) {
        merged.add(filterValue);
      }
    }
    result.set(key, merged);
  }

  return result;
};
