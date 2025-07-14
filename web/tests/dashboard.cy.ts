import { catalogSource, logUtils } from "../../views/logging-utils";
import { graphSelector } from "views/dashboards-page"
describe('Logging related features', () => {
  const CLO = {
    namespace:   "openshift-logging",
    packageName: "cluster-logging",
    operatorName: "Red Hat OpenShift Logging"
  };
  const LO = {
    namespace:   "openshift-operators-redhat",
    packageName: "loki-operator",
    operatorName: "Loki Operator"
  };
  const Test_NS = "cluster-logging-dashboard-test";

  before( function() {
    cy.exec(`oc get authentication cluster --template={{.spec.serviceAccountIssuer}} --kubeconfig=${Cypress.env('KUBECONFIG_PATH')}`, { failOnNonZeroExit: false }).then((result) => {
      if (result.stdout!=""){
        cy.log('sts cluster!!');
        this.skip();
      }
    });
  })

  beforeEach( function() {
    cy.adminCLI(`oc adm policy add-cluster-role-to-user cluster-admin ${Cypress.env('LOGIN_USERNAME')}`);
    cy.uiLogin(Cypress.env('LOGIN_IDP'), Cypress.env('LOGIN_USERNAME'), Cypress.env('LOGIN_PASSWORD'));
    // Install logging operators if needed
    catalogSource.sourceName(CLO.packageName).then((csName) => {
      logUtils.installOperator(CLO.namespace, CLO.packageName, csName, catalogSource.channel(CLO.packageName), catalogSource.version(CLO.packageName), CLO.operatorName);
    });
    catalogSource.sourceName(LO.packageName).then((csName) => {
      logUtils.installOperator(LO.namespace, LO.packageName, csName, catalogSource.channel(LO.packageName), catalogSource.version(LO.packageName), LO.operatorName);
    });

    cy.exec(`oc new-project ${Test_NS} --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, {failOnNonZeroExit: false});
    cy.exec(`oc label ns ${Test_NS} openshift.io/cluster-monitoring=true --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, {failOnNonZeroExit: false});
    cy.exec(`oc -n ${Test_NS} create role prometheus-k8s --verb=get,list,watch --resource=pods,services,endpoints --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, {failOnNonZeroExit: false});
    cy.exec(`oc -n ${Test_NS} policy add-role-to-user --role-namespace=${Test_NS} prometheus-k8s system:serviceaccount:openshift-monitoring:prometheus-k8s --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, {failOnNonZeroExit: false});
  });

  afterEach(() => {
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${Test_NS} adm policy remove-cluster-role-from-user collect-application-logs -z test-66825`, {failOnNonZeroExit: false});
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${Test_NS} adm policy remove-cluster-role-from-user collect-infrastructure-logs -z test-66825`, {failOnNonZeroExit: false});
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${Test_NS} adm policy remove-cluster-role-from-user collect-audit-logs -z test-66825`, {failOnNonZeroExit: false});
    cy.exec(`oc delete project ${Test_NS} --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, {failOnNonZeroExit: false});
    cy.exec(`oc delete lfme/instance -n ${CLO.namespace} --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`, {failOnNonZeroExit: false});
    cy.adminCLI(`oc adm policy remove-cluster-role-from-user cluster-admin ${Cypress.env('LOGIN_USERNAME')}`, {failOnNonZeroExit: false});
  });


  it('(OCP-66825,qitang,Logging) Vector - OpenShift Logging Collection Vector metrics dashboard', {tags: ['e2e','admin','@logging']}, function() {
    // Deploy self-managed loki in a new project
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/loki-configmap.yaml -n ${Test_NS} -p NAME=loki-server -p NAMESPACE=${Test_NS} | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/loki-deployment.yaml -n ${Test_NS} -p NAME=loki-server -p NAMESPACE=${Test_NS} | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${Test_NS} expose deployment/loki-server`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })

    // Create CLF
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${Test_NS} create sa test-66825`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${Test_NS} adm policy add-cluster-role-to-user collect-application-logs -z test-66825`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${Test_NS} adm policy add-cluster-role-to-user collect-infrastructure-logs -z test-66825`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} -n ${Test_NS} adm policy add-cluster-role-to-user collect-audit-logs -z test-66825`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/clf-external-loki.yaml -n ${Test_NS} -p NAME=collector-loki-server -p NAMESPACE=${Test_NS} -p URL=http://loki-server.${Test_NS}.svc:3100 -p SERVICE_ACCOUNT_NAME=test-66825 | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })

    // Create LogFileMetricExporter
    cy.exec(`oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} process -f ./fixtures/logging/lfme.yaml -n ${CLO.namespace} | oc --kubeconfig ${Cypress.env('KUBECONFIG_PATH')} apply -f -`, {failOnNonZeroExit: false})
    .then(output => {
      expect(output.stderr).not.contain('Error');
    })

    cy.wait(180*1000)

    // Check Logging/Collection dashboard
    cy.visit(`/monitoring/dashboards/grafana-dashboard-cluster-logging`)
    cy.get('#refresh-interval-dropdown-dropdown').should('exist').then(btn => {
      cy.wrap(btn).click().then(drop => {
          cy.contains('15 seconds').should('exist').click()
      })
    })

    cy.byLegacyTestID('panel-overview').should('exist').within(() => {
      cy.byTestID('log-collection-rate-(5m-avg)-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
      cy.byTestID('log-send-rate-(5m-avg)-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
      cy.byTestID('total-errors-last-60m-chart').should('exist', { timeout: 120000 })
    });

    cy.byLegacyTestID('panel-outputs').should('exist').within(() => {
        cy.byTestID('rate-log-bytes-sent-per-output-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
    });

    cy.byLegacyTestID('panel-produced-logs').should('exist').within(() => {
        cy.byTestID('top-producing-containers-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
        cy.byTestID('top-producing-containers-in-last-24-hours-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
    });

    cy.byLegacyTestID('panel-collected-logs').should('exist').within(() => {
      cy.byTestID('top-collected-containers---bytes/second-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
      cy.byTestID('top-collected-containers-in-last-24-hours-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
    });

    cy.byLegacyTestID('panel-machine').should('exist').within(() => {
      cy.byTestID('cpu-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
      cy.byTestID('memory-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
      cy.byTestID('running-containers-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
      cy.byTestID('open-files-for-container-logs-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
      cy.byTestID('file-descriptors-in-use-chart').should('exist', { timeout: 120000 }).find(graphSelector.graphBody).should('not.have.class', 'graph-empty-state', { timeout: 120000 })
      cy.byTestID('collector-buffer-consuming-bytes-disk-space-on-node-chart').should('exist', { timeout: 120000 })
      cy.byTestID('collector-buffer-consuming-%-disk-space-on-node-chart').should('exist', { timeout: 120000 })
    });
  });

});
