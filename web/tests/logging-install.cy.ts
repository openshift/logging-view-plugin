import { catalogSource, logUtils } from "../../views/logging-utils";

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
    //Delete logging operators if already exists
    logUtils.uninstallOperator(CLO.operatorName, CLO.namespace, CLO.packageName);
    logUtils.uninstallOperator(LO.operatorName, LO.namespace, LO.packageName);
  });

  afterEach(function() {
    cy.adminCLI(`oc adm policy remove-cluster-role-from-user cluster-admin ${Cypress.env('LOGIN_USERNAME')}`, { failOnNonZeroExit: false });
  });

  it('(OCP-22558,gkarager,Logging) Deploy cluster-logging operator via web console', {tags: ['e2e','admin','@logging','@smoke']}, function() {
    //Install the Cluster Logging Operator with console plungin
    catalogSource.sourceName(CLO.packageName).then((csName) => {
      logUtils.installOperator(CLO.namespace, CLO.packageName, csName, catalogSource.channel(CLO.packageName), catalogSource.version(CLO.packageName), CLO.operatorName);
    });
  });

  it('(OCP-70833,gkarager,Logging) Deploy loki-operator via Web Console', {tags: ['e2e','admin','@logging','@smoke']}, function()  {
    //Install the Loki Operator
    catalogSource.sourceName(LO.packageName).then((csName) => {
      logUtils.installOperator(LO.namespace, LO.packageName, csName, catalogSource.channel(LO.packageName), catalogSource.version(LO.packageName), LO.operatorName);
    });
  });
});
