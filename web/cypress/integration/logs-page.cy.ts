import { TestIds } from '../../src/test-ids';
import {
  queryRangeMatrixInvalidResponse,
  queryRangeMatrixValidResponse,
  queryRangeStreamsErrorResponse,
  queryRangeStreamsInvalidResponse,
  queryRangeStreamsValidResponse,
  queryRangeStreamsWithLineFormatting,
  queryRangeStreamsWithMessage,
} from '../fixtures/query-range-fixtures';
import { namespaceListResponse } from '../fixtures/resource-api-fixtures';
import { formatTimeRange } from '../../src/time-range';
import { configResponse } from '../fixtures/backend-fixtures';

const LOGS_PAGE_URL = '/monitoring/logs';
const QUERY_RANGE_STREAMS_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range?query=%7B*';
const QUERY_RANGE_MATRIX_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range?query=sum*';
const QUERY_RANGE_STREAMS_INFRASTRUCTURE_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/infrastructure/loki/api/v1/query_range?query=%7B*';
const QUERY_RANGE_MATRIX_INFRASTRUCTURE_URL_MATCH =
  '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/infrastructure/loki/api/v1/query_range?query=sum*';
const CONFIG_URL_MATCH = '/api/plugins/logging-view-plugin/config';
const RESOURCE_URL_MATCH = '/api/kubernetes/api/v1/*';
const TEST_MESSAGE = "loki_1 | level=info msg='test log'";

