//Common logging UI Cases
import { TestIds } from '../../../src/test-ids';
export const APP_NAMESPACE1 = "log-test-app1";
export const APP_NAMESPACE2 = "log-test-app2";
export const APP_MESSAGE = "SVTLogger";

export function commonTests() {
  it('filter logs by last duration ',{tags:['@common']}, () => {
    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 5 minutes').click();
      });
    cy.url().should('match', /start=now-5m&end=now/);
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 2 hours').click();
      });
    cy.url().should('match', /start=now-2h&end=now/);
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 1 day').click();
      });
    cy.url().should('match', /start=now-1d&end=now/);
    cy.getByTestId(TestIds.LogsTable)
      .find('tr.pf-v5-c-table__tr.lv-plugin__table__row')
      .should('have.length.greaterThan', 0);

    cy.getByTestId(TestIds.ToggleHistogramButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 2 weeks').click();
      });
    cy.url().should('match', /start=now-2w&end=now/);
    // recover to 1 hour
    cy.getByTestId(TestIds.ToggleHistogramButton).click(); 
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 1 hour').click();
      });
  });

  it('filter logs by custom range',{tags:['@common']}, () => { 
    const pad = (num) => num.toString().padStart(2, '0');
    const now = new Date();
    // startDate = now-3day 
    const startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const startDay = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
    // endDate = now-2day
    const endDate = new Date(now.getTime() - 2* 24 * 60 * 60 * 1000)
    // Format as 'YYYY-MM-DD'
    const endDay = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
    // Format as 'hh:mm'
    const startTime = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
    const endTime = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;

    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Custom time range').click();
      });
    cy.getByTestId(TestIds.TimeRangeSelectModal).within(() => {
      cy.get('input[aria-label="Date picker"]').first().clear().type(`${startDay}`).blur();
      cy.get('input[aria-label="Precision time picker"]').first().clear().type(`${startTime}{enter}`);

      cy.get('input[aria-label="Date picker"]').last().clear().type(`${endDay}`).blur();
      cy.get('input[aria-label="Precision time picker"]').last().clear().type(`${endTime}{enter}`);
    });
    cy.getByTestId(TestIds.TimeRangeDropdownSaveButton).click();
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .within(() => {
        cy.contains(`${startDay} ${startTime} - ${endDay} ${endTime}`);
      });

    //Remove milleseconds as we won't provide it in console
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes())
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endDate.getHours(), endDate.getMinutes())
    cy.url().should('match', new RegExp(`start=${start.getTime()}&end=${end.getTime()}`));
    // recover to 1 hour
    cy.getByTestId(TestIds.ToggleHistogramButton).click(); //recover to 1 hour
    cy.getByTestId(TestIds.TimeRangeDropdown)
      .click()
      .within(() => {
        cy.contains('Last 1 hour').click();
      });
  });

  // search APP_NAMESPACE1, this ensure the case succeed in Observe/Logs when there multiple namespace
  it('search by content and show resources ',{tags:['@common']}, () => {
   cy.getByTestId(TestIds.AttributeFilters).within(() => {
      cy.getByTestId(TestIds.AvailableAttributes).click();
      cy.contains('Content').click({ force: true });
      cy.get('input[aria-label="Search by Content"]')
        .clear() 
        .type(APP_NAMESPACE1, {delay: 0})
      });
    cy.getByTestId(TestIds.ExecuteQueryButton).click();
    cy.getByTestId(TestIds.ShowQueryToggle).click({force: true});
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('include', APP_NAMESPACE1)
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.exec(`oc get pods -n ${APP_NAMESPACE1} -o jsonpath={.items[0].metadata.name}`).then((result) => {
      if (result.code !== 0  || !result.stdout ) {
        throw new Error('failed to get podname, abort test')
      }
      const pod1Name=result.stdout
      cy.getByTestId(TestIds.ExecuteQueryButton).click();
      cy.get('div.pf-v5-c-toolbar__group').contains('button', 'Show Resources').click(); 
      cy.getByTestId(TestIds.LogsTable).within(() => {
        cy.get('td[data-label="message"]')
          .first()
          .within(()=> {
            cy.get(`a[href="/k8s/cluster/namespaces/${APP_NAMESPACE1}"]`).should('exist');
            cy.get(`a[href="/k8s/ns/${APP_NAMESPACE1}/pods/${pod1Name}"]`).should('exist');
            cy.get(`a[href="/k8s/ns/${APP_NAMESPACE1}/pods/${pod1Name}/containers/centos-logtest"]`).should('exist')
          });
        });
    });
  });

  it('validate Viaq log format for container',{tags:['@common']}, function () {
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) !== "viaq") {
      this.skip();
    }
    const viaqFields = [
      '_timestamp',
      'kubernetes_container_name',
      'kubernetes_container_id',
      'kubernetes_labels_run',
      'kubernetes_labels_test',
      'kubernetes_pod_name',
      'kubernetes_pod_ip',
      'kubernetes_namespace_id',
      'kubernetes_namespace_name',
      'kubernetes_host',
      'openshift_cluster_id',
      'openshift_sequence',
      'log_type',
      'level',
      'message',
      'hostname',
      'openshift_log_type'
    ];
    const otelFields = [
      'k8s_container_name',
      'k8s_pod_name',
      'k8s_namespace_name',
      'k8s_node_name',
      'openshift_log_type',
      'kubernetes_container_name',
      'kubernetes_pod_name',
      'kubernetes_namespace_name',
      'kubernetes_host',
      'log_type'
    ];
    const isoTimestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/;
    const viaqlogFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} - SVTLogger - INFO - .*$/

    cy.getByTestId(TestIds.ShowQueryToggle).click({force: true});
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('include', '| json');

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('td[data-label="message"]')
	  .first()
	  .invoke('text')
	  .should('match', viaqlogFormat);

        cy.get('tr[data-test-rows="resource-row"]')
          .first()
          .find('button')
          .click({force: true});

        // Check details fields
        cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
          .should('exist')
	  .within(() => {
            // To be Compatible with with Otel, Viaq include all Otel label
            viaqFields.forEach(field => {
              cy.contains('dt', field);
            });
            otelFields.forEach(field => {
              cy.contains('dt', field);
            });
            //validate some key
            cy.get('dl')
              .contains('dt', '_timestamp')
              .next('dd')
              .invoke('text')
              .should('match', isoTimestampRegex);
            cy.get('dl')
              .contains('dt', 'kubernetes_namespace_name') 
              .next('dd') 
              .should('have.text', APP_NAMESPACE1); 
            cy.get('dl')
              .contains('dt', 'log_type') 
              .next('dd') 
              .should('have.text', 'application');
            cy.get('dl')
              .contains('dt', 'openshift_log_type') 
              .next('dd') 
              .should('have.text', 'application');
            cy.get('dl')
              .contains('dt', 'level') 
              .next('dd') 
              .should('have.text', 'info'); 
            cy.get('dl')
              .contains('dt', 'message') 
            
            // Conditional fields based on CLUSTERLOGGING_VERSION
            const version = String(Cypress.env('CLUSTERLOGGING_VERSION'));
            if (version !== '5.8' && version !== '5.9') {
              cy.get('dl')
                .contains('dt', 'log_source') 
                .next('dd')                  
                .should('have.text', 'container');
            }
          });
      });
  });

  it('validate Otel log format for container',{tags:['@common']}, function(){
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) != "otel" ) {
      this.skip();
    }
    const viaqOnlyFields = [
      '_timestamp',
      'kubernetes_container_id',
      'kubernetes_labels_run',
      'kubernetes_labels_test',
      'kubernetes_pod_ip',
      'kubernetes_namespace_id',
      'openshift_cluster_id',
      'openshift_sequence',
      'level',
      'message',
      'hostname',
    ];
    const otelFields = [
      'k8s_container_name',
      'k8s_pod_name',
      'k8s_namespace_name',
      'k8s_node_name',
      'openshift_log_type',
      'kubernetes_container_name',
      'kubernetes_pod_name',
      'kubernetes_namespace_name',
      'kubernetes_host',
      'log_type'
    ];
    const otellogFormat = /^\{.*"@timestamp":".+?",.*"hostname":".+?",.*"kubernetes":\{.*\},.*"level":"\w+",.*"log_source":"container",.*"log_type":"application",.*"message":".+?",.*"openshift":\{.*\}.*\}$/

    cy.getByTestId(TestIds.ShowQueryToggle).click({force: true});
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('not.include', '| json');
    cy.getByTestId(TestIds.ExecuteQueryButton).click();

    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('td[data-label="message"]')
	  .first()
	  .invoke('text')
	  .should('match', otellogFormat);

        // Check details fields
        cy.get('tr[data-test-rows="resource-row"]')
          .first()
          .find('button')
          .click({force: true});

        cy.get('td.pf-v5-c-table__td.lv-plugin__table__details')
          .should('exist')
          .within(() => {
            // To be Compatible with with Otel, Viaq include all Otel label
            viaqOnlyFields.forEach(field => {
              cy.contains('dt', field).should('not.exist')
            });
            otelFields.forEach(field => {
              cy.contains('dt', field);
            });
            //validate some key
            cy.get('dl')
              .contains('dt', 'kubernetes_namespace_name')
              .next('dd')
              .should('have.text', APP_NAMESPACE1);
            cy.get('dl')
              .contains('dt', 'k8s_namespace_name')
              .next('dd')
              .should('have.text', APP_NAMESPACE1);
            cy.get('dl')
              .contains('dt', 'log_type')
              .next('dd')
              .should('have.text', 'application');
            cy.get('dl')
              .contains('dt', 'openshift_log_type')
              .next('dd')
              .should('have.text', 'application');
          });
      });
  });

  it('Switch the dataFormat',{tags:['@common']}, function () {
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) != "select" ) {
        this.skip();
    }
    const viaqlogFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} - SVTLogger - INFO - .*$/
    const otellogFormat = /^\{.*"@timestamp":".+?",.*"hostname":".+?",.*"kubernetes":\{.*\},.*"level":"\w+",.*"log_source":"container",.*"log_type":"application",.*"message":".+?",.*"openshift":\{.*\}.*\}$/

    //default viaq
    cy.getByTestId(TestIds.SchemaToggle)
      .invoke('text')
      .should('eq', 'viaq');
    cy.get('button[data-test="ShowQueryToggle"]').click();
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('include', '| json');
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        // Check first message matches viaqlogFormat
        cy.get('td[data-label="message"]')
           .first()
           .invoke('text')
           .should('match', viaqlogFormat);
      });

    //switch to Otel
    cy.getByTestId(TestIds.SchemaToggle).click({force: true});
    cy.get('div.pf-v5-c-menu__content')
      .contains('button.pf-v5-c-menu__item', 'otel')
      .click();
    cy.get('button[data-test="ShowQueryToggle"]').then(($btn) => {
      if ($btn.text().includes('Show Query')) {
        cy.wrap($btn).click();
      }
    });
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('not.include', '| json');
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        // Check first message matches otellogFormat
        cy.get('td[data-label="message"]')
           .first()
           .invoke('text')
           .should('match', viaqlogFormat);
      });

    //switch back to Viaq
    cy.getByTestId(TestIds.SchemaToggle).click({force: true});
    cy.get('div.pf-v5-c-menu__content')
      .contains('button.pf-v5-c-menu__item', 'viaq')
      .click();
    cy.get('button[data-test="ShowQueryToggle"]').then(($btn) => {
      if ($btn.text().includes('Show Query')) {
        cy.wrap($btn).click();
      }
    });
    cy.getByTestId(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('include', '| json');
    cy.getByTestId(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('td[data-label="message"]')
	  .first()
	  .invoke('text')
	  .should('match', viaqlogFormat);
      });
  });
}
