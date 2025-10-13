/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />
import { TestIds } from '../../src/test-ids';

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      retryTask(condition, expectedoutput, options?);
      adminCLI(command: string, options?);
      checkCommandResult(condition, expectedoutput, options?);
      getByTestId(testId: TestIds): Chainable<JQuery<Element>>;
      uiLogin(provider: string, username: string, password: string);
      uiLogout();
      uiLoginUser(rank: string);
      uiLogoutAsUser(rank: string);
      uiLoginAsClusterAdmin(rank: string);
      uiLogoutClusterAdmin(rank: string);
      switchToDeveloper();
      switchToAdministor();
      grantLogRoles(rank: string, project: string);
      removeLogRoles(rank: string, project: string);
      checkClusterType(commandName);
      uiLoginAzureExternalOIDC();
      uiLogoutAzureExternalOIDC();
      isManagedCluster();
    }
  }
}

const admin_kubeconfig = Cypress.env('KUBECONFIG_PATH');
const normal_kubeconfig = '/tmp/normal_kubeconfig';
const DEFAULT_RETRY_OPTIONS = { retries: 3, interval: 10000 };
const rank_2_num = {
  "first_user": 0,
  "second_user": 1,
  "third_user": 2,
  "fourth_user": 3,
  "fifth_user": 4,
};
let $cmexisting = 0, cm_has_been_updated = false;
var console_generation_before_update;

Cypress.Commands.add('getByTestId', (testId: TestIds) => cy.get(`[data-test="${testId}"]`));

Cypress.Commands.add("switchToDeveloper",() => {
  // if side bar is collapsed then expand it before switching perspecting 
  cy.get('body').then((body) => {
    if (body.find('.pf-m-collapsed').length > 0) {
      cy.get('#nav-toggle').click()
    }
  });
  cy.get('[data-test-id="perspective-switcher-toggle"]').should('exist').click();
  cy.get('[data-test-id="perspective-switcher-menu-option"]').contains('Developer').should('exist').click();
  cy.get('[data-quickstart-id="qs-masthead-applications"]').should('exist');
  //Close guide tour bar
  cy.get('body').then(() => {
    if (Cypress.$("#guided-tour-modal").length > 0) {
       cy.getByTestId('tour-step-footer-secondary').contains('Skip tour').click();
    }
  });
});

Cypress.Commands.add("switchToAdministor",() => {
  cy.exec(`oc get console.operator cluster -o jsonpath='{.spec.customization.perspectives}'`).then((result) => {
    if (!result.stdout.includes('{"state":"Enabled"}')){
       cy.log('no customization.perspectives is enabled');
    }else{
      // if side bar is collapsed then expand it before switching perspecting
      cy.get('body').then((body) => {
        if (body.find('.pf-m-collapsed').length > 0) {
          cy.get('#nav-toggle').click();
        }
      })
      cy.get('[data-test-id="perspective-switcher-toggle"]').invoke('text').then((text) => {
          if (text == "Administrator" ) {
            cy.log('the perspectives is Administrator now');
	  }else{
            cy.get('[data-test-id="perspective-switcher-toggle"]').click();
            cy.get('[data-test-id="perspective-switcher-menu-option"]').contains('Administrator').should('exist').click();
            cy.get('[data-quickstart-id="qs-masthead-applications"]').should('exist');
            //Close guide tour bar
            cy.get('body').then(() => {
              if (Cypress.$("#guided-tour-modal").length > 0) {
                cy.getByTestId('tour-step-footer-secondary').contains('Skip tour').click();
              }
            });
	  }
      })
    }
  })
});

// to avoid influence from upstream login change
Cypress.Commands.add('uiLogin', (provider: string, username: string, password: string)=> {
  //cy.clearCookie('openshift-session-token');
  cy.clearAllCookies()
  cy.visit('/');
  cy.window().then((win: any) => {
    if(win.SERVER_FLAGS?.authDisabled) {
      cy.task('log', 'Skipping login, console is running with auth disabled');
      return;
    }
    cy.get('[data-test-id="login"]').should('be.visible');
    cy.get('body').then(($body) => {
      if ($body.text().includes(provider)) {
        cy.contains(provider).should('be.visible').click();
      }else if ($body.find('li.idp').length > 0) {
        //using the last idp if doesn't provider idp name
        cy.get('li.idp').last().click();
      }
    });
    cy.get('#inputUsername').type(username);
    cy.get('#inputPassword').type(password);
    cy.get('button[type=submit]').click();
    cy.get('[data-test="username"]', {timeout: 120000}).should('be.visible');
  });
  //cy.get('[data-quickstart-id="qs-nav-add"]').should('exist');
  cy.get('[data-quickstart-id="qs-masthead-applications"]').should('exist');
  //Close guide tour bar
  cy.get('body').then(() => {
    if (Cypress.$("#guided-tour-modal").length > 0) {
      cy.getByTestId('tour-step-footer-secondary').contains('Skip tour').click();
    }
  });
});

