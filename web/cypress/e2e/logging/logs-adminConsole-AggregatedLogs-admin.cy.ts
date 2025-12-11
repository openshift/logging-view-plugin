import { TestIds } from '../../../src/test-ids';
import { commonTests } from './logs-common-test.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './logs-common-test.cy.ts';

describe('Admin in AdminConsole AggregatedLogs', () => {
  before( function() {
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToAdmConsole();
    cy.get('button[data-quickstart-id="qs-nav-workloads"]').click();
  });

  beforeEach( function() {
    //Hover on WorkLoad -> Pods page
    cy.get('[id="page-sidebar"]')
      .within(() => {
        cy.contains('a[data-test="nav"]', 'Pods').click();
      })
   });

  after( function() {
    //cy.uiLogoutClusterAdmin("first_user");
  });

  it('Log Panel top elements', {tags:['@smoke','@aggr']} , () => {
    //load Aggregated Logs for the first pod in APP_NAMESPACE1
    cy.get('[data-test-id="namespace-bar-dropdown"]')
      .find('button[aria-expanded="false"]')
      .click();

    cy.get('[data-test="namespace-dropdown-menu"]')
      .within(() => {
        cy.contains('button', `${APP_NAMESPACE1}`).click();
      });

    cy.get('tr[data-test-rows="resource-row"]')
      .first()
      .find('td')
      .first()
      .find('a.co-resource-item__resource-name')
      .click();
    cy.get('a[data-test-id="horizontal-link-Aggregated Logs"]').click();

    cy.getByTestId(TestIds.ToggleHistogramButton).should('exist');
    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');
    cy.getByTestId(TestIds.RefreshIntervalDropdown).should('exist');
    cy.getByTestId(TestIds.SyncButton).should('exist');
    cy.getByTestId(TestIds.AvailableAttributes).should('exist');
    cy.getByTestId(TestIds.SeverityDropdown).should('exist');
    cy.getByTestId(TestIds.TenantToggle).should('not.exist');
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
      cy.contains('li', 'Namespaces').should('not.exist');
      cy.contains('li', 'Pod');
      cy.contains('li', 'Containers');
    });
  });

  it('admin can display applicatioins logs',{tags:['@smoke', '@aggr']}, () => {
    //load Aggregated Logs for the first pod in APP_NAMESPACE1
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
    cy.assertLogInLogsTable();
  });

  it('admin can display infra container logs',{tags:['@smoke','@aggr']}, () => {
   //load Aggregated Logs for pod in openshift-monitoring
    cy.get('[data-test-id="namespace-bar-dropdown"]')
      .find('button[aria-expanded="false"]')
      .click();
    cy.get('input[data-test="dropdown-text-filter"]').type('openshift-monitoring');
    cy.get('input[data-test="showSystemSwitch"]').then($el => {
      if ($el.attr('data-checked-state') === 'false') {
        cy.wrap($el).click();
      }
    });
    cy.get('[data-test="dropdown-menu-item-link"]',{ timeout: 6000 })
      .contains('button', 'openshift-monitoring')
      .click();
    cy.get('section.pf-v6-c-page__main-section')
      .contains('h1','Pods');
    //Click the pod alertmanager-main-0
    cy.get('tbody[role="rowgroup"]')
      .find('a[data-test-id="alertmanager-main-0"]')
      .click();
    //click Aggregated Logs tab
    cy.get('a[data-test-id="horizontal-link-Aggregated Logs"]').click();
    cy.getByTestId(TestIds.LogsTable,{ timeout: 20000 }).should('be.visible');
    cy.assertLogInLogsTable();
  });
})
