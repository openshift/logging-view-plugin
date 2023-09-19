import { TestIds } from '../../src/test-ids';
import {
  queryRangeMatrixValidResponse,
  queryRangeStreamsValidResponse,
} from '../fixtures/query-range-fixtures';
import { podsListResponse } from '../fixtures/resource-api-fixtures';

const LOGS_DEV_PAGE_URL = '/dev-monitoring/ns/my-namespace/logs';
const QUERY_RANGE_STREAMS_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range?query=%7B*';
const QUERY_RANGE_MATRIX_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range?query=sum*';
const QUERY_RANGE_STREAMS_INFRASTRUCTURE_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/infrastructure/loki/api/v1/query_range?query=%7B*';
const QUERY_RANGE_MATRIX_INFRASTRUCTURE_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/infrastructure/loki/api/v1/query_range?query=sum*';
const TEST_MESSAGE = "loki_1 | level=info msg='test log'";
const RESOURCE_URL_MATCH = 'api/kubernetes/api/v1/**';

describe('Logs Dev Page', () => {
  it('renders correctly with an expected response', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    );
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.RefreshIntervalDropdown).should('exist');
    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');
    cy.getByTestId(TestIds.SyncButton).should('exist');
    cy.getByTestId(TestIds.LogsQueryInput).should('not.exist');

    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).should('exist');
    cy.getByTestId(TestIds.SearchAllNamespacesToggle).should('exist');

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  it('executes a query when "run query" is pressed', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
    cy.get('@queryRangeMatrix.all').should('have.length.at.least', 1);
  });

  it('executes a query with a new value when "Enter" is pressed on the query input field', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.ShowQueryToggle).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type('{ job = "some_job" }', {
          parseSpecialCharSequences: false,
          delay: 1,
        })
        .type('{enter}');
    });

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
    cy.get('@queryRangeMatrix.all').should('have.length.at.least', 1);
  });

  it('executes a query when severity is changed', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.getByTestId(TestIds.SeverityDropdown)
      .click()
      .within(() => {
        cy.contains('warning').click();
      });

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
    cy.get('@queryRangeMatrix.all').should('have.length.at.least', 1);
  });

  it('executes a query including the current namespace', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.wait('@queryRangeStreams').then(({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      expect(query).to.equal(
        '{ log_type="application", kubernetes_namespace_name="my-namespace" } | json',
      );
    });
  });

  it('executes a new query when the current namespace changes', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.wait('@queryRangeStreams').then(({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      expect(query).to.equal(
        '{ log_type="application", kubernetes_namespace_name="my-namespace" } | json',
      );
    });

    cy.getByTestId('namespace-toggle' as TestIds).click();
    cy.getByTestId('namespace-dropdown' as TestIds)
      .contains('my-namespace-two')
      .click();

    cy.wait('@queryRangeStreams').then(({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      expect(query).to.equal(
        '{ log_type="application", kubernetes_namespace_name="my-namespace-two" } | json',
      );
    });
  });

  it('executes a query with infra logs when the current namespace changes', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.intercept(
      QUERY_RANGE_STREAMS_INFRASTRUCTURE_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreamsInfrastructure');
    cy.intercept(QUERY_RANGE_MATRIX_INFRASTRUCTURE_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrixInfrastructure',
    );

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.wait('@queryRangeStreams').then(({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      expect(query).to.equal(
        '{ log_type="application", kubernetes_namespace_name="my-namespace" } | json',
      );
    });

    cy.getByTestId('namespace-toggle' as TestIds).click();
    cy.getByTestId('namespace-dropdown' as TestIds)
      .contains('openshift-cluster-version')
      .click();

    cy.wait('@queryRangeStreamsInfrastructure').then(({ request }) => {
      const url = new URL(request.url);
      const pathname = url.pathname;
      expect(pathname).to.equal(
        '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/infrastructure/loki/api/v1/query_range',
      );
      const query = url.searchParams.get('query');
      expect(query).to.equal(
        '{ log_type="infrastructure", kubernetes_namespace_name="openshift-cluster-version" } | json',
      );
    });
  });

  it('executes a namespace-scoped pods list query when selecting the pods filter', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );
    cy.intercept(RESOURCE_URL_MATCH, podsListResponse).as('resourceQuery');

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.get(`[aria-label="Options menu"]`)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Pods').click({ force: true });
        });
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.contains('Filter by Pods').click({ force: true });
      cy.contains('my-pod').click({ force: true });
    });

    cy.wait('@resourceQuery').then(({ request }) => {
      const url = new URL(request.url);
      expect(url.pathname).to.equal('/api/kubernetes/api/v1/namespaces/my-namespace/pods');
    });
  });

  it('displays an error when there are no permissions over namespace pods', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );
    cy.intercept(RESOURCE_URL_MATCH, {
      statusCode: 403,
      body: 'You are not authorized to list pods in this namespace',
    }).as('resourceQuery');

    cy.visit(LOGS_DEV_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.get(`[aria-label="Options menu"]`)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Pods').click({ force: true });
        });
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.contains('Filter by Pods').click({ force: true });
      cy.contains('You are not authorized to list pods in this namespace');
    });
  });
});
