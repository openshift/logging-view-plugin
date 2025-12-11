import { TestIds } from '../../../src/test-ids';
import { commonTests } from './logs-common-test.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './logs-common-test.cy.ts';

describe('User in AdminConsole Aggregated Logs', () => {

  before( function() {
    cy.grantLogRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginUser("second_user");
    cy.switchToAdmConsole();
    cy.get('button[data-quickstart-id="qs-nav-workloads"]').click();
  });

  beforeEach( function() {
    //reload Aggregated Logs for first pod in APP_NAMESPACE1
    cy.get('[id="page-sidebar"]')
      .within(() => {
    	cy.contains('a[data-test="nav"]', 'Pods').click();
      })
    cy.get('[data-test-id="namespace-bar-dropdown"]')
      .find('button[aria-expanded="false"]')
      .click();

    cy.get('[data-test="namespace-dropdown-menu"]')
      .within(() => {
        cy.contains('button', `${APP_NAMESPACE1}`).click();
      });

    cy.get('section.pf-v6-c-page__main-section')
      .contains('h1','Pods');
    cy.get('section[id="content-scrollable"]')
      .within(() => {
        cy.get('tr[data-test-rows="resource-row"]')
          .first()
          .find('td')
          .first()
          .find('a.co-resource-item__resource-name')
          .click();
       });
    cy.get('a[data-test-id="horizontal-link-Aggregated Logs"]').click();
    cy.getByTestId(TestIds.LogsTable,{ timeout: 20000 }).should('be.visible');
  });

  after( function() {
    cy.uiLogoutUser("second_user");
    cy.removeLogRoles("second_user", `${APP_NAMESPACE1}`);
    cy.removeLogRoles("second_user", `${APP_NAMESPACE2}`);
  });

  it('validate elements in Aggregated Logs',{tags:['@smoke', '@aggr']}, () => {
    cy.getByTestId(TestIds.ToggleHistogramButton).should('exist');
    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');
    cy.getByTestId(TestIds.RefreshIntervalDropdown).should('exist');
    cy.getByTestId(TestIds.SyncButton).should('exist');
    cy.getByTestId(TestIds.AvailableAttributes).should('exist');
    cy.getByTestId(TestIds.SeverityDropdown).should('exist');
    cy.contains('button', 'Show Resources').should('exist');
    cy.getByTestId(TestIds.ShowStatsToggle).should('exist');
    cy.contains('button', 'Export as CSV').should('exist');
    cy.getByTestId(TestIds.ExecuteVolumeButton).should('exist');
    cy.getByTestId(TestIds.ExecuteQueryButton).should('exist');
    cy.getByTestId(TestIds.ShowQueryToggle).should('exist');
    cy.getByTestId(TestIds.ToogleStreamingButton).should('exist');
    cy.getByTestId(TestIds.LogsTable).should('exist');
    cy.getByTestId(TestIds.TenantToggle).should('not.exist'); //Specical feature
    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes).click();
      cy.contains('li', 'Content');
      cy.contains('li', 'Namespaces').should('not.exist'); //Specical feature
      cy.contains('li', 'Pod');
      cy.contains('li', 'Containers');
    })
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) == "select" ) {
      cy.getByTestId(TestIds.SchemaToggle).should('exist');
    }
  });

  it('user can display applicatioins logs',{tags:['@smoke','@aggr']}, () => {
    //load Aggregated Logs for the first pod in APP_NAMESPACE1
    cy.get('[data-test-id="namespace-bar-dropdown"]')
      .find('button[aria-expanded="false"]')
      .click();
    cy.get('[data-test="namespace-dropdown-menu"]')
      .within(() => {
        cy.contains('button', `${APP_NAMESPACE1}`).click();
      });
    cy.get('a[data-test="resource-inventory-item"]')
      .filter(`[href="/k8s/ns/${APP_NAMESPACE1}/pods"]`)
      .click();

    cy.get('section.pf-v6-c-page__main-section')
      .contains('h1','Pods');
    cy.get('section[id="content-scrollable"]')
      .within(() => {
        cy.get('tr[data-test-rows="resource-row"]')
          .first()
          .find('td')
          .first()
          .find('a.co-resource-item__resource-name')
          .click();
       });
    cy.get('a[data-test-id="horizontal-link-Aggregated Logs"]').click();
    cy.getByTestId(TestIds.LogsTable,{ timeout: 20000 }).should('be.visible');
    cy.assertLogInLogsTable();
  });
  commonTests();
});