//Login user as the cluster-admin
//Rank: first_user, second_user ... five_user
Cypress.Commands.add('uiLoginAsClusterAdmin', (rank: string) => {
  let username="";
  let userpassword="";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[0];
    userpassword=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[1];
  }
  if( username != "" && userpassword != "" && Cypress.env('LOGIN_IDP') != "" ){
    cy.adminCLI(`oc adm policy add-cluster-role-to-user cluster-admin ${username}`);
    cy.uiLogin(Cypress.env('LOGIN_IDP'), username, userpassword);
  }else{
    cy.log('no user can be found.');
    cy.exit();
  }
});


//Login user
//LOGIN_USERS=test1:passwd,user2,passwd,user2:pasword,...
Cypress.Commands.add('uiLoginUser', (rank: string) => {
  let username="";
  let userpassword="";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[0];
    userpassword=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[1];
  }
  if( username != "" && userpassword != "" && Cypress.env('LOGIN_IDP') != "" ){
    cy.uiLogin(Cypress.env('LOGIN_IDP'), username, userpassword);
  }else{
    cy.log('no user can be found.');
    cy.exit();
  }
});

//Allow user to view observe/logs,alerts
Cypress.Commands.add('grantLogRoles', (rank: string, project: string) => {
  let username="";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[0];
    if( username != "" ){
      cy.exec(`oc -n ${project} policy add-role-to-user view ${username}`);
      cy.exec(`oc -n ${project} policy add-role-to-user cluster-logging-application-view ${username}`);
      cy.exec(`oc -n ${project} policy add-role-to-user monitoring-rules-edit ${username}`);
      cy.exec(`oc -n ${project} policy add-role-to-user cluster-monitoring-view ${username}`);
    }else{
      cy.log(`can not find the ${rank}.`);
      cy.exit();
    }
  }
});

//Remove observe/logs,alerts roles from the user
Cypress.Commands.add('removeLogRoles', (rank: string, project: string) => {
  let username="";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[0];
    if( username != "" ){
      cy.exec(`oc -n ${project} policy remove-role-from-user view ${username}`);
      cy.exec(`oc -n ${project} policy remove-role-from-user cluster-logging-application-view ${username}`);
      cy.exec(`oc -n ${project} policy remove-role-from-user monitoring-rules-edit ${username}`);
      cy.exec(`oc -n ${project} policy remove-role-from-user cluster-monitoring-view ${username}`);
    }else{
      cy.log(`can not find the ${rank}.`);
      cy.exit();
    }
  }
});

Cypress.Commands.add('uiLogout', () => {
  cy.window().then((win: any) => {
    if (win.SERVER_FLAGS?.authDisabled){
      cy.log('Skipping logout, console is running with auth disabled');
      return;
    }
    cy.log('Log out UI');
    switch (String(Cypress.env('OPENSHIFT_VERSION'))) {
      case '4.12':
      case '4.13':
      case '4.14':
      case '4.15':
      case '4.16':
      case '4.17':
      case '4.18':
        cy.get('[data-test="user-dropdown"]').click();
        cy.get('[data-test="log-out"]').should('be.visible');
        cy.get('[data-test="log-out"]').click({ force: true });
	break
      default:
        cy.get('button[data-test="user-dropdown-toggle"]').click();
        cy.get('[data-test="log-out"] button').click({ force: true });
    }
  })
});

Cypress.Commands.add('uiLogoutUser', (rank: string) => {
  cy.log('Logout user');
  let username = "";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[0];
  }
  cy.uiLogout();
});

Cypress.Commands.add('uiLogoutClusterAdmin', (rank: string) => {
  cy.log('Remove the cluster Admin role and Logout');
  let username = "";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[0];
  }
  if( username != "" ){
    cy.adminCLI(`oc adm policy remove-cluster-role-from-user cluster-admin ${username}`);
  }
  cy.uiLogout();
});

Cypress.Commands.add("uiLoginAzureExternalOIDC", () => {
  cy.visit('/');
  cy.wait(10000);
  cy.url().then(($url)=>{
    cy.log('current url is: '+ $url);
    if($url.includes('console-openshift-console')){
      cy.log('Already login!');
    }else{
      AzureLoginFlowOnPage();
      cy.url().then(($url1)=>{
        cy.log('current url is: '+ $url1);
        if(!$url1.includes('console-openshift-console')){
          cy.log('Still on microsoft login page.')
          cy.origin('https://login.microsoftonline.com', () => {
            cy.get('body').then(($body) => {
              if ($body.text().includes('signed in')) {
                cy.get('input[value=No]').click();
              }
            });
          });
        }
      });
    }
  });
  cy.getByTestId('user-dropdown-toggle').should('exist');
  cy.wait(4000);
  //Close guide tour bar
  cy.get('body').then(() => {
    if (Cypress.$("#guided-tour-modal").length > 0) {
      cy.getByTestId('tour-step-footer-secondary').contains('Skip tour').click();
    }
  });
  cy.log('Login Successfully!');
});

