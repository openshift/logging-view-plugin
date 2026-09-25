import { getForbiddenKind, queryHasNamespaceFilter } from '../components/error-message-utils';

describe('forbidden classification for the admin logs view (OU-578)', () => {
  it('classifies a 403 with no namespace selected as a friendly select-namespace prompt', () => {
    // Admin without cluster-wide access hits the unscoped query; not a genuine
    // failure yet, they just need to scope to a namespace they can read.
    expect(getForbiddenKind(403, false)).toBe('no-namespace');
  });

  it('classifies a 403 with a namespace selected as a genuine forbidden error', () => {
    expect(getForbiddenKind(403, true)).toBe('namespace-selected');
  });

  it('is not a forbidden state for non-403 responses', () => {
    expect(getForbiddenKind(502, false)).toBe('none');
    expect(getForbiddenKind(200, true)).toBe('none');
    expect(getForbiddenKind(undefined, false)).toBe('none');
  });
});

describe('queryHasNamespaceFilter (executed-query namespace scope for OU-578)', () => {
  // Detection is schema-agnostic and value-agnostic: any namespace scope counts,
  // even the other schema's label or a namespace that does not exist.
  it('detects the viaq namespace label', () => {
    expect(
      queryHasNamespaceFilter('{ log_type="application", kubernetes_namespace_name="my-test-1" }'),
    ).toBe(true);
  });

  it('detects the otel namespace label', () => {
    expect(
      queryHasNamespaceFilter(
        '{ openshift_log_type="application", k8s_namespace_name="my-test-1" }',
      ),
    ).toBe(true);
  });

  it('detects a namespace label regardless of the selected schema', () => {
    // otel label while schema is viaq (or vice versa) — previously missed.
    expect(queryHasNamespaceFilter('{ k8s_namespace_name="ghost" }')).toBe(true);
    expect(queryHasNamespaceFilter('{ kubernetes_namespace_name="ghost" }')).toBe(true);
  });

  it('detects a namespace scoped to a non-existent namespace', () => {
    expect(queryHasNamespaceFilter('{ kubernetes_namespace_name="does-not-exist" }')).toBe(true);
  });

  it('detects a namespace expressed as a pipeline label filter', () => {
    expect(
      queryHasNamespaceFilter(
        '{ log_type="application" } | json | kubernetes_namespace_name="ghost"',
      ),
    ).toBe(true);
  });

  it('returns false for an unscoped query (no namespace label)', () => {
    expect(queryHasNamespaceFilter('{ log_type="application" }')).toBe(false);
  });

  it('returns false when the namespace label has an empty value', () => {
    expect(
      queryHasNamespaceFilter('{ log_type="application", kubernetes_namespace_name="" }'),
    ).toBe(false);
  });

  it('returns false for an empty query', () => {
    expect(queryHasNamespaceFilter('')).toBe(false);
  });
});
