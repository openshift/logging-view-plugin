import { TestIds } from '../../../src/test-ids';

const LOGS_PAGE_URL = '/monitoring/logs';
const LOGS_ALERTS_PAGE_URL = '/monitoring/alerts';
const USERS_PAGE_URL = '/k8s/cluster/user.openshift.io~v1~User';
const APP_NAMESPACE1 = "log-test-app1";
const APP_NAMESPACE2 = "log-test-app2";
const APP_MESSAGE = "SVTLogger";
const BLACKTICK = '`';

describe('Logs Page', () => {
  before( function() {
    cy.cliLogin("second_user")
    cy.grantLogRoles("second_user", `${APP_NAMESPACE1}`);
    cy.grantLogRoles("second_user", `${APP_NAMESPACE2}`);
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToAdministor();
    cy.uiImpersonateUser("second_user")
  });

  after( function() {
    cy.uiLogoutClusterAdmin("first_user");
    cy.uiLogoutUser("second_user");
    cy.removeLogRoles("second_user", `${APP_NAMESPACE1}`)
    cy.removeLogRoles("second_user", `${APP_NAMESPACE2}`)

  });

  it('display top elements', () => {
    cy.switchToAdministor();
    cy.getByTestId(TestIds.ToggleHistogramButton).should('exist');
    cy.getByTestId(TestIds.TimeRangeDropdown).should('exist');
    cy.getByTestId(TestIds.RefreshIntervalDropdown).should('exist');
    cy.getByTestId(TestIds.SyncButton).should('exist');
    cy.getByTestId(TestIds.AvailableAttributes).should('exist');
    cy.get('input[aria-label="Search by Content"]').should('exist');
    cy.getByTestId(TestIds.SeverityDropdown).should('exist');
    cy.getByTestId(TestIds.TenantToggle).should('exist');
    //ToDo: check SchemaToggle by condition
    //cy.getByTestId(TestIds.SchemaToggle).should('exist');
    cy.contains('button', 'Show Resources').should('exist');
    cy.getByTestId(TestIds.ShowStatsToggle).should('exist');
    cy.contains('button', 'Export as CSV').should('exist');
    cy.getByTestId(TestIds.ExecuteVolumeButton).should('exist');
    cy.getByTestId(TestIds.ExecuteQueryButton).should('exist');
    cy.getByTestId(TestIds.ShowQueryToggle).should('exist');
    cy.getByTestId(TestIds.LogsTable).should('exist');
  });
  //switchToDeveloper();
});
