import { TestIds } from '../../../src/test-ids';
import { isDevConsoleReady, aggrLogTest, commonTest } from './testUtils.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './testUtils.cy.ts';

let SKIPALL= false

function devConsoleUserAggrTest(){
  it('user can not display infra logs',{tags:['@aggr']}, () => {
    cy.runLogQuery('{{} k8s_namespace_name="openshift-monitoring" {}}');
    cy.getByTestId(TestIds.LogsTable).within(() => {
       cy.get('.lv-plugin__table__row-error').should('exist');
       // It may  report error below
       //-' DateMessageDanger alert:{"error":"400 Bad Request","errorType":"observatorium-api","status":"error"}\n'
       //+'Warning alert:No datapoints found'
    })
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
    cy.uiLoginAsClusterAdminForUser("first");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    cy.showDevConsolePodAggrLog(APP_NAMESPACE1)
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutClusterAdminForUser("first");
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
    cy.cliLoginAsUser("second");
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE1}`);
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE2}`);
    cy.uiLoginAsClusterAdminForUser("first");
    cy.uiImpersonateUser("second");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    cy.showDevConsolePodAggrLog(APP_NAMESPACE1)
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutUser("second");
      cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE1}`);
      cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE2}`);
    }
  });
  // devConsoleUserAggrTest(); skip for bug  https://github.com/openshift/logging-view-plugin/pull/317
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
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE1}`);
    cy.grantLogViewRolesToUser("second", `${APP_NAMESPACE2}`);
    cy.uiLoginAsUser("second");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    //hover on project page
    cy.showDevConsolePodAggrLog(APP_NAMESPACE1)
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutUser("second");
      cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE1}`);
      cy.removeLogViewRolesFromUser("second", `${APP_NAMESPACE2}`);
    }
  });
  devConsoleUserAggrTest();
  aggrLogTest();
  commonTest();
});
