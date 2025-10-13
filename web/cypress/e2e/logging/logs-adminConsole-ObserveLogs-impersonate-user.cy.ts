import { TestIds } from '../../../src/test-ids';
import { commonTests } from './logs-common-test.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './logs-common-test.cy.ts';

describe.skip('Impersonate User in AdminConsole ObserveLogs  ', () => {
  before( function() {
    cy.cliLogin("second_user");
    cy.grantLogRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToAdmConsole();
    cy.uiImpersonateUser("second_user");
    cy.switchToAdmConsole();
    cy.get('button[data-quickstart-id="qs-nav-home"]').click();
    cy.get('button[data-quickstart-id="qs-nav-monitoring"]').click();
  });

  beforeEach( function() {
    // Load the other page to ensure Observe-Logs in clean status
    cy.get('section.pf-v6-c-nav__subnav').contains('a','Search').click();
    // load observe->logs
    cy.get('section.pf-v6-c-nav__subnav a[href="/monitoring/logs"]',{ timeout: 6000 }).click();
    cy.getByTestId(TestIds.LogsTable,{ timeout: 20000 }).should('be.visible');
  });

  after( function() {
    cy.uiLogoutUser("second_user");
    cy.removeLogRoles("second_user", `${APP_NAMESPACE1}`);
    cy.removeLogRoles("second_user", `${APP_NAMESPACE2}`);
  });

  it('validate elements in Observe Logs',{tags:['@smoke','observ']}, () => {
    cy.getByTestId(TestIds.ToggleHistogramButton).should('exist');
    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');
    cy.getByTestId(TestIds.RefreshIntervalDropdown).should('exist');
    cy.getByTestId(TestIds.SyncButton).should('exist');
    cy.getByTestId(TestIds.AvailableAttributes).should('exist');
    cy.getByTestId(TestIds.SeverityDropdown).should('exist');
    cy.getByTestId(TestIds.TenantToggle).should('exist');
    cy.contains('button', 'Show Resources').should('exist');
    cy.getByTestId(TestIds.ShowStatsToggle).should('exist');
    cy.contains('button', 'Export as CSV').should('exist');
    cy.getByTestId(TestIds.ExecuteVolumeButton).should('exist');
    cy.getByTestId(TestIds.ExecuteQueryButton).should('exist');
    cy.getByTestId(TestIds.ShowQueryToggle).should('exist');
    cy.getByTestId(TestIds.LogsTable).should('exist');
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) == "select" ) {
      cy.getByTestId(TestIds.SchemaToggle).should('exist');
    }
    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes).click();
      cy.contains('li', 'Content');
      cy.contains('li', 'Namespaces');
      cy.contains('li', 'Pod');
      cy.contains('li', 'Containers');
    });
  });

  it('user can display application logs',{tags:['@smoke','observ']}, () => {
    //Known issue: logs can not be displayed in AdminConsole observe->logs
    cy.getByTestId(TestIds.TenantToggle)
      .click()
      .get('#logging-view-tenant-dropdown')
      .contains('button', 'application')
      .click()
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('div.lv-plugin__table__row-error', { timeout: 600  }).should('contain', 'Forbidden');
      })
  });

  it('user can not display infra logs',{tags:['@smoke','observ']}, () => {
    cy.getByTestId(TestIds.TenantToggle)
      .click()
      .get('#logging-view-tenant-dropdown')
      .contains('button', 'infrastructure')
      .click()
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('div.lv-plugin__table__row-error', { timeout: 600  }).should('contain', 'Forbidden');
      })
  });

  it('user can not display audit logs',{tags:['@smoke','observ']}, () => {
    cy.getByTestId(TestIds.TenantToggle)
      .click()
      .get('#logging-view-tenant-dropdown')
      .contains('button', 'audit')
      .click()
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('div.lv-plugin__table__row-error', { timeout: 600  }).should('contain', 'Forbidden');
      })
  });
});
