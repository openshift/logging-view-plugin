import { preserveUnlistedSelections } from '../components/filters/preserve-unlisted-selections';

// Mirrors the container attribute's expandSelection ("pod / container" values)
const expandSelection = (selections: Set<string>) => {
  const pods = new Set<string>();
  const containers = new Set<string>();
  for (const value of selections) {
    const [pod, container] = value.split(' / ');
    pods.add(pod);
    containers.add(container);
  }
  return new Map([
    ['pod', pods],
    ['container', containers],
  ]);
};

describe('preserveUnlistedSelections', () => {
  it('keeps a selected filter whose option has not arrived when selecting another option', () => {
    const result = preserveUnlistedSelections({
      filters: { pod: new Set(['pod-b']), container: new Set(['c2']) },
      expandSelection,
      listedSelections: [],
      expandedSelections: expandSelection(new Set(['pod-a / c1'])),
    });

    expect(result.get('pod')).toEqual(new Set(['pod-a', 'pod-b']));
    expect(result.get('container')).toEqual(new Set(['c1', 'c2']));
  });

  it('removes a deselected listed option while keeping unlisted filters', () => {
    const result = preserveUnlistedSelections({
      filters: { pod: new Set(['pod-a', 'pod-b']), container: new Set(['c1', 'c2']) },
      expandSelection,
      listedSelections: ['pod-a / c1'],
      expandedSelections: expandSelection(new Set()),
    });

    expect(result.get('pod')).toEqual(new Set(['pod-b']));
    expect(result.get('container')).toEqual(new Set(['c2']));
  });

  it('returns the expanded selections unchanged when all filters are listed', () => {
    const result = preserveUnlistedSelections({
      filters: { pod: new Set(['pod-a']), container: new Set(['c1']) },
      expandSelection,
      listedSelections: ['pod-a / c1'],
      expandedSelections: expandSelection(new Set(['pod-a / c1', 'pod-c / c3'])),
    });

    expect(result.get('pod')).toEqual(new Set(['pod-a', 'pod-c']));
    expect(result.get('container')).toEqual(new Set(['c1', 'c3']));
  });
});
