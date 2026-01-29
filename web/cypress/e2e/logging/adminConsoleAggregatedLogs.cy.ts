import { TestIds } from '../../../src/test-ids';
import { aggrLogTest, observeLogTest, commonTest } from './testUtils.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './testUtils.cy.ts';

describe('AdminConsole: Admin in AggregatedLogs', { tags: ['@admin'] }, () => {
  before( function() {
    cy.uiLoginAsClusterAdminForUser("first");
  });

  beforeEach( function() {
    cy.showAdminConsolePodAggrLog(APP_NAMESPACE1);
   });

  after( function() {
    cy.uiLogoutClusterAdminForUser("first");
  });

  aggrLogTest();
  commonTest();
  it('admin can display infra container logs',{tags:['@aggr']}, () => {
    cy.showAdminConsolePodAggrLog('openshift-monitoring','alertmanager-main-0');
    const indexFields : IndexField = [
      { name: '_timestamp', value: "" },
      { name: 'k8s_container_name', value: "" },
      { name: 'k8s_namespace_name', value: "openshift-monitoring" },
      { name: 'k8s_node_name', value: "" },
      { name: 'k8s_pod_name', value: "alertmanager-main-0" },
      { name: 'openshift_log_type', value: "infrastructure" },
      { name: 'log_source', value: "container" },
      { name: 'hostname', value: "" },
      { name: 'openshift_cluster_id', value: "" },
      { name: 'openshift_sequence', value: "" },
    ];
    cy.assertFieldsInLogDetail(indexFields)
  });
})

describe('AdminConsole: Impersonate User in AggregatedLogs',{ tags: ['@admin'] }, () => {
  before( function() {
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE1}`);
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE2}`);
    cy.cliLoginAsUser("second")
    cy.uiLoginAsClusterAdminForUser("first");
    cy.uiImpersonateUser("second");
    cy.switchToAdmConsole();
  });

  beforeEach( function() {
    cy.showAdminConsolePodAggrLog(APP_NAMESPACE1);
  });

  after( function() {
    cy.uiLogoutUser("second");
    cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE1}`);
    cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE2}`);
  });

  aggrLogTest();
  commonTest();
})

describe('AdminConsole: User in Aggregated Logs', { tags: ['@user'] }, () => {
  before( function() {
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE1}`);
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE2}`);
    cy.uiLoginAsUser("second");
  });

  beforeEach( function() {
    cy.showAdminConsolePodAggrLog(APP_NAMESPACE1);
  });

  after( function() {
    cy.uiLogoutUser("second");
    cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE1}`);
    cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE2}`);
  });

  aggrLogTest();
  commonTest();
})