describe('Logs Page', () => {
  it('renders correctly with an expected response', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    );
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.RefreshIntervalDropdown).should('exist');
    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');
    cy.getByTestId(TestIds.SyncButton).should('exist');
    cy.getByTestId(TestIds.LogsQueryInput).should('not.exist');

    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).should('exist');

    cy.getByTestId(TestIds.ShowStatsToggle).click();
    cy.getByTestId(TestIds.LogsStats).click();

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
    
  it('tests if the stats table is enabled and is viewable', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ShowStatsToggle).click();
    cy.getByTestId(TestIds.LogsStats).should('exist');

    cy.getByTestId(TestIds.ShowStatsToggle).click();
    cy.getByTestId(TestIds.LogsStats).should('not.exist');

  });


  it('handles errors gracefully when a request fails', () => {
    cy.intercept(QUERY_RANGE_STREAMS_URL_MATCH, (req) => {
      req.continue((res) => res.send({ statusCode: 500, body: 'Internal Server Error' }));
    });
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, (req) => {
      req.continue((res) => res.send({ statusCode: 500, body: 'Internal Server Error' }));
    });

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains('Internal Server Error');
      });

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.contains('Internal Server Error');
      });
  });

  it('handles errors gracefully when a response is invalid', () => {
    cy.intercept(QUERY_RANGE_STREAMS_URL_MATCH, queryRangeStreamsInvalidResponse());
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixInvalidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains('Unexpected end of JSON input');
      });

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.contains('Unexpected end of JSON input');
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

    cy.visit(LOGS_PAGE_URL);

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

    cy.visit(LOGS_PAGE_URL);

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

    cy.getByTestId(TestIds.ShowQueryToggle).click();

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

  it('executes a query with the selected tenant when "run query" is pressed', () => {
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

    cy.visit(LOGS_PAGE_URL);

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

    cy.getByTestId(TestIds.TenantDropdown).click();
    cy.contains('infrastructure').click();

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
    cy.get('@queryRangeMatrix.all').should('have.length.at.least', 1);
    cy.get('@queryRangeStreamsInfrastructure.all').should('have.length.at.least', 1);
    cy.get('@queryRangeMatrixInfrastructure.all').should('have.length.at.least', 1);
  });

  it('stores selected values for time range and refresh interval', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.RefreshIntervalDropdown)
      .click()
      .within(() => {
        cy.contains('1 minute').click();
      });

    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 6 hours').click();
      });

    cy.reload();

    cy.getByTestId(TestIds.RefreshIntervalDropdown).within(() => {
      cy.contains('1 minute');
    });

    cy.getByTestId(TestIds.TimeRangeDropdown).within(() => {
      cy.contains('Last 6 hours');
    });
  });

  it('disables query executors when the query is empty', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ShowQueryToggle).click();

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').clear();
    });

    cy.getByTestId(TestIds.ExecuteQueryButton).should('be.disabled');

    cy.getByTestId(TestIds.RefreshIntervalDropdown).within(() => {
      cy.get('button').should('be.disabled');
    });

    cy.getByTestId(TestIds.TimeRangeDropdown).within(() => {
      cy.get('button').should('be.disabled');
    });

    cy.getByTestId(TestIds.SyncButton).should('be.disabled');

    cy.getByTestId(TestIds.SeverityDropdown).within(() => {
      cy.get('button').should('be.disabled');
    });

    cy.getByTestId(TestIds.TenantDropdown).within(() => {
      cy.get('button').should('be.disabled');
    });
  });

  it('updates the query when selecting filters', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.intercept(RESOURCE_URL_MATCH, namespaceListResponse).as('resourceQuery');

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ShowQueryToggle).click();

    cy.getByTestId(TestIds.SeverityDropdown)
      .click()
      .within(() => {
        cy.contains('error').click();
        cy.contains('info').click();
      });

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .invoke('val')
        .should(
          'equal',
          '{ log_type="application" } | json | level=~"error|err|eror|info|inf|information|notice"',
        );
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.get(`[aria-label="Options menu"]`)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Content').click({ force: true });
        });
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.get('input').type('line filter');
    });

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .invoke('val')
        .should(
          'equal',
          '{ log_type="application" } |= `line filter` | json | level=~"error|err|eror|info|inf|information|notice"',
        );
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.get(`[aria-label="Options menu"]`)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Namespaces').click({ force: true });
        });
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.contains('Filter by Namespaces').click({ force: true });
      cy.contains('gitops').click({ force: true });
    });

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .invoke('val')
        .should(
          'equal',
          '{ log_type="application", kubernetes_namespace_name="gitops" } |= `line filter` | json | level=~"error|err|eror|info|inf|information|notice"',
        );
    });

    cy.get('@resourceQuery.all').should('have.length.at.least', 1);
  });

  it('updates the url with the proper parameters when selecting a custom range', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 2 hours').click();
      });

    cy.url().should('match', /start=now-2h&end=now/);

    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Custom time range').click();
      });

    cy.getByTestId(TestIds.TimeRangeSelectModal).within(() => {
      cy.get('input[aria-label="Date picker"]').first().clear().type('2022-10-17').blur();
      cy.get('input[aria-label="Date picker"]').last().clear().type('2022-10-17').blur();

      cy.get('input[aria-label="Precision time picker"]').first().clear().type('14:50{enter}');
      cy.get('input[aria-label="Precision time picker"]').last().clear().type('15:55{enter}');
    });

    cy.getByTestId(TestIds.TimeRangeDropdownSaveButton).click();

    const startTime = new Date('2022-10-17T14:50:00').getTime();
    const endTime = new Date('2022-10-17T15:55:00').getTime();

    cy.url().should('match', new RegExp(`start=${startTime}&end=${endTime}`));

    const formattedTimeRange = formatTimeRange({ start: startTime, end: endTime });

    cy.contains(formattedTimeRange);

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
    cy.get('@queryRangeMatrix.all').should('have.length.at.least', 1);
  });

  it('applies plugin configuration from the backend', () => {
    cy.intercept(
      QUERY_RANGE_STREAMS_URL_MATCH,
      queryRangeStreamsValidResponse({ message: TEST_MESSAGE }),
    ).as('queryRangeStreams');
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse()).as(
      'queryRangeMatrix',
    );
    cy.intercept(CONFIG_URL_MATCH, configResponse).as('config');

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });

    cy.wait('@queryRangeStreams').then(({ request }) => {
      const url = new URL(request.url);
      const pathname = url.pathname;
      expect(pathname).to.equal(
        '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application/loki/api/v1/query_range',
      );
      const limit = url.searchParams.get('limit');
      expect(limit).to.equal(String(configResponse.logsLimit));
    });

    cy.get('@queryRangeMatrix.all').should('have.length.at.least', 1);
    cy.get('@config.all').should('have.length.at.least', 1);
  });

  it('displays a suggestion to fix an error', () => {
    cy.intercept(QUERY_RANGE_STREAMS_URL_MATCH, {
      statusCode: 400,
      body: queryRangeStreamsErrorResponse(),
    }).as('queryRangeStreams');

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains('Select a smaller time range to reduce the number of results');
      });

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
  });

  it('displays the content of a log entry if the stream result is already formatted', () => {
    cy.intercept(QUERY_RANGE_STREAMS_URL_MATCH, queryRangeStreamsWithLineFormatting()).as(
      'queryRangeStreams',
    );

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('.co-logs-table__message').first().contains('formatted string');
      });

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
  });

  it('displays the message of a log entry if the streams result is an object', () => {
    cy.intercept(QUERY_RANGE_STREAMS_URL_MATCH, queryRangeStreamsWithMessage()).as(
      'queryRangeStreams',
    );

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('.co-logs-table__message').first().contains('a message');
      });

    cy.get('@queryRangeStreams.all').should('have.length.at.least', 1);
  });

  it('displays log based metrics when query results are matrix type', () => {
    cy.intercept(QUERY_RANGE_STREAMS_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.LogsMetrics).should('exist');
  });

  it('histogram is disabled and not visible when query results are matrix type', () => {
    cy.intercept(QUERY_RANGE_STREAMS_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.LogsMetrics).should('exist');
    cy.getByTestId(TestIds.ToggleHistogramButton).should('be.disabled');
    cy.getByTestId(TestIds.LogsHistogram).should('not.exist');
  });

  it('histogram is disabled after beign enabled by a streams result when query results are matrix type', () => {
    cy.intercept(QUERY_RANGE_STREAMS_URL_MATCH, queryRangeStreamsWithMessage());
    cy.intercept(QUERY_RANGE_MATRIX_URL_MATCH, queryRangeMatrixValidResponse());

    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });

    cy.getByTestId(TestIds.ShowQueryToggle).click();

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type('{backspace}')
        .type(
          'sum by (level) (count_over_time({ kubernetes_namespace_name="my-namespace" })[10m])',
          {
            parseSpecialCharSequences: false,
          },
        );
    });

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsMetrics).should('exist');
    cy.getByTestId(TestIds.ToggleHistogramButton).should('be.disabled');
    cy.getByTestId(TestIds.LogsHistogram).should('not.exist');

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type('{backspace}')
        .type('{ kubernetes_namespace_name="my-namespace" }', {
          parseSpecialCharSequences: false,
        });
    });

    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsMetrics).should('not.exist');
    cy.getByTestId(TestIds.ToggleHistogramButton).should('be.enabled');
    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });
});
