//Common logging UI Cases
//Note: the default namespace is APP_NAMESPACE1 for all test in this file
import { TestIds } from '../../../src/test-ids';
export const APP_NAMESPACE1 = "log-test-app1";
export const APP_NAMESPACE2 = "log-test-app2";
export const APP_MESSAGE = "SVTLogger";

export function isDevConsoleReady(): boolean {
  //Check if DevConsole is enabled in 4.19+
  const rawversion = Cypress.env('OPENSHIFT_VERSION');
  if (!rawversion) {
    throw new Error('OPENSHIFT_VERSION is not defined');
  }
  const version = String(rawversion)
  const [major, minor] = version.split('.').map(Number);
  if (major > 4 || (major === 4 && minor > 18)) {
    return cy.exec("oc get console.operator cluster -o jsonpath='{.spec.customization.perspectives}'", { failOnNonZeroExit: false })
      .then((result) => {
        const devReady = result.stdout === '[{"id":"dev","visibility":{"state":"Enabled"}}]';
        return devReady; 
      });
  }
  return cy.wrap(true);
}

export function getRunningPodName(namespace: string, labelSelector?: string) {
  // Build the oc command
  let cmd = `oc get pods -n ${namespace} --field-selector=status.phase=Running -o jsonpath="{.items[0].metadata.name}"`
  if (labelSelector) {
    cmd += ` -l ${labelSelector}`
  }
  return cy.exec(cmd).then((res) => res.stdout.trim())
}