Cypress.Commands.add("uiLogoutAzureExternalOIDC", () => {
  cy.uiLogout();
  cy.wait(3000);
  cy.origin('https://login.microsoftonline.com', () => {
    cy.get('body').then(($body) => {
      if ($body.text().includes('Pick an account')) {
        cy.contains('Signed in').click();
      }
    cy.contains('div#login_workload_logo_text', 'You signed out of your account').should('exist');
    cy.contains('div#SignOutStatusMessage', 'a good idea to close all browser windows').should('exist');
    });
  });
  cy.log('Log out successfully!');
});

Cypress.Commands.add("adminCLI", (command: string, options?: {}) => {
  cy.log(`Run admin command: ${command}`)
  cy.exec(`${command} --kubeconfig ${admin_kubeconfig}`, options)
});

Cypress.Commands.add('retryTask', (command, expectedOutput, options?) => {
  const { retries, interval } = options || DEFAULT_RETRY_OPTIONS;
  const retryTaskFn = (currentRetries) => {
    return cy.adminCLI(command)
      .then(result => {
        if (result.stdout.includes(expectedOutput)) {
          return cy.wrap(true);
        } else if (currentRetries < retries) {
          return cy.wait(interval).then(() => retryTaskFn(currentRetries + 1));
        } else {
          return cy.wrap(false);
        }
      });
  };
  return retryTaskFn(0);
});

Cypress.Commands.add("checkCommandResult", (command, expectedoutput, options?) => {
  return cy.retryTask(command, expectedoutput, options)
    .then(conditionMet =>{
      if (conditionMet) {
        return;
      } else {
        throw new Error(`"${command}" failed to meet expectedoutput ${expectedoutput} within ${options.retries} retries`);
      }
    })
});

Cypress.Commands.add("checkClusterType", (commandName) => {
  const clusterTypes = {
    isGCPCluster: {
      condition: (credentialMode, infraPlatform, authIssuer) =>
        infraPlatform === 'GCP',
      message: 'Continuing testing on a GCP cluster!',
      skipMessage: 'This is not a GCP cluster!!!'
    },
    isGCPWIFICluster: {
      condition: (credentialMode, infraPlatform, authIssuer) =>
        credentialMode === 'Manual' && infraPlatform === 'GCP' && authIssuer !== '',
      message: 'Continuing testing a GCP WIFI enabled cluster!',
      skipMessage: 'This is not a GCP WIFI enabled cluster!!!'
    }
  };
  const clusterType = clusterTypes[commandName];

  if (!clusterType) {
    cy.log(`Unknown command: ${commandName}`);
    return;
  }

  return cy.exec(`oc get cloudcredential cluster --template={{.spec.credentialsMode}} --kubeconfig=${admin_kubeconfig}`)
    .then(result => {
      const credentialMode = result.stdout.trim();
      return cy.exec(`oc get infrastructure cluster --template={{.status.platform}} --kubeconfig=${admin_kubeconfig}`)
        .then(result => ({ credentialMode, infraPlatform: result.stdout.trim() }));
    })
    .then(({ credentialMode, infraPlatform }) => {
      return cy.exec(`oc get authentication cluster --template={{.spec.serviceAccountIssuer}} --kubeconfig=${admin_kubeconfig}`)
        .then(result => ({ credentialMode, infraPlatform, authIssuer: result.stdout.trim() }));
    })
    .then(({ credentialMode, infraPlatform, authIssuer }) => {
      cy.log(`platform: ${infraPlatform} #########`);
      cy.log(`credentialMode: ${credentialMode} #########`);
      cy.log(`authIssuer: ${authIssuer} #########`);

      const result = clusterType.condition(credentialMode, infraPlatform, authIssuer);
      const message = result ? clusterType.message : clusterType.skipMessage;
      cy.log(message);
      return cy.wrap(result);
    });
});

Cypress.Commands.add("isManagedCluster", () => {
  let brand;
  cy.window().then((win: any) => {
    brand = win.SERVER_FLAGS.branding;
    cy.log(`${brand}`);
    if(brand == 'rosa' || brand == 'dedicated'){
      cy.log('Testing on Rosa/OSD cluster!');
      return cy.wrap(true);
    } else {
      cy.log('Not Rosa/OSD cluster. Skip!');
      return cy.wrap(false);
    }
  });
});
