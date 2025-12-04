import { TestIds } from '../../../src/test-ids';
import { commonTests } from './logs-common-test.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './logs-common-test.cy.ts';

let SKIPALL= false
describe('Admin in DevConsole ObserveLogs', () => {
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
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToDevConsole();
  });
  beforeEach( function() {
    // reload observe->logs for current pod in APP_NAMESPACE1
    cy.get('a[data-quickstart-id="qs-nav-monitoring"]').click();

    cy.get('[data-test-id="namespace-bar-dropdown"]')
      .find('button[aria-expanded="false"]')
      .click();
    cy.get('[data-test="dropdown-menu-item-link"]')
      .contains('button', `${APP_NAMESPACE1}`)
      .click();
    cy.get('[data-test-id="horizontal-link-Logs"]',{ timeout: 20000 }).click();
    cy.getByTestId(TestIds.LogsTable,{ timeout: 20000 }).should('be.visible');
  });

  after( function() {
    if (!SKIPALL) {
      cy.uiLogoutClusterAdmin("first_user");
    }
  });

  it('Log Panel top elements', {tags:['@smoke', 'observ']} , () => {
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
      cy.contains('li', 'Namespaces')
      cy.contains('li', 'Pod');
      cy.contains('li', 'Containers');
    });
  });

  it('admin can display application logs',{tags:['@smoke','observ']}, () => {
    cy.getByTestId(TestIds.LogsTable)
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
  
  it('admin can display infra container logs',{tags:['@smoke','observ']}, () => {
    // reload observe->logs
    cy.get('a[data-quickstart-id="qs-nav-monitoring"]').click();
    cy.get('[data-test-id="namespace-bar-dropdown"]')
      .find('button[aria-expanded="false"]')
      .click();
    cy.get('input[data-test="dropdown-text-filter"]')
      .type('openshift-monitoring')
    cy.get('input[data-test="showSystemSwitch"]').then($el => {
      if ($el.attr('data-checked-state') === 'false') {
        cy.wrap($el).click();
      }
    });
    cy.get('[data-test="dropdown-menu-item-link"]',{ timeout: 6000 })
      .contains('button', 'openshift-monitoring')
      .click();
    cy.get('[data-test-id="horizontal-link-Logs"]',{ timeout: 6000 }).click();

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
              cy.get('dl').should('contain.text', 'k8s_namespace_nameopenshift-monitoring');
          });
      });
  });

  it('admin can not display infra container logs in user project',{tags:['@smoke','observ']}, () => {
    let queryText = `{{}kubernetes_namespace_name="openshift-monitoring" {}}| json`
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) == "otel" ) {
      queryText = `{{}k8s_namespace_name="openshift-monitoring" {}}`
    }
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .clear()
      .type( queryText, { delay: 0 });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.LogsTable)
      .within(() => {
	cy.contains('h4.pf-v5-c-alert__title', 'Warning alert:No datapoints found')
      })
  });

  it('admin can not display infra node logs',{tags:['@smoke','observ']}, () => {
    let queryText = `{{}log_type="infrastructure" {}}| json| log_source="node"`
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) == "otel" ) {
      queryText = `{{}openshift-log-type="infrastructure"{}} | json| log_source="node"`
    }
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .clear()
      .type(`{{}openshift-log-type="infrastructure" {}}|json|log_source="node"`, { delay: 0 })
    cy.getByTestId(TestIds.ExecuteQueryButton).should('be.disabled');
    cy.get('div.pf-v5-c-form__alert')
      .should('contain.text', 'Danger alert:Please select a namespace');
  });

  it('admin can not display audit logs',{tags:['@smoke','observ']}, () => {
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .clear()
      .type(`{{}openshift-log-type="audit" {}}`, { delay: 0 })
    cy.getByTestId(TestIds.ExecuteQueryButton).should('be.disabled');
    cy.get('div.pf-v5-c-form__alert')
      .should('contain.text', 'Danger alert:Please select a namespace');
  });

  it('query with the selected pods',{tags:['@smoke','observ']}, () => {
    let pod1Name;
    let pod1NewName;
    cy.exec(`oc -n ${APP_NAMESPACE1} get pods -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exit')
      }
      pod1Name=result.stdout

      cy.exec(`oc -n ${APP_NAMESPACE1} delete pods ${pod1Name} --wait=true`).then((result) => {
        if (result.code !== 0) {
          throw new Error(`failed to delete the pod ${pod1Name}, exit`)
        }
        cy.exec(`oc -n ${APP_NAMESPACE1} get pods -o jsonpath={.items[0].metadata.name}`)
          .then((result) => {
            if (result.code !== 0) {
              throw new Error('failed to get podname, exit')
            }
            pod1NewName=result.stdout
            cy.exec(`oc -n ${APP_NAMESPACE1} wait pods/${pod1NewName} --for=condition=Ready`)
              .then((result) => {
                cy.log(`pod1Name ${pod1Name}`);
                cy.log(`pod1NewName ${pod1NewName}`);
              });
          });
      });
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Pods').click({ force: true });
        });
    })

    cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click();
    cy.get('div.pf-v5-c-menu.lv-plugin__search-select').within(() => {
      cy.contains('label.pf-v5-c-menu__item', `${pod1Name}`).find('input[type="checkbox"]').check({ force: true });
      cy.contains('label.pf-v5-c-menu__item', `${pod1NewName}`).find('input[type="checkbox"]').check({ force: true });
    });
    cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click(); //close the menu

    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .then((val) => {
        //{ kubernetes_pod_name=~"centos-logtest-xx|centos-logtest-yyy|centos-logtest-zzz" 
        expect(val).to.include(pod1Name);
        expect(val).to.include(pod1NewName);
      });

    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.assertLogInLogsTable();
  });

  it('query with selected container',{tags:['@smoke','observ']}, () => {
    let pod1Name
    cy.exec(`oc get pods -n ${APP_NAMESPACE1} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0) {
        throw new Error('failed to get podname, exiting test')
      }
      pod1Name=result.stdout
    });

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes)
        .first()
        .click({ force: true })
        .parent()
        .within(() => {
          cy.contains('Containers').click({ force: true });
        });
      cy.get('input').invoke('attr', 'placeholder').should('contain', 'Filter by Containers');
      cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click();
      cy.get('div.pf-v5-c-menu__content')
        .should('exist')
        .within(() => {
           cy.contains('centos-logtest').click({ force: true });
           cy.contains(`${pod1Name} / centos-logtest`).should('not.exist');  //Specical feature
	})
      cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click(); // close the menu
    });
    cy.getByTestId(TestIds.ShowQueryToggle).click({force: true});

    let pattern = /{ kubernetes_pod_name="centos-logtest-\w+",kubernetes_container_name="centos-logtest" } | json/;
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) === "otel") {
      pattern = /{ k8s_pod_name="centos-logtest-\w+", k8s_container_name="centos-logtest" }/;
    }
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('match', pattern);
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.assertLogInLogsTable();
  });
  commonTests();
})
