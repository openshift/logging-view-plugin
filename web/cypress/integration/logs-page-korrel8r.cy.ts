import { TestIds } from '../../src/test-ids';
import {
  queryRangeMatrixValidResponse,
  queryRangeStreamsValidResponse,
} from '../fixtures/query-range-fixtures';

const LOGS_PAGE_URL = '/monitoring/logs';
const QUERY_RANGE_STREAMS_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range?query=%7B*';
const KORREL8R_URL = '/api/proxy/plugin/logging-view-plugin/korrel8r/api/v1alpha1/domains';
const KORREL8R_GOALS_URL =
  '/api/proxy/plugin/logging-view-plugin/korrel8r/api/v1alpha1/lists/goals';
const QUERY_RANGE_MATRIX_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range?query=sum*';
const TEST_MESSAGE = "loki_1 | level=info msg='test log'";

describe('Logs Page - korrel8r', () => {
  it('adds the correlation column only if korrel8r is reachable', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    );
    cy.intercept(KORREL8R_URL, (req) => {
      req.continue((res) => res.send({ statusCode: 200, body: '[]' }));
    });
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
        cy.contains('Correlation');
      });
  });

  it('does not add the correlation column if korrel8r is unreachable', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    );
    cy.intercept(KORREL8R_URL, (req) => {
      req.continue((res) => res.send({ statusCode: 404 }));
    });
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
        cy.contains('Correlation').should('not.exist');
      });
  });

  it('if no correlation is found when clicking the "Metrics" link a message is displayed', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({
        message: TEST_MESSAGE,
        labels: { log_type: 'application', kubernetes_pod_name: 'loki-pod' },
      }),
    );
    cy.intercept(KORREL8R_URL, (req) => {
      req.continue((res) => res.send({ statusCode: 200, body: '[]' }));
    });
    cy.intercept(KORREL8R_GOALS_URL, (req) => {
      req.continue((res) => res.send({ statusCode: 200, body: '[]' }));
    });
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains('Correlation');
        cy.contains('Metrics').first().click({ force: true });
        cy.contains('No correlation found');
      });
  });

  it('if log entries do not have the required attributes to correlate the "Metrics" link is not displayed', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({
        message: TEST_MESSAGE,
        labels: { label: 'not-useful-for-korrel8r' },
      }),
    );
    cy.intercept(KORREL8R_URL, (req) => {
      req.continue((res) => res.send({ statusCode: 200, body: '[]' }));
    });
    cy.intercept(KORREL8R_GOALS_URL, (req) => {
      req.continue((res) => res.send({ statusCode: 200, body: '[]' }));
    });
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains('Correlation');
        cy.contains('Metrics').should('not.exist');
      });
  });
});
