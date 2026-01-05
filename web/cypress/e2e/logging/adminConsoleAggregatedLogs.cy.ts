import { TestIds } from '../../../src/test-ids';
import { aggrLogTest, observeLogTest, commonTest } from './testUtils.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './testUtils.cy.ts';

describe('AdminConsole: Admin in AggregatedLogs', { tags: ['@admin'] }, () => {
  before( function() {
    cy.uiLoginAsClusterAdmin("first_user");
  });

  beforeEach( function() {
    cy.showAdminConsolePodAggrLog(APP_NAMESPACE1);
   });

  after( function() {
    cy.uiLogoutClusterAdmin("first_user");
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
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    cy.cliLogin("second_user")
    cy.uiLoginAsClusterAdmin("first_user");
    cy.uiImpersonateUser("second_user");
    cy.switchToAdmConsole();
  });

  beforeEach( function() {
    cy.showAdminConsolePodAggrLog(APP_NAMESPACE1);
  });

  after( function() {
    cy.uiLogoutUser("second_user");
    cy.removeLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.removeLogViewRoles("second_user", `${APP_NAMESPACE2}`);
  });

  aggrLogTest();
  commonTest();
})

describe('AdminConsole: User in Aggregated Logs', { tags: ['@user'] }, () => {
  before( function() {
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginUser("second_user");
  });

  beforeEach( function() {
    cy.showAdminConsolePodAggrLog(APP_NAMESPACE1);
  });

  after( function() {
    cy.uiLogoutUser("second_user");
    cy.removeLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.removeLogViewRoles("second_user", `${APP_NAMESPACE2}`);
  });

  aggrLogTest();
  commonTest();
})
