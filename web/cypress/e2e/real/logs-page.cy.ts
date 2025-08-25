import { TestIds } from '../../../src/test-ids';

const LOGS_PAGE_URL = '/monitoring/logs';

const QEURY_APP = 'log_type="application" | json';
const QEURY_INFRA = 'log_type="infrastructure" | json';
const QEURY_AUDIT = 'log_type="audit" | json';
const APP_NAMESPACE1 = "log-test-app1";
const APP_NAMESPACE2 = "log-test-app2";
const APP_MESSAGE = "SVTLogger";
const QEURY_MSG1 = 'log_type="application", kubernetes_container_name="centos-logtest" | json';
const QEURY_MSG2 = '{{} log_type="application", kubernetes_container_name="centos-logtest"{}} | json';
const QEURY_MSG3 = 'log_type="application", kubernetes_container_name="centos-logtest"';

describe('Logs Page', () => {

  before( function() {
    cy.uiLoginAsClusterAdmin("first_user");
  });

  after( function() {
    cy.uiLogoutClusterAdmin("first_user");
  });
  /*
  it('renders correctly with an expected response', () => {
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
        cy.contains(APP_MESSAGE);
      });

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  it('tests if the volume graph is enabled and is viewable', () => {
    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable).should('exist');

    cy.getByTestId(TestIds.ExecuteVolumeButton).click();

    cy.getByTestId(TestIds.LogsMetrics).should('exist');
  });

  it('tests if the stats table is enabled and is viewable', () => {
    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ShowStatsToggle).click();
    cy.getByTestId(TestIds.LogsStats).should('exist');

    cy.getByTestId(TestIds.ShowStatsToggle).click();
    cy.getByTestId(TestIds.LogsStats).should('not.exist');
  }); 
  */

  /* Not easy to test in Real Env
  it('handles errors gracefully when a request fails', () => {
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
 */
  /* Not easy to test in Real Env
  it('handles errors gracefully when a response is invalid', () => {
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
  */

  /* 
  it('executes a query when "run query" is pressed', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').type('{selectAll}' + QEURY_MSG1,{ delay: 0 });
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(APP_MESSAGE);
      });

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });
  it('executes a query with a new value when "Enter" is pressed on the query input field', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type(QEURY_MSG1, {
          parseSpecialCharSequences: false,
          delay: 0,
        })
        .type('{enter}');
    });
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(APP_MESSAGE);
      });

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  it('executes a query with the selected tenant when "run query" is pressed', () => {
    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.TenantToggle).click();
    cy.contains('infrastructure').click();
    cy.get('button[id="expand-toggle0"]').click();
    cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
      .within(() => {
        cy.contains('openshift_log_type').should('exist');
        cy.contains('infrastructure').should('exist');
      })

    cy.getByTestId(TestIds.ToggleHistogramButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });


  it('stores selected values for time range and refresh interval', () => {
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

    cy.getByTestId(TestIds.TenantToggle).should('be.disabled');
  });

  it('updates the query when selecting filters', () => {
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
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Content').click({ force: true });
        });
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.get('input').type("SVTLogger");
    });

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .invoke('val')
        .should(
          'equal',
          '{ log_type="application" } |= `SVTLogger` | json | level=~"error|err|eror|info|inf|information|notice"',
        );
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Namespaces').click({ force: true });
        });
      cy.get('input').invoke('attr', 'placeholder').should('contain', 'Filter by Namespaces');
      cy.getByTestId(TestIds.AttributeOptions).within(() => {
        cy.get('button').click({ force: true });
      });
      cy.contains('log-test-app1').click({ force: true });
    });

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .invoke('val')
        .should(
          'equal',
          '{ kubernetes_namespace_name="log-test-app1" } |= `SVTLogger` | json | level=~"error|err|eror|info|inf|information|notice"',
        );
    });
  });
  */
  /*
  it('updates the url with the proper parameters when selecting a custom range', () => {
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
  });
  */

  /* No easy to test in real Env
  it('applies plugin configuration from the backend', () => {
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
  */
  /* No easy to test in real Env
  it('displays a suggestion to fix an error', () => {
    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains('Select a smaller time range to reduce the number of results');
      });
  });
  */
  /*
  it('displays the content of a log entry if the stream result is already formatted', () => {
    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type('{backspace}')
        .type(
          `{ kubernetes_namespace_name="${APP_NAMESPACE1}" }`,
          {
            parseSpecialCharSequences: false,
	    delay: 0,
          },
        );
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('.lv-plugin__table__message').first().contains(APP_MESSAGE);
      });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('.lv-plugin__table__message').first().contains(APP_MESSAGE);
      });
  });
  */

  it('displays the message of a log entry if the streams result is an object', () => {
    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ShowQueryToggle)
      .should('exist')
      .click();

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type('{backspace}')
        .type(
          `{ kubernetes_namespace_name="${APP_NAMESPACE1}" }`,
          {
            parseSpecialCharSequences: false,
	    delay: 0,
          },
        );
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsMetrics).should('exist');

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('.lv-plugin__table__message').first().contains(APP_MESSAGE);
      });
  });
  /*
  it('displays log based metrics when query results are matrix type', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type('{backspace}')
        .type(
          `count_over_time({ kubernetes_namespace_name="${APP_NAMESPACE1}" }[10m])`,
          {
            parseSpecialCharSequences: false,
	    delay: 0,
          },
        );
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsMetrics).should('exist');
  });

  it('histogram is disabled and not visible when query results are matrix type', () => {
    cy.visit(LOGS_PAGE_URL);

    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type('{backspace}')
        .type(
          `count_over_time({ kubernetes_namespace_name="${APP_NAMESPACE1}" }[10m])`,
          {
            parseSpecialCharSequences: false,
	    delay: 0,
          },
        );
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsMetrics).should('exist');
    cy.getByTestId(TestIds.ToggleHistogramButton).should('be.disabled');
    cy.getByTestId(TestIds.LogsHistogram).should('not.exist');
  });

  it('histogram is disabled after beign enabled by a streams result when query results are matrix type', () => {
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
          `sum by (level) (count_over_time({ kubernetes_namespace_name="${APP_NAMESPACE1}" }[10m]))`,
          {
            parseSpecialCharSequences: false,
	    delay: 0,
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
        .type(`{ kubernetes_namespace_name="${APP_NAMESPACE1}" }`, {
          parseSpecialCharSequences: false,
	  delay: 0,
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

  it('container selection includes the parent pod', () => {
    cy.visit(LOGS_PAGE_URL);
    let pod1_name
    let pod2_name
    cy.exec(`oc get pods -n ${APP_NAMESPACE1} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exiting test')
      }
      pod1_name=result.stdout
    })

    cy.exec(`oc get pods -n ${APP_NAMESPACE2} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exiting test')
      }
      pod2_name=result.stdout
    })

    cy.getByTestId(TestIds.ShowQueryToggle).click();

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Content').click({ force: true });
        });
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Containers').click({ force: true });
        });
      cy.get('input').invoke('attr', 'placeholder').should('contain', 'Filter by Containers');
      cy.getByTestId(TestIds.AttributeOptions).within(() => {
        cy.get('button').click({ force: true });
      });
      cy.contains(`${pod1_name} / centos-logtest`).click({ force: true });
      cy.contains(`${pod2_name} / centos-logtest`)
        .find('input')
        .should('not.be.checked');

      cy.contains(`${pod1_name} / centos-logtest`)
        .find('input')
        .should('be.checked');
    });

    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .invoke('val')
        .should(
          'equal',
          `{ kubernetes_container_name="centos-logtest", kubernetes_pod_name="${pod1_name}" } | json`,
        );
    });
  });
  */
});
