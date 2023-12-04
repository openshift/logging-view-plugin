import { TestIds } from '../../src/test-ids';
import {
  queryRangeMatrixEmptyResponse,
  queryRangeMatrixInvalidResponse,
  queryRangeMatrixValidResponse,
} from '../fixtures/query-range-fixtures';

const LOGS_ALERTS_PAGE_URL = '/monitoring/alerts/test-alert';
const QUERY_RANGE_MATRIX_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range?query=sum*';
const KORREL8R_GOALS_URL =
  '/api/proxy/plugin/logging-view-plugin/korrel8r/api/v1alpha1/lists/goals';

describe('Alerts logs metrics', () => {
  it('renders correctly with an expected response', () => {
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_ALERTS_PAGE_URL);

    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');

    cy.getByTestId(TestIds.LogsMetrics)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  it('handles errors gracefully when a request fails', () => {
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, (req) => {
      req.continue((res) => res.send({ statusCode: 500, body: 'Internal Server Error' }));
    });

    cy.visit(LOGS_ALERTS_PAGE_URL);

    cy.getByTestId(TestIds.LogsMetrics)
      .should('exist')
      .within(() => {
        cy.contains('Internal Server Error');
      });
  });

  it('handles errors gracefully when a response is invalid', () => {
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixInvalidResponse());

    cy.visit(LOGS_ALERTS_PAGE_URL);

    cy.getByTestId(TestIds.LogsMetrics)
      .should('exist')
      .within(() => {
        cy.contains('Unexpected end of JSON input');
      });
  });

  it('handles errors gracefully when a response is empty', () => {
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixEmptyResponse());

    cy.visit(LOGS_ALERTS_PAGE_URL);

    cy.getByTestId(TestIds.LogsMetrics)
      .should('exist')
      .within(() => {
        cy.contains('No datapoints found');
      });
  });

  it('executes a new query when a new time range is selected', () => {
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_ALERTS_PAGE_URL);

    cy.getByTestId(TestIds.TimeRangeDropdown).within(() => {
      cy.contains('Last 1 hour').click();
      cy.contains('Last 6 hours').click();
    });

    cy.wait(200);

    cy.get('@queryRangeMatrix.all').should('have.length.at.least', 2);
  });

  it('loads a link to correlated logs when a correlation is found', () => {
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );
    cy.intercept(KORREL8R_GOALS_URL, (req) => {
      req.continue((res) =>
        res.send({
          statusCode: 200,
          body: JSON.stringify([
            {
              class: 'log:application',
              queries: [{ count: 1, query: `log:application:{namespace="test"}` }],
            },
          ]),
        }),
      );
    });

    cy.visit(LOGS_ALERTS_PAGE_URL);

    // The link contains a query from korrel8r that includes a JSON pipeline stage
    cy.contains('See related logs')
      .first()
      .should(
        'have.attr',
        'href',
        '/monitoring/logs?q=%7B+namespace%3D%22test%22+%7D+%7C+json&tenant=application',
      );
  });

  it('does not display a link to correlated logs when a correlation is not found', () => {
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );
    cy.intercept(KORREL8R_GOALS_URL, (req) => {
      req.continue((res) =>
        res.send({
          statusCode: 200,
          body: JSON.stringify([]),
        }),
      );
    });

    cy.visit(LOGS_ALERTS_PAGE_URL);

    cy.contains('See related logs').should('not.exist');
  });
});
