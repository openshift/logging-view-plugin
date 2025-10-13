import { TestIds } from '../../../src/test-ids';
import { commonTests } from './logs-common-test.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './logs-common-test.cy.ts';

let SKIPALL;
describe('Impersonate User in devConsole AggregatedLogs', () => {
  before( function() {
    //Check if DevConsole is enabled in 4.19+
    const version = Cypress.env('OPENSHIFT_VERSION');
    const [major, minor] = version.split('.').map(Number);
    if (major > 4 || (major === 4 && minor > 19)) {
      cy.log('Check if devConsole is enabled');
      cy.exec(`oc get console.operator cluster -o jsonpath='{.spec.customization.perspectives}'`).then((result) => {
        if (result.stdout != `[{"id":"dev","visibility":{"state":"Enabled"}}]`){
          cy.log('DeveloperConsole is not ready — skipping suite');
          SKIPALL= true
          this.skip();
        }
      })
    }
    cy.cliLogin("second_user");
    cy.grantLogRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToAdmConsole();
    cy.uiImpersonateUser("second_user");
    cy.switchToDevConsole();
  });

  beforeEach( function() {
    //hover on project page
    cy.get('a[data-quickstart-id="qs-nav-project"]').click();
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutUser("second_user");
      cy.removeLogRoles("second_user", `${APP_NAMESPACE1}`);
      cy.removeLogRoles("second_user", `${APP_NAMESPACE2}`);
    }
  });

  it('user can display application container logs',{tags:['@smoke','@aggr']}, () => {
    cy.get('[data-test-id="namespace-bar-dropdown"]')
      .find('button[aria-expanded="false"]')
      .click();
   cy.get('[data-test="dropdown-menu-item-link"]',{ timeout: 6000 })
     .contains('button', `${APP_NAMESPACE1}`)
     .click();
    cy.get('a[data-test="resource-inventory-item"]')
      .filter(`[href="/k8s/ns/${APP_NAMESPACE1}/pods"]`)
      .click();
    cy.get('tr[data-test-rows="resource-row"]')
      .first()
      .find('td')
      .first()
      .find('a.co-resource-item__resource-name')
      .click();
    cy.get('a[data-test-id="horizontal-link-Aggregated Logs"]').click();
    cy.getByTestId(TestIds.LogsTable,{ timeout: 20000 })
      .within(() => {
        cy.get('td[data-label="message"]').should('exist');
        // Check details fields
        cy.get('tr[data-test-rows="resource-row"]')
          .first()
          .find('button')
          .click({force: true});
        cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
          .should('exist')
          .within(() => {
              cy.get('dl').should('contain.text', `k8s_namespace_name${APP_NAMESPACE1}`);
          });
      });
  });
  it('user can not display infra container logs',{tags:['@smoke','@aggr']}, () => {
    cy.get('[data-test-id="namespace-bar-dropdown"]')
      .find('button[aria-expanded="false"]')
      .click();
    cy.get('input[data-test="showSystemSwitch"]').should('not.exist');
  });
});
