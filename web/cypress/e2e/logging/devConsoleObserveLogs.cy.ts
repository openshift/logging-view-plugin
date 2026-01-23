import { TestIds } from '../../../src/test-ids';
import { isDevConsoleReady, observeLogTest, commonTest, getRunningPodName } from './testUtils.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './testUtils.cy.ts';

let SKIPALL= false

function devConsoleObsTest(){
  it('validate elements in dev observeLogs',{tags:['@devobserv']}, () => {
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

    cy.byTestID(TestIds.TenantToggle).should('not.exist'); //Specical feature
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

  it('selected containers',{tags:['@devobserv']}, () => {
    getRunningPodName(APP_NAMESPACE1).as('pod1Name');
    getRunningPodName(APP_NAMESPACE2).as('pod2Name');

    cy.get('@pod1Name').then((pod1Name) => {
      cy.get('@pod2Name').then((pod2Name) => {
        //const containers = [`${pod1Name} / centos-logtest`,`${pod2Name} / centos-logtest`]
        //cy.log(`container1=${pod1Name} / centos-logtest, container2=${pod2Name} / centos-logtest`);
	const containers = ['centos-logtest']
	cy.log('containers = centos-logtest')
	cy.checkLogContainers(containers);

        cy.showQueryInput();
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

function devConsoleUserObsTest(){
  it('user can not display infra logs',{tags:['@smoke','@devobserv']}, () => {
    cy.runLogQuery('{{} k8s_namespace_name="openshift-monitoring" {}}')
    cy.getByTestId(TestIds.LogsTable)
      .should('contain.text', 'No datapoints found');
  });
}

describe('DevConsole: Admin in ObserveLogs', { tags: ['@admin'] }, () => {
  before( function() {
    //Check if DevConsole is ready
    isDevConsoleReady().then((ready) => {
      if (!ready) {
        cy.task('log','DeveloperConsole is not ready — skipping suite');
        SKIPALL= true
        this.skip()
	return;      // stop execution in this callback
      }
    });
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    // reload observe->logs for current pod in APP_NAMESPACE1
    cy.clickNavLink(['Observe'])
    cy.changeNamespace(APP_NAMESPACE1)
    cy.byLegacyTestID('horizontal-link-Logs').click();
    cy.assertLogsInLogsTable();
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutClusterAdmin("first_user");
    }
  });

  devConsoleObsTest();
  observeLogTest();
  commonTest();

  it('admin can display infra logs',{tags:['@smoke','@devobserv']}, () => {
    // reload observe->logs
    cy.changeNamespace('openshift-monitoring');

    let query = '{ kubernetes_namespace_name="openshift-monitoring" } | json'
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) === "otel") {
      query = '{ k8s_namespace_name="openshift-monitoring" }'
    }
    cy.showQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('eq', query)
    cy.assertInfraLogsInLogsTable();
  });

  it('admin can not query without namespace',{tags:['@smoke','@devobserv']}, () => {
    let queryText = `{{}log_type="infrastructure" {}}`
    cy.showQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .clear()
      .type(queryText, { delay: 0 })
    cy.byTestID(TestIds.ExecuteQueryButton).should('be.disabled');
    cy.byTestID(TestIds.LogsQueryInput)
      .should('contain.text', 'Please select a namespace');
  });
})

describe('DevConsole: Impersonate User in ObserveLogs',{ tags: ['@admin'] },  () => {
  before( function() {
    //Check if DevConsole is ready
    isDevConsoleReady().then((ready) => {
      if (!ready) {
        cy.task('log','DeveloperConsole is not ready — skipping suite');
        SKIPALL= true
        this.skip();
	return;      // stop execution in this callback
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
    // reload observe->logs for current pod in APP_NAMESPACE1
    cy.clickNavLink(['Observe'])
    cy.changeNamespace(APP_NAMESPACE1)
    cy.byLegacyTestID('horizontal-link-Logs').click();
  }); 

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutUser("second_user");
      cy.removeLogViewRoles("second_user", `${APP_NAMESPACE1}`);
      cy.removeLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    }
  });
  devConsoleObsTest();
  devConsoleUserObsTest();
  observeLogTest();
  commonTest();
})

describe('DevConsole: User in ObserveLogs', { tags: ['@user'] }, () => {
  before( function() {
    //Check if DevConsole is ready
    isDevConsoleReady().then((ready) => {
      if (!ready) {
        cy.task('log','DeveloperConsole is not ready — skipping suite');
        SKIPALL= true
        this.skip()
	return;      // stop execution in this callback
      }
    });
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginUser("second_user");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    cy.clickNavLink(['Observe'])
    cy.changeNamespace(APP_NAMESPACE1)
    cy.byLegacyTestID('horizontal-link-Logs').click();
  }); 

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutUser("second_user");
      cy.removeLogViewRoles("second_user", `${APP_NAMESPACE1}`);
      cy.removeLogViewRoles("second_user", `${APP_NAMESPACE2}`);
    }
  });
  devConsoleObsTest();
  devConsoleUserObsTest();
  observeLogTest();
  commonTest();
})
