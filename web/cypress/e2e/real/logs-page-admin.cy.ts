import { TestIds } from '../../../src/test-ids';

const LOGS_PAGE_URL = '/monitoring/logs';
const LOGS_ALERTS_PAGE_URL = '/monitoring/alerts';
const APP_NAMESPACE1 = "log-test-app1";
const APP_NAMESPACE2 = "log-test-app2";
const APP_MESSAGE = "SVTLogger";
const BLACKTICK = '`';

describe('Logs Page', () => {
  before( function() {
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToAdministor();
  });

  beforeEach(() => {
    cy.visit(LOGS_PAGE_URL, { timeout: 120000 });
  });

  after( function() {
    cy.uiLogoutClusterAdmin("first_user");
  });

  it('display top elements', () => {
    cy.getByTestId(TestIds.ToggleHistogramButton).should('exist');
    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');
    cy.getByTestId(TestIds.RefreshIntervalDropdown).should('exist');
    cy.getByTestId(TestIds.SyncButton).should('exist');
    cy.getByTestId(TestIds.AvailableAttributes).should('exist');
    cy.get('input[aria-label="Search by Content"]').should('exist');
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

  it('query applicatioins logs', () => {
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').clear().type(`{{}kubernetes_namespace_name="${APP_NAMESPACE1}" {}}| json`, { delay: 0 });
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('td[data-label="date"]').should('exist');
        cy.get('td[data-label="message"]').should('exist');
        cy.get('#expand.pf-v5-c-table__td.lv-plugin__table__expand.pf-v5-c-table__toggle', {timeout: 6000}).first().find('button').click({force: true});
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
              cy.contains('div.pf-v5-c-description-list__text', 'container');
            }
          });
    });
    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  it('query infra container logs', () => {
    cy.getByTestId(TestIds.TenantToggle).click();
    cy.get('#logging-view-tenant-dropdown').contains('button', 'infrastructure').click();
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').clear().type('{{}kubernetes_namespace_name="openshift-apiserver"{}}|json', { delay: 0 });
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsTable).should('exist')

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('#expand.pf-v5-c-table__td.lv-plugin__table__expand.pf-v5-c-table__toggle', {timeout: 6000}).first().find('button').click({force: true});
        cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
          .should('exist')
          .within(() => {
            cy.contains('span.pf-v5-c-description-list__text', '_timestamp');
            cy.contains('span.pf-v5-c-description-list__text', 'k8s_container_name');
            cy.contains('div.pf-v5-c-description-list__text', 'openshift-apiserver');
            cy.contains('span.pf-v5-c-description-list__text', 'k8s_node_name');
            cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_container_id');
            cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_namespace_id');
            cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_pod_ip');
            cy.contains('span.pf-v5-c-description-list__text', 'level');
            cy.contains('span.pf-v5-c-description-list__text', 'log_type');
            cy.contains('span.pf-v5-c-description-list__text', 'message');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_log_type');
            cy.contains('div.pf-v5-c-description-list__text', 'infrastructure');
            cy.contains('span.pf-v5-c-description-list__text', 'hostname');
            cy.contains('span.pf-v5-c-description-list__text', 'k8s_namespace_name');
            cy.contains('span.pf-v5-c-description-list__text', 'k8s_pod_name');
            cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_container_name');
            cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_host');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_cluster_id');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_sequence');

            if (String(Cypress.env('CLUSTERLOGGING_VERSION')) != "5.8" && String(Cypress.env('CLUSTERLOGGING_VERSION')) != "5.9" ) {
              cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_container_iostream');
              cy.contains('span.pf-v5-c-description-list__text', 'log_source');
              cy.contains('div.pf-v5-c-description-list__text', 'container');
            }
          });
    });
    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  it('query infra node logs', () => {
    cy.getByTestId(TestIds.TenantToggle).click();
    cy.get('#logging-view-tenant-dropdown').contains('button', 'infrastructure').click()
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').clear().type('{{}log_type="infrastructure"{}}|json|log_source="node"', { delay: 0 });
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('#expand.pf-v5-c-table__td.lv-plugin__table__expand.pf-v5-c-table__toggle', {timeout: 6000}).first().find('button').click({force: true});
        cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
          .should('exist')
          .within(() => {
            cy.contains('span.pf-v5-c-description-list__text', '_timestamp');
            cy.contains('span.pf-v5-c-description-list__text', 'k8s_node_name');
            cy.contains('span.pf-v5-c-description-list__text', 'level');
            cy.contains('span.pf-v5-c-description-list__text', 'log_type');
            cy.contains('span.pf-v5-c-description-list__text', 'message');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_log_type');
            cy.contains('div.pf-v5-c-description-list__text', 'infrastructure');
            cy.contains('span.pf-v5-c-description-list__text', 'hostname');
            cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_host');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_cluster_id');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_sequence');
            cy.contains('span.pf-v5-c-description-list__text', '_SYSTEMD_INVOCATION_ID');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_t_BOOT_ID');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_t_EXE');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_t_MACHINE_ID');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_t_SELINUX_CONTEXT');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_t_SYSTEMD_CGROUP');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_t_SYSTEMD_SLICE');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_t_TRANSPORT');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_u_SYSLOG_FACILITY');
            //cy.contains('span.pf-v5-c-description-list__text', 'time');
            //cy.contains('span.pf-v5-c-description-list__text', '_STREAM_ID');
            cy.contains('span.pf-v5-c-description-list__text', 'systemd_t_COMM');

            if (String(Cypress.env('CLUSTERLOGGING_VERSION')) != "5.8" && String(Cypress.env('CLUSTERLOGGING_VERSION')) != "5.9" ) {
              cy.contains('span.pf-v5-c-description-list__text', 'log_source');
              cy.contains('div.pf-v5-c-description-list__text', 'node');
            }
          });
    });
    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  it('query audit logs', () => {
    cy.getByTestId(TestIds.TenantToggle).click();
    cy.get('#logging-view-tenant-dropdown').contains('button', 'audit').click()
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('#expand.pf-v5-c-table__td.lv-plugin__table__expand.pf-v5-c-table__toggle', {timeout: 6000}).first().find('button').click({force: true});
        cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
          .should('exist')
          .within(() => {
            cy.contains('span.pf-v5-c-description-list__text', '_timestamp');
            cy.contains('span.pf-v5-c-description-list__text', 'hostname');
            cy.contains('span.pf-v5-c-description-list__text', 'k8s_node_name');
            cy.contains('span.pf-v5-c-description-list__text', 'kubernetes_host');
            cy.contains('span.pf-v5-c-description-list__text', 'log_type');
            cy.contains('div.pf-v5-c-description-list__text', 'audit');
            cy.contains('span.pf-v5-c-description-list__text', 'kind');
            cy.contains('span.pf-v5-c-description-list__text', 'level');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_log_type');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_cluster_id');
            cy.contains('span.pf-v5-c-description-list__text', 'openshift_sequence');
            cy.contains('span.pf-v5-c-description-list__text', 'apiVersion');

            if (String(Cypress.env('CLUSTERLOGGING_VERSION')) == "5.8" || String(Cypress.env('CLUSTERLOGGING_VERSION')) == "5.9" ) {
              cy.contains('span.pf-v5-c-description-list__text', 'file');
            }else{
              cy.contains('span.pf-v5-c-description-list__text', 'log_source');
           }
         });
    });
    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.LogsHistogram)
      .should('exist')
      .within(() => {
        cy.get('svg g > path').should('have.length.above', 0);
      });
  });

  it('query with the selected content', () => {
    cy.getByTestId(TestIds.AttributeFilters)
      .should('exist')
      .within(() => {
          cy.get('input[aria-label="Search by Content"]').clear().type(APP_NAMESPACE1, {delay: 0})
      })
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.get('div[data-test="LogsQueryInput"] textarea').should('have.value', `{ log_type="application" } |= ${BLACKTICK}${APP_NAMESPACE1}${BLACKTICK} | json`)	

    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsTable)
      .within(() => {
        cy.get('#expand.pf-v5-c-table__td.lv-plugin__table__expand.pf-v5-c-table__toggle', {timeout: 6000}).first().find('button').click({force: true});
        cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
          .should('exist')
          .within(() => {
            cy.contains('div.pf-v5-c-description-list__text', `${APP_NAMESPACE1}`);
          });
      });
  });

  it('query with the selected namespaces', () => {
    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Namespaces').click({ force: true });
        });
    })

    cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click();
    cy.get('div.pf-v5-c-menu.lv-plugin__search-select').within(() => {
      cy.contains('label.pf-v5-c-menu__item', 'default');
      cy.contains('label.pf-v5-c-menu__item', 'kube-system');
      cy.contains('label.pf-v5-c-menu__item', `${APP_NAMESPACE1}`).find('input[type="checkbox"]').check({ force: true });
      cy.contains('label.pf-v5-c-menu__item', `${APP_NAMESPACE2}`).find('input[type="checkbox"]').check({ force: true });
      cy.contains('label.pf-v5-c-menu__item', 'openshift-apiserver');
      cy.contains('label.pf-v5-c-menu__item', 'openshift-cluster-observability-operator');
    });
    cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click();

    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsTable)
      .within(() => {
        cy.get('#expand.pf-v5-c-table__td.lv-plugin__table__expand.pf-v5-c-table__toggle', {timeout: 6000}).first().find('button').click({force: true});
        cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
          .should('exist')
          .within(() => {
            cy.contains('div.pf-v5-c-description-list__text', 'log-test-app');
          });
      });
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.get('div[data-test="LogsQueryInput"] textarea').should('have.value', `{ kubernetes_namespace_name=~"${APP_NAMESPACE1}|${APP_NAMESPACE2}" } | json`)
  });

  it('query with the selected pods', () => {
    let pod1Name;
    let pod1NewName;
    let pod2Name;
    cy.exec(`oc -n ${APP_NAMESPACE1} get pods -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exit')
      }
      pod1Name=result.stdout

      cy.exec(`oc -n ${APP_NAMESPACE1} delete pods ${pod1Name} --wait=true`).then((result) => {
        if (result.code !== 0) {
          throw new Error(`failed to delete the pod ${pod1Name}, exit`)
	}
        cy.exec(`oc -n ${APP_NAMESPACE1} get pods -o jsonpath={.items[0].metadata.name}`).then((result) => {
          if (result.code !== 0) {
            throw new Error('failed to get podname, exit')
          }
          pod1NewName=result.stdout
          cy.exec(`oc -n ${APP_NAMESPACE1} wait pods/${pod1NewName} --for=condition=Ready`).then((result) => {
	    cy.log(`pod1Name ${pod1Name}`);
	    cy.log(`pod1NewName ${pod1NewName}`);
          })
        })
      })
    })

    cy.exec(`oc -n ${APP_NAMESPACE2} get pods -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exit')
      }
      pod2Name=result.stdout
    })

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Pods').click({ force: true });
        });
    })

    cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click();
    cy.get('div.pf-v5-c-menu.lv-plugin__search-select').within(() => {
      cy.contains('label.pf-v5-c-menu__item', `${pod1Name}`).find('input[type="checkbox"]').check({ force: true });
      cy.contains('label.pf-v5-c-menu__item', `${pod1NewName}`).find('input[type="checkbox"]').check({ force: true });
      cy.contains('label.pf-v5-c-menu__item', `${pod2Name}`).find('input[type="checkbox"]').check({ force: true });
    });
    cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click();

    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.get('div[data-test="LogsQueryInput"] textarea')
      .invoke('val')
      .should('match', /{ kubernetes_pod_name=~"centos-logtest-\w+\|centos-logtest-\w+\|centos-logtest-\w+" } \| json/ )

    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);
  });

  it('query with selected container', () => {
    let pod1Name
    let pod2Name
    cy.exec(`oc get pods -n ${APP_NAMESPACE1} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exiting test')
      }
      pod1Name=result.stdout
    });
    cy.exec(`oc get pods -n ${APP_NAMESPACE2} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exiting test')
      }
      pod2Name=result.stdout
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Containers').click({ force: true });
        });
      cy.get('input').invoke('attr', 'placeholder').should('contain', 'Filter by Containers');
      cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click();
      cy.contains(`${pod1Name} / centos-logtest`).click({ force: true });
      cy.contains(`${pod2Name} / centos-logtest`).click({ force: true });
      cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click();
    });

    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.get('div[data-test="LogsQueryInput"] textarea')
        .invoke('val')
        .should(
          'match',
	  /{ kubernetes_container_name="centos-logtest", kubernetes_pod_name=~"centos-logtest-\w+|centos-logtest-\w+" } | json/
        );
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);
  });

  it('Get logs in given time', () => {
    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 5 minutes').click();
      });
    cy.url().should('match', /start=now-5m&end=now/);
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 2 hours').click();
      });
    cy.url().should('match', /start=now-2h&end=now/);
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 1 day').click();
      });
    cy.url().should('match', /start=now-1d&end=now/);
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 2 weeks').click();
      });
    cy.url().should('match', /start=now-2w&end=now/);
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);
  });

  it('get logs by selecting a custom range', () => { 
    const startDay = '2022-10-17'
    const endDay = '2022-10-18'
    const startTime = '14:50'
    const endTime = '13:50'
    const startDate = new Date(`${startDay} ${startTime}`).getTime();
    const endDate = new Date(`${endDay} ${endTime}`).getTime();

    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Custom time range').click();
      });
    cy.getByTestId(TestIds.TimeRangeSelectModal).within(() => {
      cy.get('input[aria-label="Date picker"]').first().clear().type(`${startDay}`).blur();
      cy.get('input[aria-label="Precision time picker"]').first().clear().type(`${startTime}{enter}`);

      cy.get('input[aria-label="Date picker"]').last().clear().type(`${endDay}`).blur();
      cy.get('input[aria-label="Precision time picker"]').last().clear().type(`${endTime}{enter}`);
    });
    cy.getByTestId(TestIds.TimeRangeDropdownSaveButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .within(() => {
        cy.contains(`${startDay} ${startTime} - ${endDay} ${endTime}`);
      });
    cy.url().should('match', new RegExp(`${startDate}&end=${endDate}`));

    cy.getByTestId(TestIds.LogsTable)
      .within(() => {
        cy.contains('No datapoints found');
      });
  });

  it('displays log result when query resultType is matrix', () => {
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea')
        .type('{selectAll}')
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

  it('show resources ', () => {
    let pod1Name
    cy.exec(`oc get pods -n ${APP_NAMESPACE1} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exiting test')
      }
      pod1Name=result.stdout
    });
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput).within(() => {
      cy.get('textarea').type(`{selectAll} kubernetes_pod_name="${pod1Name}"`,{ delay: 0 });
    });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.get('div.pf-v5-c-toolbar__group').contains('button', 'Show Resources').click(); 
    cy.getByTestId(TestIds.LogsTable).should('exist')
      .within(() => {
          cy.get('td.pf-v5-c-table__td.lv-plugin__table__message').first()
            .within(() => {
	      cy.get(`a[href="/k8s/cluster/namespaces/${APP_NAMESPACE1}"]`).should('have.text', `${APP_NAMESPACE1}`);
	      cy.get(`a[href="/k8s/ns/${APP_NAMESPACE1}/pods/${pod1Name}"]`).should('have.text', `${pod1Name}`);
	      cy.get(`a[href="/k8s/ns/${APP_NAMESPACE1}/pods/${pod1Name}/containers/centos-logtest"]`).should('exist')
	      //cy.get(`a[href="/k8s/ns/${APP_NAMESPACE1}/pods/${pod1Name}/containers/centos-logtest"]`).should('have.text', "centos-logtest");
             });
       });
  });
});
