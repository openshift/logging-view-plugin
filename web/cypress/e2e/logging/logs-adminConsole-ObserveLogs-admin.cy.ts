import { TestIds } from '../../../src/test-ids';
import { commonTests } from './logs-common-test.cy.ts';
import { APP_NAMESPACE1,APP_NAMESPACE2,APP_MESSAGE } from './logs-common-test.cy.ts';

describe('Admin in AdminConsole ObserveLogs', () => {
  before( function() {
    cy.uiLoginAsClusterAdmin("first_user");
    cy.switchToAdmConsole();
    cy.get('button[data-quickstart-id="qs-nav-home"]').click();
    cy.get('button[data-quickstart-id="qs-nav-monitoring"]').click();
  });

  beforeEach( function() {
    // Load the other page to ensure Observe-Logs in clean status
    cy.get('section.pf-v6-c-nav__subnav').contains('a','Search').click();
    // load observe->logs
    cy.get('section.pf-v6-c-nav__subnav').contains('a','Logs').click();
    cy.getByTestId(TestIds.LogsTable,{ timeout: 6000 }).should('be.visible');
  });

  after( function() {
    cy.uiLogoutClusterAdmin("first_user");
  });

  it('Log Panel top elements', {tags:['@smoke', 'observ']} , () => {
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

  it('admin can display applicatioins logs',{tags:['@smoke', 'observ']}, () => {
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .clear()
      .type(`{{}kubernetes_namespace_name="${APP_NAMESPACE1}" {}}`, { delay: 0 })
      .then(() => {
        cy.getByTestId(TestIds.ExecuteQueryButton)
          .click()
          .then(() => {
            cy.assertLogInLogsTable();
          });
      });
  });

  it('admin can display infra container logs',{tags:['@smoke', 'observ']}, () => {
    cy.getByTestId(TestIds.TenantToggle).click();
    cy.get('#logging-view-tenant-dropdown')
      .contains('button', 'infrastructure')
      .click();
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .clear()
      .type('{{}log_type="infrastructure"{}}|json|log_source="container"', { delay: 0 })
      .then(() => {
        cy.getByTestId(TestIds.ExecuteQueryButton)
         .click()
         .then(() => {
            cy.assertLogInLogsTable();
         });
      })
  });

  it('admin can display infra node logs',{tags:['@smoke','observ']}, () => {
    cy.getByTestId(TestIds.TenantToggle).click();
    cy.get('#logging-view-tenant-dropdown')
      .contains('button', 'infrastructure')
      .click();
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .clear()
      .type('{{}log_type="infrastructure"{}}|json|log_source="node"', { delay: 0 })
      .then(() => {
        cy.getByTestId(TestIds.ExecuteQueryButton)
          .click()
          .then(() => {
            cy.assertLogInLogsTable();
        });
      });
  });

  it('admin can display audit logs',{tags:['@smoke','observ']}, () => {
    cy.getByTestId(TestIds.TenantToggle).click();
    cy.get('#logging-view-tenant-dropdown')
      .contains('button', 'audit')
      .click();
    cy.getByTestId(TestIds.ShowQueryToggle).click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .clear()
      .type('{{}log_type="audit"{}}', { delay: 0 })
      .then(() => {
        cy.getByTestId(TestIds.ExecuteQueryButton)
          .click()
          .then(() => {
            cy.assertLogInLogsTable();
          });
      });
  });

  it('query with the selected namespaces',{tags:['@smoke','observ']}, () => {
    const namespaces=[APP_NAMESPACE1, APP_NAMESPACE2]

    cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes).click();
      cy.contains('Namespaces').click({ force: true });
    })
    cy.get('[data-test="AttributeOptions"] .pf-v5-c-menu-toggle__button').click();
    cy.get('.pf-v5-c-menu.lv-plugin__search-select').within(() => {
      namespaces.forEach(ns => {
        cy.contains('label.pf-v5-c-menu__item', ns)
          .find('input[type="checkbox"]')
          .check({ force: true });
        });
    });
    cy.get('[data-test="AttributeOptions"] .pf-v5-c-menu-toggle__button').click(); //close menu
    cy.getByTestId(TestIds.ShowQueryToggle).click({force: true});
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .then((val) => {
        expect(val).to.include(APP_NAMESPACE1);
        expect(val).to.include(APP_NAMESPACE2);
      });

    const pattern = new RegExp(`${APP_NAMESPACE1}|${APP_NAMESPACE2}`);
    cy.getByTestId(TestIds.LogsTable).within(() => {
      //  Click the first expand button
      cy.get('#expand.pf-v5-c-table__td.lv-plugin__table__expand.pf-v5-c-table__toggle', { timeout: 6000 })
        .first()
        .find('button')
        .click({ force: true });

      //  Wait for the details row to appear
      cy.get('td.pf-v5-c-table__td.lv-plugin__table__details', { timeout: 6000 })
        .should('exist')
        .within(() => {
          //  Verify the content
          cy.contains('div.pf-v5-c-description-list__text', pattern).should('exist');
        });
     });
  });

  it('query with the selected pods',{tags:['@smoke','observ']}, () => {
    let pod1Name;
    let pod1NewName;
    let pod2Name;
    cy.exec(`oc -n ${APP_NAMESPACE1} get pods -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0  || !result.stdout ) {
        throw new Error('failed to get podname, exit')
      }
      pod1Name=result.stdout

      cy.exec(`oc -n ${APP_NAMESPACE1} delete pods ${pod1Name} --wait=true`).then((result) => {
        if (result.code !== 0  || !result.stdout ) {
          throw new Error(`failed to delete the pod ${pod1Name}, exit`)
        }
        cy.exec(`oc -n ${APP_NAMESPACE1} get pods -o jsonpath={.items[0].metadata.name}`)
          .then((result) => {
            if (result.code !== 0  || !result.stdout ) {
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

    cy.exec(`oc -n ${APP_NAMESPACE2} get pods -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0  || !result.stdout ) {
        throw new Error('failed to get podname, exit')
      }
      pod2Name=result.stdout
    })
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
      cy.contains('label.pf-v5-c-menu__item', `${pod2Name}`).find('input[type="checkbox"]').check({ force: true });
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
        expect(val).to.include(pod2Name);
      });

    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.assertLogInLogsTable();
  });

  it('query with selected container',{tags:['@smoke','observ']}, () => {
    let pod1Name
    let pod2Name
    cy.exec(`oc get pods -n ${APP_NAMESPACE1} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0  || !result.stdout ) {
        throw new Error('failed to get podname, exiting test')
      }
      pod1Name=result.stdout
    });
    cy.exec(`oc get pods -n ${APP_NAMESPACE2} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0  || !result.stdout ) {
        throw new Error('failed to get podname, exiting test')
      }
      pod2Name=result.stdout
    });

    cy.getByTestId(TestIds.TenantToggle).click();
    cy.get('#logging-view-tenant-dropdown')
      .contains('button', 'application')
      .click();

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
      cy.contains(`${pod1Name} / centos-logtest`).click({ force: true });
      cy.contains(`${pod2Name} / centos-logtest`).click({ force: true });
      cy.get('div[data-test="AttributeOptions"]').find('button.pf-v5-c-menu-toggle__button').click(); // close the menu
    });
    cy.getByTestId(TestIds.ShowQueryToggle).click({force: true});
    let pattern = /{ kubernetes_container_name="centos-logtest", kubernetes_pod_name=~"centos-logtest-\w+|centos-logtest-\w+" } | json/;
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) === "otel") {
      pattern = /{ k8s_container_name="centos-logtest", k8s_pod_name=~"centos-logtest-\w+|centos-logtest-\w+" } /;
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
