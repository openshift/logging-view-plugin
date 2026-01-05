import { TestIds } from '../../../src/test-ids';
import { isDevConsoleReady, aggrLogTest, commonTest } from './testUtils.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './testUtils.cy.ts';

let SKIPALL= false

function devConsoleUserAggrTest(){
  it('user can not display infra logs',{tags:['@aggr']}, () => {
    cy.runLogQuery('{{} k8s_namespace_name="openshift-monitoring" {}}');
    cy.getByTestId(TestIds.LogsTable)
      .should('contain.text', 'Warning alert:No datapoints found');
  });
}

describe('DevConsole: Admin in AggregatedLogs ', { tags: ['@admin'] }, () => {
  before( function() {
    //Check if DevConsole is ready
    isDevConsoleReady().then((ready) => {
      if (!ready) {
        SKIPALL= true
        cy.task('log','DeveloperConsole is not ready — skipping suite');
        this.skip()
      }
    });
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    cy.showDevConsolePodAggrLog(APP_NAMESPACE1)
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutClusterAdmin("first_user");
    }
  });
  aggrLogTest();
  commonTest();

  it('admin can display infra container logs', {tags: ['@aggr'] }, () => {
   //load Aggregated Logs for pod in openshift-monitoring
    cy.showDevConsolePodAggrLog('openshift-monitoring')
    cy.assertInfraLogsInLogsTable();
  });
})

describe('DevConsole: Impersonate User in AggregatedLogs', { tags: ['@admin'] },() => {
  before( function() {
    //Check if DevConsole is ready
    isDevConsoleReady().then((ready) => {
      if (!ready) {
        cy.task('log','DeveloperConsole is not ready — skipping suite');
        SKIPALL= true
        this.skip()
      }
    });
    cy.cliLogin("second_user");
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginAsClusterAdmin("first_user");
    cy.uiImpersonateUser("second_user");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    cy.showDevConsolePodAggrLog(APP_NAMESPACE1)
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutUser("second_user");
      cy.removeLogViewRoles("second_user", `${APP_NAMESPACE1}`);
      cy.removeLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    }
  });
  devConsoleUserAggrTest();
  aggrLogTest();
  commonTest()
})

describe('DevConsole: User in AggregatedLogs', { tags: ['@admin'] }, () => {
  before( function() {
    //Check if DevConsole is ready
    isDevConsoleReady().then((ready) => {
      if (!ready) {
        cy.task('log','DeveloperConsole is not ready — skipping suite');
        SKIPALL= true
        this.skip()
      }
    });
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginUser("second_user");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    //hover on project page
    cy.showDevConsolePodAggrLog(APP_NAMESPACE1)
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutUser("second_user");
      cy.removeLogViewRoles("second_user", `${APP_NAMESPACE1}`);
      cy.removeLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    }
  });
  devConsoleUserAggrTest();
  aggrLogTest();
  commonTest();
});
