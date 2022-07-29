import { TestIds } from '../../src/test-ids';
import { queryRangeStreamsvalidResponse } from '../fixtures/query-range-fixtures';

const LOGS_DETAIL_PAGE_URL = '/k8s/ns/default/pods/test-pod-name';
const QUERY_RANGE_STREAMS_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range?query=%7B*';
const TEST_MESSAGE = "loki_1 | level=info msg='test log'";

describe('Logs Detail Page', () => {
  it('executes a query when "run query" is pressed', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsvalidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');

    cy.visit(LOGS_DETAIL_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
  });

  it('executes a query with a new value when "Enter" is pressed on the query input field', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsvalidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');

    cy.visit(LOGS_DETAIL_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(TEST_MESSAGE);
      });

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('input')
        .type('{selectAll}')
        .type('{ job = "some_job" }', {
          parseSpecialCharSequences: false,
          delay: 1,
        })
        .type('{enter}');
    });

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
  });

  it('executes a query when severity is changed', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsvalidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');

    cy.visit(LOGS_DETAIL_PAGE_URL);

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

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 2);
  });
});
