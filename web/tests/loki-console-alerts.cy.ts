import { catalogSource, logUtils } from "../../views/logging-utils";
import { LokiUtils } from "views/logging-loki-utils";

describe('Loki log based alerts on dev-console', () => {
  const appNs = "test-ocp65686";
  const devConsolePathForAlert = 'dev-monitoring/ns/' + appNs + '/alerts';
  const monitoringAlertsPath = 'monitoring/alerts'

  const CLO = {
    namespace: "openshift-logging",
    packageName: "cluster-logging",
    operatorName: "Red Hat OpenShift Logging"
  };
  const LO = {
    namespace: "openshift-operators-redhat",
    packageName: "loki-operator",
    operatorName: "Loki Operator"
  };
  const COO = {
    namespace: "openshift-operators",
    packageName: "cluster-observability-operator",
    operatorName: "Cluster Observability Operator"
  };
  const LokiStack = {
    name: "logging-lokistack-ocp65686",
    bucketName: "logging-loki-bucket-ocp65686",
    secretName: "logging-loki-secret-ocp65686",
    tSize: "1x.demo"
  };

  before( function() {
    cy.exec(`oc get authentication cluster --template={{.spec.serviceAccountIssuer}} --kubeconfig=${Cypress.env('KUBECONFIG_PATH')}`, { failOnNonZeroExit: false }).then((result) => {
      if (result.stdout!=""){
        cy.log('sts cluster!!');
        this.skip();
      }
    });
  })

  beforeEach( function() {
    cy.adminCLI(`oc adm groups new cluster-admin-logging`);
    cy.adminCLI(`oc adm policy add-cluster-role-to-group cluster-admin cluster-admin-logging`)
    cy.adminCLI(`oc adm groups add-users cluster-admin-logging ${Cypress.env('LOGIN_USERNAME')}`)

    cy.uiLogin(Cypress.env('LOGIN_IDP'), Cypress.env('LOGIN_USERNAME'), Cypress.env('LOGIN_PASSWORD'));

    //Install logging operators if needed
    catalogSource.sourceName(CLO.packageName).then((csName) => {
      logUtils.installOperator(CLO.namespace, CLO.packageName, csName, catalogSource.channel(CLO.packageName), catalogSource.version(CLO.packageName), CLO.operatorName);
    });
    catalogSource.sourceName(LO.packageName).then((csName) => {
      logUtils.installOperator(LO.namespace, LO.packageName, csName, catalogSource.channel(LO.packageName), catalogSource.version(LO.packageName), LO.operatorName);
    });
    catalogSource.sourceName(COO.packageName).then((csName) => {
      logUtils.installOperator(COO.namespace, COO.packageName, csName, "development", catalogSource.version(COO.packageName), COO.operatorName);
    });
  });

  afterEach(function() {
    cy.exec(`oc delete uiplugin.observability.openshift.io/logging --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, { failOnNonZeroExit: false });
    LokiUtils.removeObjectStorage(LokiStack.bucketName);
    logUtils.removeLokistack(LokiStack.name, CLO.namespace)
    cy.exec(`oc delete clusterlogforwarder.observability.openshift.io collector-lokistack -n ${CLO.namespace}`,{ failOnNonZeroExit: false });
    cy.exec(`oc delete sa log-collector -n ${CLO.namespace}`,{ failOnNonZeroExit: false });
    cy.exec(`oc delete secret logging-loki-secret-ocp65686 -n ${CLO.namespace}`,{ failOnNonZeroExit: false });
    cy.exec(`oc delete project ${appNs} --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, { failOnNonZeroExit: false });
    cy.exec(`oc adm policy remove-cluster-role-from-group cluster-admin cluster-admin-logging --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, { failOnNonZeroExit: false });
    cy.exec(`oc delete group cluster-admin-logging --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, { failOnNonZeroExit: false });
  });


  it('(OCP-65686,kbharti,Logging) Validate Loki log based alerts on Console', { tags: ['e2e', 'admin', '@smoke', '@logging'] }, function () {
    cy.exec(`oc new-project ${appNs} --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, { failOnNonZeroExit: false });
    cy.exec(`oc label namespace ${appNs} openshift.io/cluster-monitoring=true`, { failOnNonZeroExit: false });
    cy.exec(`oc new-app -f ./fixtures/logging/container_json_log_template.json -n ${appNs} --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, { failOnNonZeroExit: false });

    //Create bucket and secret for lokistack
    LokiUtils.prepareResourcesForLokiStack(CLO.namespace, LokiStack.secretName, LokiStack.bucketName);

    // Deploy lokistack under openshift-logging
    LokiUtils.getStorageClass().then((SC) => {
      LokiUtils.getPlatform()
      cy.get<string>('@ST').then(ST => {
        cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/lokistack-sample.yaml -n ${CLO.namespace} -p NAME=${LokiStack.name} SIZE=${LokiStack.tSize} SECRET_NAME=${LokiStack.secretName} STORAGE_TYPE=${ST} STORAGE_CLASS=${SC} | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`, { failOnNonZeroExit: false })
          .then(output => {
            expect(output.stderr).not.contain('Error');
          })
      })
    })

    // enable UIPlugin
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/uiPlugin.yaml -p LOKISTACK_NAME=${LokiStack.name} | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`, { failOnNonZeroExit: false })
      .then(output => {
        expect(output.stderr).not.contain('Error');
      })
    logUtils.waitforPodReady(COO.namespace, 'app.kubernetes.io/part-of=UIPlugin')
    cy.get(`button[data-test="refresh-web-console"]`).should("be.visible", { timeout: 180000 }).click()

    // Provide RBAC to user for accessing application logs on appNs namespace
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/app-logs-rbac.yaml -p NAMESPACE=${appNs} -p USERNAME=${Cypress.env('LOGIN_USERNAME')} | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`, { failOnNonZeroExit: false })
      .then(output => {
        expect(output.stderr).not.contain('Error');
      })

    // Create application alert and wait for ruler to restart
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/loki-app-alert.yaml -n ${appNs} -p NAMESPACE=${appNs} | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`)
      .then(output => {
        expect(output.stderr).not.contain('Error');
      })

    // Forward logs to lokistack
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${CLO.namespace} create sa log-collector`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${CLO.namespace} adm policy add-cluster-role-to-user collect-application-logs -z log-collector`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${CLO.namespace} adm policy add-cluster-role-to-user collect-infrastructure-logs -z log-collector`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${CLO.namespace} adm policy add-cluster-role-to-user collect-audit-logs -z log-collector`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${CLO.namespace} adm policy add-cluster-role-to-user logging-collector-logs-writer -z log-collector`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/clf-lokistack.yaml -n ${CLO.namespace} -p NAME=collector-lokistack -p NAMESPACE=${CLO.namespace} -p LOKISTACK_NAME=${LokiStack.name} -p LOKISTACK_NAMESPACE=${CLO.namespace} -p SERVICE_ACCOUNT_NAME=log-collector | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })

    // Go to workloades page to wait for pods to appear
    cy.visit(`/k8s/ns/${CLO.namespace}/core~v1~Pod`);
    cy.get(`[data-test-id="collector-lokistack"]`).should('be.visible', { timeout: 180000 });
    logUtils.waitforPodReady(CLO.namespace, 'app.kubernetes.io/name=lokistack');
    logUtils.waitforPodReady(CLO.namespace, 'app.kubernetes.io/component=collector');

    // wait for app logs to be collected
    cy.visit('/monitoring/logs');
    cy.get('[aria-label="Logs Table"]').should('be.visible').then(() => {
      for (let retries = 0; retries <= 15; retries++) {
        cy.get('[aria-label="Logs Table"]').should('be.visible')
        let foundAlert = false
        cy.get('[aria-label="Logs Table"]').then(($el) => {
          if ($el.find('[class="pf-c-alert__title"]').length > 0) {
            foundAlert = true
          }
        });
        if (foundAlert) {
          cy.log(`app logs are not collected ${retries}`)
          cy.wait(5000)
          cy.get('button[data-test="SyncButton"]').click()
        }
        else {
          break;
        }
      }
    });

    // Dev Console test
    cy.visit(devConsolePathForAlert);
    // Wait for the Alert to be visible on UI
    cy.get('table', { timeout: 60000 }).contains('td', 'MyAppLogVolumeIsHigh').should('be.visible');

    // Validate Alert on Admin console
    cy.visit(monitoringAlertsPath);
    cy.get('button[aria-label="Options menu"]').should('be.visible');
    cy.get('button[aria-label="Options menu"]', { timeout: 180000 }).click();
    cy.get('[data-test-row-filter="user"]').should('be.visible').click();
    cy.get('[id="pending"]').should('be.visible').click();
    // non-kubeadmin user can't view this alert in admin console while kubeadmin can see this alert
    cy.contains('a', 'MyAppLogVolumeIsHigh', { timeout: 180000 }).should('be.visible', { timeout: 180000 });

    cy.adminCLI(`oc adm policy remove-cluster-role-from-group cluster-admin cluster-admin-logging`);
    cy.adminCLI(`oc delete group cluster-admin-logging`);

    cy.uiLogout();

    // Dev Console test
    // Provide roles to the user to access Alerts on dev-console
    cy.adminCLI(`oc adm policy add-role-to-user admin ${Cypress.env('LOGIN_USERNAME')} -n ${appNs}`);
    cy.adminCLI(`oc adm policy add-role-to-user cluster-monitoring-view ${Cypress.env('LOGIN_USERNAME')} -n ${appNs}`);
    cy.adminCLI(`oc adm policy add-role-to-user monitoring-rules-edit ${Cypress.env('LOGIN_USERNAME')} -n ${appNs}`);

    // Login with regular user and check for Alert on dev-console
    cy.uiLogin(Cypress.env('LOGIN_IDP'), Cypress.env('LOGIN_USERNAME'), Cypress.env('LOGIN_PASSWORD'));
    cy.visit(devConsolePathForAlert);

    // Wait for the Alert to be visible on UI
    cy.get('table', { timeout: 60000 }).contains('td', 'MyAppLogVolumeIsHigh').should('be.visible');

  });
});