export function aggrLogTest() {
  it('validate elements in Aggregated Logs',{tags:['@aggr']}, () => {
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
      cy.contains('li', 'Namespaces').should('not.exist'); //Specical feature
    })
    if (Cypress.env('CLUSTERLOGGING_DATAMODE') === "select" ) {
      cy.byTestID(TestIds.SchemaToggle).should('exist');
    }
  })

  it('Show Resources',{tags:['@common']}, () => {
    cy.get('button').contains('Show Resources').click();
    getRunningPodName(APP_NAMESPACE1).then((pod1Name) => {
      const pods = [pod1Name]
      cy.checkLogPods(pods);
      cy.byTestID(TestIds.ExecuteQueryButton).click();
      cy.byTestID(TestIds.LogsTable).within(() => {
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

  //verify we can select both running and deleted pods
  it('select both running and deleted pods',{tags:['@aggr']}, () => {
    getRunningPodName(APP_NAMESPACE1).as('pod1Name');
    cy.get('@pod1Name').then((podName) => {
       cy.exec(`oc -n ${APP_NAMESPACE1} delete pods ${podName} --wait=true`);
    });
    getRunningPodName(APP_NAMESPACE1).as('pod1NewName');
    cy.get('@pod1NewName').then((pod1NewName) => {
      cy.exec(`oc -n ${APP_NAMESPACE1} wait pods/${pod1NewName} --for=condition=Ready`);
    });

    cy.get('@pod1Name').then((pod1Name) => {
      cy.get('@pod1NewName').then((pod1NewName) => {
        const pods = [pod1Name, pod1NewName]
        cy.log(`pod1Name=${pod1Name},pod1NewName=${pod1NewName}`);
        //cy.task('log', `pod1Name=${pod1Name} pod1NewName=${pod1NewName}`);
        cy.checkLogPods(pods);
        cy.showLogQueryInput();
        cy.byTestID(TestIds.LogsQueryInput)
          .find('textarea')
          .invoke('val')
          .then((val) => {
            //{ kubernetes_pod_name=~"centos-logtest-xx|centos-logtest-yyy" 
            expect(val).to.include(pod1Name)
            expect(val).to.include(pod1NewName)
          });
        cy.byTestID(TestIds.ExecuteQueryButton).click();
        const indexFields : IndexField = [
          { name: 'openshift_log_type', value: "application" },
          { name: 'k8s_namespace_name', value: APP_NAMESPACE1 },
          { name: 'k8s_pod_name', value: `${pod1Name}|${pod1NewName}` },
        ]
        cy.assertFieldsInLogDetail(indexFields);
      });
    });
  });

  it('selected containers',{tags:['@aggr']}, () => {
    const containers = ['centos-logtest']
    cy.log(`container=centos-logtest`);
    cy.checkLogContainers(containers);

    cy.showLogQueryInput();
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
        { name: 'k8s_namespace_name', value: `${APP_NAMESPACE1}` },
        { name: 'k8s_container_name', value: 'centos-logtest' },
      ]
      cy.assertFieldsInLogDetail(indexFields)
  });
}

export function observeLogTest() {

  it('Show Resources',{tags:['@common']}, () => {
    cy.get('button').contains('Show Resources').click();
    getRunningPodName(APP_NAMESPACE1).then((pod1Name) => {
      const namespaces = [APP_NAMESPACE1]
      const pods = [pod1Name]
      cy.checkLogNamespaces(namespaces);
      cy.checkLogPods(pods);
      cy.byTestID(TestIds.ExecuteQueryButton).click();
      cy.byTestID(TestIds.LogsTable).within(() => {
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

  it('selected namespaces',{tags:['@observ']}, () => {
    const namespaces=[APP_NAMESPACE1, APP_NAMESPACE2]
    cy.checkLogNamespaces(namespaces);
    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .then((val) => {
        expect(val).to.include(APP_NAMESPACE1);
        expect(val).to.include(APP_NAMESPACE2);
      });

    const indexFields : IndexField = [
      { name: 'openshift_log_type', value: "application" },
      { name: 'k8s_namespace_name', value: `${APP_NAMESPACE1}|${APP_NAMESPACE2}` },
    ]
    cy.assertFieldsInLogDetail(indexFields)
  });

  //verify we can select both running and deleted pods
  it('select both running and deleted pods',{tags:['@observ']}, () => {
    getRunningPodName(APP_NAMESPACE1).as('pod1Name');
    cy.get('@pod1Name').then((podName) => {
       cy.exec(`oc -n ${APP_NAMESPACE1} delete pods ${podName} --wait=true`);
    });
    getRunningPodName(APP_NAMESPACE1).as('pod1NewName');
    cy.get('@pod1NewName').then((pod1NewName) => {
      cy.exec(`oc -n ${APP_NAMESPACE1} wait pods/${pod1NewName} --for=condition=Ready`);
    });
    getRunningPodName(APP_NAMESPACE2).as('pod2Name');

    cy.get('@pod1Name').then((pod1Name) => {
      cy.get('@pod1NewName').then((pod1NewName) => {
        cy.get('@pod2Name').then((pod2Name) => {
          const pods = [pod1Name, pod1NewName, pod2Name]
          cy.log(`pod1Name=${pod1Name},pod1NewName=${pod1NewName}, pod2Name=${pod2Name}`);
          cy.checkLogPods(pods);
          //cy.task('log', `pod1Name=${pod1Name} pod1NewName=${pod1NewName}, pod2Name=${pod2Name} `);
          cy.showLogQueryInput();
          cy.byTestID(TestIds.LogsQueryInput)
            .find('textarea')
            .invoke('val')
            .then((val) => {
              //{ kubernetes_pod_name=~"centos-logtest-xx|centos-logtest-yyy|centos-logtest-zzz" 
              expect(val).to.include(pod1Name);
              expect(val).to.include(pod1NewName);
              expect(val).to.include(pod2Name);
            });
          cy.byTestID(TestIds.ExecuteQueryButton).click();
          const indexFields : IndexField = [
            { name: 'openshift_log_type', value: "application" },
            { name: 'k8s_namespace_name', value: `${APP_NAMESPACE1}|${APP_NAMESPACE2}` },
            { name: 'k8s_pod_name', value: `${pod1Name}|${pod1NewName}|${pod2Name}` },
          ]
          cy.assertFieldsInLogDetail(indexFields);
        });
      });
    });
  });
}

export function commonTest() {
  it('display applicatioins logs',{tags:['@common']}, () => {
    cy.runLogQuery(`{{}kubernetes_namespace_name="${APP_NAMESPACE1}" {}}`)
    cy.assertAppLogsInLogsTable();
  });

  // search APP_NAMESPACE1, this ensure the case succeed in Observe/Logs when there multiple namespace
  it('Search by content ',{tags:['@common']}, () => {
    cy.selectLogAttribute('Content');
    cy.byTestID(TestIds.AttributeFilters).within(() => {
      cy.get('input[aria-label="Search by Content"]')
        .clear()
        .type('SVTLogger', {delay: 0})
      });
    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput,{timeout: 60000})
      .find('textarea', { timeout: 60000 })
      .should('include.value', 'SVTLogger');
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.assertAppLogsInLogsTable();
  })

  it('filter logs by last duration ',{tags:['@common']}, () => {
    cy.byTestID(TestIds.TimeRangeDropdown).find('button').click();
    cy.byTestID(TestIds.TimeRangeDropdown).contains('Last 5 minutes').click();
    cy.url().should('match', /start=now-5m&end=now/);
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.assertLogsInLogsTable()

    cy.byTestID(TestIds.TimeRangeDropdown).find('button').click();
    cy.byTestID(TestIds.TimeRangeDropdown).contains('Last 2 hours').click();
    cy.url().should('match', /start=now-2h&end=now/);
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.assertLogsInLogsTable()

    cy.byTestID(TestIds.TimeRangeDropdown).find('button').click();
    cy.byTestID(TestIds.TimeRangeDropdown).contains('Last 1 day').click();
    cy.url().should('match', /start=now-1d&end=now/);
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.assertLogsInLogsTable()

    cy.byTestID(TestIds.TimeRangeDropdown).find('button').click();
    cy.byTestID(TestIds.TimeRangeDropdown).contains('Last 2 weeks').click();
    cy.url().should('match', /start=now-2w&end=now/);
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.assertLogsInLogsTable()
    // recover to 1 hour
    cy.byTestID(TestIds.TimeRangeDropdown).find('button').click();
    cy.byTestID(TestIds.TimeRangeDropdown).contains('Last 1 hour').click();
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.assertLogsInLogsTable()
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

    cy.byTestID(TestIds.TimeRangeDropdown).find('button').click();
    cy.byTestID(TestIds.TimeRangeDropdown).contains('Custom time range').click();
    cy.byTestID(TestIds.TimeRangeSelectModal).within(() => {
      cy.get('input[aria-label="Date picker"]').first().clear().type(`${startDay}`).blur();
      cy.get('input[aria-label="Precision time picker"]').first().clear().type(`${startTime}{enter}`);

      cy.get('input[aria-label="Date picker"]').last().clear().type(`${endDay}`).blur();
      cy.get('input[aria-label="Precision time picker"]').last().clear().type(`${endTime}{enter}`);
    });
    cy.byTestID(TestIds.TimeRangeDropdownSaveButton).click();
    cy.byTestID(TestIds.TimeRangeDropdown)
      .within(() => {
        cy.contains(`${startDay} ${startTime} - ${endDay} ${endTime}`);
      });

    //Remove milleseconds as we won't provide it in console
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes())
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endDate.getHours(), endDate.getMinutes())
    cy.url().should('match', new RegExp(`start=${start.getTime()}&end=${end.getTime()}`));
    // recover to 1 hour

    cy.byTestID(TestIds.TimeRangeDropdown).find('button').click();
    cy.byTestID(TestIds.TimeRangeDropdown).contains('Last 1 hour').click();
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.assertLogsInLogsTable()
  });

  //Check the fileds in Log detail for viaq
  it('validate Viaq log format for container',{tags:['@common']}, function () {
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) !== "viaq") {
      this.skip();
    }
    const isoTimestampRegex = '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$'
    const timestampPattern = /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2}:\d{2}\.\d{3}$/;
    const viaqlogFormat = '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} - SVTLogger - INFO - .*$'

    const viaqUniqueFields : IndexField = [
      { name: '_timestamp', value: isoTimestampRegex },
      { name: 'hostname', value: "" },
      { name: 'message', value: "" },
      { name: 'kubernetes_container_id', value: "" },
      { name: 'kubernetes_container_image', value: "" },
      { name: 'kubernetes_container_iostream', value: "" },
      { name: 'kubernetes_pod_ip', value: "" },
      { name: 'kubernetes_pod_id', value: "" },
      { name: 'kubernetes_pod_owner', value: "" },
      { name: 'kubernetes_namespace_id',value: "" },
      { name: 'openshift_cluster_id', value: "" },
      { name: 'openshift_sequence', value: "" },
      { name: 'level', value: "" },
      { name: 'log_source', value: "container" },
    ];
    const otelFields : IndexField = [
      { name: 'k8s_container_name', value: "" },
      { name: 'k8s_namespace_name', value: "" },
      { name: 'k8s_node_name', value: "" },
      { name: 'k8s_pod_name', value: "" },
      { name: 'kubernetes_container_name',value: "" },
      { name: 'kubernetes_host', value: "" },
      { name: 'kubernetes_namespace_name', value: "" },
      { name: 'kubernetes_pod_name', value: "" },
      { name: 'log_type', value: "application" },
      { name: 'openshift_log_type', value: "application" },
    ];
    const mergedFields = [...viaqUniqueFields, ...otelFields];

    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('include', '| json');

    cy.byTestID(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('td[data-label="date"]')
          .first()
          .invoke('text')
          .should('match', timestampPattern);
        cy.get('td[data-label="message"]')
          .first()
          .invoke('text')
          .should('match', viaqlogFormat);
      });
    cy.assertFieldsInLogDetail(mergedFields)
  });

  it('validate Otel log format for container',{tags:['@common']}, function(){
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) != "otel" ) {
      this.skip();
    }
    const viaqUniqueFields : IndexField = [
      { name: '_timestamp', value: isoTimestampRegex },
      { name: 'hostname', value: "" },
      { name: 'message', value: "" },
      { name: 'kubernetes_container_id', value: "" },
      { name: 'kubernetes_container_image', value: "" },
      { name: 'kubernetes_container_iostream', value: "" },
      { name: 'kubernetes_pod_ip', value: "" },
      { name: 'kubernetes_pod_id', value: "" },
      { name: 'kubernetes_pod_owner', value: "" },
      { name: 'kubernetes_namespace_id',value: "" },
      { name: 'openshift_cluster_id', value: "" },
      { name: 'openshift_sequence', value: "" },
      { name: 'level', value: "" },
      { name: 'log_source', value: "container" },
    ];
    const otelFields : IndexField = [
      { name: 'k8s_container_name', value: "" },
      { name: 'k8s_namespace_name', value: "" },
      { name: 'k8s_node_name', value: "" },
      { name: 'k8s_pod_name', value: "" },
      { name: 'kubernetes_container_name',value: "" },
      { name: 'kubernetes_host', value: "" },
      { name: 'kubernetes_namespace_name', value: "" },
      { name: 'kubernetes_pod_name', value: "" },
      { name: 'log_type', value: "application" },
      { name: 'openshift_log_type', value: "application" },
    ];

    const timestampPattern = /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2}:\d{2}\.\d{3}$/;
    const otellogFormat = /^\{.*"@timestamp":".+?",.*"hostname":".+?",.*"kubernetes":\{.*\},.*"level":"\w+",.*"log_source":"container",.*"log_type":"application",.*"message":".+?",.*"openshift":\{.*\}.*\}$/

    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('not.include', '| json');
    cy.byTestID(TestIds.ExecuteQueryButton).click();

    cy.byTestID(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('td[data-label="date"]')
          .first()
          .invoke('text')
          .should('match', timestampPattern);

        cy.get('td[data-label="message"]')
          .first()
          .invoke('text')
          .should('match', otellogFormat);
      });
    cy.assertFieldsInLogDetail(otelFields)
  });

  it('switch the dataFormat',{tags:['@common']}, function () {
    if (String(Cypress.env('CLUSTERLOGGING_DATAMODE')) != "select" ) {
    this.skip();
    }
    const viaqlogFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} - SVTLogger - INFO - .*$/
    const otellogFormat = /^\{.*"@timestamp":".+?",.*"hostname":".+?",.*"kubernetes":\{.*\},.*"level":"\w+",.*"log_source":"container",.*"log_type":"application",.*"message":".+?",.*"openshift":\{.*\}.*\}$/

    //default viaq
    cy.byTestID(TestIds.SchemaToggle)
      .invoke('text')
      .should('eq', 'viaq');
    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('include', '| json');
    cy.byTestID(TestIds.LogsTable)
      .within(() => {
        // Check first message matches viaqlogFormat
        cy.get('td[data-label="message"]')
         .first()
         .invoke('text')
         .should('match', viaqlogFormat);
      });

    //switch to Otel
    cy.byTestID(TestIds.SchemaToggle).click({force: true});
    cy.get('li')
      .contains('button', 'otel')
      .click();
    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('not.include', '| json');
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.byTestID(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        // Check first message matches otellogFormat
        cy.get('td[data-label="message"]')
         .first()
         .invoke('text')
         .should('match', otellogFormat);
      });

    //switch back to Viaq
    cy.byTestID(TestIds.SchemaToggle).click({force: true});
    cy.get('li')
      .contains('button', 'viaq')
      .click();
    cy.showLogQueryInput();
    cy.byTestID(TestIds.LogsQueryInput)
      .find('textarea')
      .invoke('val')
      .should('include', '| json');
    cy.byTestID(TestIds.ExecuteQueryButton).click();
    cy.byTestID(TestIds.LogsTable)
      .should('exist')
      .within(() => {
        cy.get('td[data-label="message"]')
          .first()
          .invoke('text')
          .should('match', viaqlogFormat);
      });
  });
}
