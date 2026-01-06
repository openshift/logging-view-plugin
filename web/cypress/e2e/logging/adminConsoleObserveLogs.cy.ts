import { TestIds } from '../../../src/test-ids';
import { aggrTest, observeTest, commonTest } from './testUtils.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './testUtils.cy.ts';


function userOnlyObsTest() {
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

function checkElements(){
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
}

describe('AdminConsole:: Admin in ObserveLogs', { tags: ['@admin'] }, () => {
  before( function() {
    cy.uiLoginAsClusterAdmin("first_user");
  });

  beforeEach( function() {
    // Load the other page to ensure Observe-Logs in clean status
    cy.clickNavLink(['Home', 'Search'])
    cy.clickNavLink(['Observe', 'Logs'])
  });

  after( function() {
    cy.uiLogoutClusterAdmin("first_user");
  });
  checkElements();
  observeTest();
  commonTest();

  it('admin can display infra logs',{tags:['@observ']}, () => {
    cy.selectTenant('infrastructure')
    let query = '{ log_type="infrastructure" } | json'
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) === "otel") {
      query = '{ log_type="infrastructure" }'
    }
    cy.showQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('eq', query)
    cy.assertInfraLogsInLogsTable();
  });

  it('admin can display infra container logs',{tags:['@observ']}, () => {
    cy.selectTenant('infrastructure')
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
    cy.selectTenant('infrastructure')
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
    cy.selectTenant('audit')
    let query = '{ log_type="audit" } | json'
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) === "otel") {
      query = '{ log_type="audit" }'
    }
    cy.showQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('eq', query)
    cy.assertAuditLogsInLogsTable();
  });
})

describe.skip('AdminConsole: Impersonate User in ObserveLogs', { tags: ['@admin'] }, () => {
  before( function() {
    cy.cliLogin("second_user");
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginAsClusterAdmin("first_user");
    cy.uiImpersonateUser("second_user");
    cy.switchToAdmConsole();
  });

  beforeEach( function() {
    // Load the other page to ensure Observe-Logs in clean status
    cy.clickNavLink(['Home', 'Search'])
    cy.clickNavLink(['Observe', 'Logs'])
  });

  after( function() {
    cy.uiLogoutUser("second_user");
    cy.removeLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.removeLogViewRoles("second_user", `${APP_NAMESPACE2}`);
  });
  
  checkElements();
  userOnlyObsTest();
  observeTest();
  commonTest();
})

describe.skip('AdminConsole: User in ObserveLogs', { tags: ['@user'] }, () => {
  before( function() {
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE1}`)
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE2}`)
    cy.uiLoginUser("second_user");
  });

  beforeEach( function() {
    // Load the other page to ensure Observe-Logs in clean status
    cy.clickNavLink(['Home', 'Search'])
    cy.clickNavLink(['Observe', 'Logs'])
  });

  after( function() {
    cy.uiLogoutUser("second_user");
    cy.removeLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.removeLogViewRoles("second_user", `${APP_NAMESPACE2}`);
  });

  checkElements();
  userOnlyObsTest();
  observeTest();
  commonTest();
})
