import { TestIds } from '../../../src/test-ids';
import { aggrLogTest, observeLogTest, commonTest, getRunningPodName } from './testUtils.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './testUtils.cy.ts';


function admConsoleUserObsTest() {
  it('user can not display audit logs',{tags:['@observ']}, () => {
    cy.byTestID(TestIds.TenantToggle)
      .click()
      .get('#logging-view-tenant-dropdown')
      .contains('button', 'audit')
      .click()
    cy.byTestID(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('div.lv-plugin__table__row-error', { timeout: 600  }).should('contain', 'Forbidden');
      })
  });
}

function admConsoleObserveTest(){
  it('validate elements in core observeLogs',{tags:['@observ']}, () => {
    const commonElements = [
      TestIds.ToggleHistogramButton,
      TestIds.TimeRangeDropdown,
      TestIds.RefreshIntervalDropdown,
      TestIds.SyncButton,
      TestIds.AvailableAttributes,
      TestIds.SeverityDropdown,
      TestIds.ShowStatsToggle,
      TestIds.ExecuteVolumeButton,
      TestIds.ExecuteQueryButton,
      TestIds.ShowQueryToggle,
      TestIds.LogsTable,
    ];
    commonElements.forEach(id => {
      cy.byTestID(id).should('exist');
    });

    cy.byTestID(TestIds.TenantToggle).should('exist');
    cy.byTestID(TestIds.AttributeFilters).within(() => {
      cy.byTestID(TestIds.AvailableAttributes).click();
      cy.contains('li', 'Content');
      cy.contains('li', 'Pod');
      cy.contains('li', 'Containers');
      cy.contains('li', 'Namespaces');
    })
    if (Cypress.env('CLUSTERLOGGING_DATAMODE') === "select" ) {
      cy.byTestID(TestIds.SchemaToggle).should('exist');
    }
  })

  it('selected containers',{tags:['@observ']}, () => {
    getRunningPodName(APP_NAMESPACE1).as('pod1Name');
    getRunningPodName(APP_NAMESPACE2).as('pod2Name');

    cy.get('@pod1Name').then((pod1Name) => {
      cy.get('@pod2Name').then((pod2Name) => {
        const containers = [`${pod1Name} / centos-logtest`,`${pod2Name} / centos-logtest`]
        cy.log(`container1=${pod1Name} / centos-logtest, container2=${pod2Name} / centos-logtest`);
        cy.checkLogContainers(containers)

        cy.showLogQueryInput();
        let pattern = /{ kubernetes_container_name="centos-logtest", kubernetes_pod_name=~"centos-logtest-\w+|centos-logtest-\w+" } | json/;
        if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) === "otel") {
          pattern = /{ k8s_container_name="centos-logtest", k8s_pod_name=~"centos-logtest-\w+|centos-logtest-\w+" } /;
        }
        cy.byTestID(TestIds.LogsQueryInput)
          .find('textarea')
          .invoke('val')
          .should('match', pattern);
        cy.byTestID(TestIds.ExecuteQueryButton).click();
        const indexFields : IndexField = [
          { name: 'k8s_namespace_name', value: `${APP_NAMESPACE1}|${APP_NAMESPACE2}` },
          { name: 'k8s_pod_name', value: `${pod1Name}|${pod2Name}` },
          { name: 'k8s_container_name', value: 'centos-logtest' },
        ]
        cy.assertFieldsInLogDetail(indexFields)
      });
    });
  })
}

describe('AdminConsole:: Admin in ObserveLogs', { tags: ['@admin'] }, () => {
  before( function() {
    cy.uiLoginAsClusterAdminForUser("first");
    cy.switchToAdmConsole();
  });

  beforeEach( function() {
    // Load the other page to ensure Observe-Logs in clean status
    cy.clickNavLink(['Home', 'Search'])
    cy.clickNavLink(['Observe', 'Logs'])
  });

  after( function() {
    cy.uiLogoutClusterAdminForUser("first");
  });
  admConsoleObserveTest();
  observeLogTest();
  commonTest();
  it('admin can display infra logs',{tags:['@observ']}, () => {
    cy.selectLogTenant('infrastructure')
    let query = '{ log_type="infrastructure" } | json'
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) === "otel") {
      query = '{ log_type="infrastructure" }'
    }
    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('eq', query)
    cy.assertInfraLogsInLogsTable();
  });

  it('admin can display infra container logs',{tags:['@observ']}, () => {
    cy.selectLogTenant('infrastructure')
    cy.runLogQuery('{{}log_type="infrastructure"{}}|json|log_source="container"');

    const indexFields : IndexField = [
      { name: '_timestamp', value: "" },
      { name: 'k8s_container_name', value: "" },
      { name: 'k8s_namespace_name', value: "" },
      { name: 'k8s_node_name', value: "" },
      { name: 'k8s_pod_name', value: "" },
      { name: 'openshift_log_type', value: "infrastructure" },
      { name: 'log_source', value: "container" },
      { name: 'hostname', value: "" },
      { name: 'openshift_cluster_id', value: "" },
      { name: 'openshift_sequence', value: "" },
    ];
    cy.assertFieldsInLogDetail(indexFields)
  });

  it('admin can display infra node logs',{tags:['@smoke','@observ']}, () => {
    cy.selectLogTenant('infrastructure')
    cy.runLogQuery('{{}log_type="infrastructure"{}}|json|log_source="node"')
    const indexFields : IndexField = [
      { name: '_timestamp', value: "" },
      { name: 'log_type', value: "infrastructure" },
      { name: 'openshift_log_type', value: "infrastructure" },
      { name: 'log_source', value: "node" },
      { name: 'hostname', value: "" },
      { name: 'openshift_cluster_id', value: "" },
      { name: 'openshift_sequence', value: "" },
    ];
    cy.assertFieldsInLogDetail(indexFields);
  });

  it('admin can display audit logs',{tags:['@observ']}, () => {
    cy.selectLogTenant('audit')
    let query = '{ log_type="audit" } | json'
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) === "otel") {
      query = '{ log_type="audit" }'
    }
    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('eq', query)
    cy.assertAuditLogsInLogsTable();
  });
})

describe.skip('AdminConsole: Impersonate User in ObserveLogs', { tags: ['@admin'] }, () => {
  before( function() {
    cy.cliLoginAsUser("second");
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE1}`);
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE2}`);
    cy.uiLoginAsClusterAdminForUser("first");
    cy.switchToAdmConsole();
    cy.uiImpersonateUser("second");
    cy.switchToAdmConsole();
  });

  beforeEach( function() {
    // Load the other page to ensure Observe-Logs in clean status
    cy.clickNavLink(['Home', 'Search'])
    cy.clickNavLink(['Observe', 'Logs'])
  });

  after( function() {
    cy.uiLogoutUser("second");
    cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE1}`);
    cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE2}`);
  });
  
  admConsoleObserveTest();
  admConsoleUserObsTest();
  observeLogTest();
  commonTest();
})

describe.skip('AdminConsole: User in ObserveLogs', { tags: ['@user'] }, () => {
  before( function() {
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE1}`)
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE2}`)
    cy.uiLoginAsUser("second");
    cy.switchToAdmConsole();
  });

  beforeEach( function() {
    // Load the other page to ensure Observe-Logs in clean status
    cy.clickNavLink(['Home', 'Search'])
    cy.clickNavLink(['Observe', 'Logs'])
  });

  after( function() {
    cy.uiLogoutUser("second");
    cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE1}`);
    cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE2}`);
  });

  admConsoleObserveTest();
  admConsoleUserObsTest();
  observeLogTest();
  commonTest();
})
