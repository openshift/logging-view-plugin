import { LogQLQuery } from '../logql-query';

describe('LogQL query', () => {
  it('should parse a logql query', () => {
    [
      { query: '{}', expected: { selectors: [] } },
      { query: '{,}', expected: { selectors: [] } },
      { query: '{foo=bar}', expected: { selectors: ['foo=bar'] } },
      {
        query: '{foo=bar,baz=zad}',
        expected: { selectors: ['foo=bar', 'baz=zad'] },
      },
    ].forEach(({ query, expected }) => {
      const logql = new LogQLQuery(query);
      expect(logql.selectors).toEqual(expected.selectors);
    });
  });

  it('should append a selector', () => {
    [
      { query: '{}', selector: 'foo=var', expected: '{ foo=var }' },
      { query: '', selector: 'foo=var', expected: '{ foo=var }' },
      {
        query: '{foo=var}',
        selector: 'baz~=zad',
        expected: '{ foo=var, baz~=zad }',
      },
      {
        query: '{foo=var}',
        selector: ['baz~=zad', 'bar=baz'],
        expected: '{ foo=var, baz~=zad, bar=baz }',
      },
    ].forEach(({ query, selector, expected }) => {
      const logql = new LogQLQuery(query);
      expect(logql.appendSelector(selector).toString()).toEqual(expected);
    });
  });

  it('should append a pipeline', () => {
    [
      {
        query: '{ foo=var }',
        pipeline: 'json',
        expected: '{ foo=var } | json',
      },
      {
        query: '{ foo=var }| json',
        pipeline: 'level="err|error"',
        expected: '{ foo=var } | json | level="err|error"',
      },
      {
        query: '{ foo=var }',
        pipeline: ['json', 'level="err|error"'],
        expected: '{ foo=var } | json | level="err|error"',
      },
    ].forEach(({ query, pipeline, expected }) => {
      const logql = new LogQLQuery(query);
      expect(logql.appendPipeline(pipeline).toString()).toEqual(expected);
    });
  });
});
