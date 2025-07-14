import { TestIds } from '../../../src/test-ids';

const LOGS_PAGE_URL = '/monitoring/logs';

const APP_NAMESPACE1 = "log-test-app1";
const APP_NAMESPACE2 = "log-test-app2";
const APP_MESSAGE = "SVTLogger";
const QEURY_APP = 'log_type="application" | json';
const QEURY_INFRA = 'log_type="infrastructure" | json';
const QEURY_AUDIT = 'log_type="audit" | json';
const QEURY_STATEMENT1 = 'log_type="application", kubernetes_container_name="centos-logtest" | json';
const QEURY_STATEMENT2 = '{{} log_type="application", kubernetes_container_name="centos-logtest"{}} | json';
const QEURY_STATEMENT3 = 'log_type="application", kubernetes_container_name="centos-logtest"';

describe('Logs Page', () => {
  before( function() {
    cy.uiLoginAsClusterAdmin("first_user");
  });

  after( function() {
    cy.uiLogoutClusterAdmin("first_user");
  });
  /*
  it('display top elements', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ToggleHistogramButton).should('exist');
    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');
    cy.getByTestId(TestIds.RefreshIntervalDropdown).should('exist');
    cy.getByTestId(TestIds.SyncButton).should('exist');
    cy.getByTestId(TestIds.AvailableAttributes).should('exist');
    cy.get('input[placeholder="Search by Content"]').should('exist');
    cy.getByTestId(TestIds.SeverityDropdown).should('exist');
    cy.getByTestId(TestIds.TenantToggle).should('exist');
    //ToDo: check SchemaToggle by condition
    //cy.getByTestId(TestIds.SchemaToggle).should('exist');
    cy.contains('button', 'Show Resources').should('exist');
    cy.getByTestId(TestIds.ShowStatsToggle).should('exist');
    cy.contains('button', 'Export as CSV').should('exist');
    cy.getByTestId(TestIds.ExecuteVolumeButton).should('exist');
    cy.getByTestId(TestIds.ExecuteQueryButton).should('exist');
    cy.getByTestId(TestIds.ShowQueryToggle).should('exist');
    cy.getByTestId(TestIds.LogsTable).should('exist');
  }); 
  */

  it('query applicatioins logs', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').type('{selectAll}' + QEURY_APP,{ delay: 0 });
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('td[data-label="date"]').should('exist');
        cy.get('td[data-label="message"]').should('exist');
      });
    cy.get('#expand.pf-v5-c-table__td.lv-plugin__table__expand.pf-v5-c-table__toggle').eq(5).find('button').click();
    cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
      .should('exist')
      .within(() => {
        cy.contains('span.pf-v5-c-description-list__text', '_timestamp');
        cy.contains('span.pf-v5-c-description-list__text', 'k8s_container_name');
        cy.contains('span.pf-v5-c-description-list__text', 'k8s_node_name');
        cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_container_id');
        cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_labels_run');
        cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_namespace_id');
        cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_pod_ip');
        cy.contains('span.pf-v5-c-description-list__text', 'level');
        cy.contains('span.pf-v5-c-description-list__text', 'log_type');
        cy.contains('span.pf-v5-c-description-list__text', 'message');
        cy.contains('span.pf-v5-c-description-list__text', 'openshift_log_type');
        cy.contains('div.pf-v5-c-description-list__text', 'application');
        cy.contains('span.pf-v5-c-description-list__text', 'hostname');
        cy.contains('span.pf-v5-c-description-list__text', 'k8s_namespace_name');
        cy.contains('span.pf-v5-c-description-list__text', 'k8s_pod_name');
        cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_container_name');
        cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_host');
        cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_labels_test');
        cy.contains('span.pf-v5-c-description-list__text', 'openshift_cluster_id');
        cy.contains('span.pf-v5-c-description-list__text', 'openshift_sequence');

	if (String(Cypress.env('CLUSTERLOGGING_VERSION')) != "5.8" && String(Cypress.env('CLUSTERLOGGING_VERSION')) != "5.9" ) {
          cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_container_iostream');
          cy.contains('span.pf-v5-c-description-list__text', 'log_source');
	}
    });

    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  /*
  it('query infrastructure Container logs', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').type('{selectAll}' + QEURY_INFRA,{ delay: 0 });
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(APP_MESSAGE);
      });
  });
  it('query infrastructure node logs', () => {
  }

  it('query audit logs', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').type('{selectAll}' + QEURY_AUDIT,{ delay: 0 });
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.contains(APP_MESSAGE);
      });
  });

  it('query with the selected content', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type(QEURY_STATEMENT1, {
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

  it('query with the selected namespaces', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type(QEURY_STATEMENT1, {
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

  it('query with the selected pods', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type(QEURY_STATEMENT1, {
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

  it('query with the selected container', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
        .type(QEURY_STATEMENT1, {
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

  it('query with the selected tenant', () => {
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

  /*
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

  //resultType: scalar and vector are not support in Lokistack for lokistack only support query_range
  it('displays the content of a log entry when the resultType is stream', () => {
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

  });

  it('displays log result when query resultType is matrix', () => {
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
    cy.getByTestId(TestIds.LogsTable).should('not.exist')
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
