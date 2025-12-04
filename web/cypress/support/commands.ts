/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />
import { TestIds } from '../../src/test-ids';

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      adminCLI(command: string, options?);
      getByTestId(testId: TestIds): Chainable<JQuery<Element>>;
      cliLogin(rank: string);
      uiLogin(provider: string, username: string, password: string);
      uiLogout();
      uiLoginUser(rank: string);
      uiLogoutAsUser(rank: string);
      uiLoginAsClusterAdmin(rank: string);
      uiLogoutClusterAdmin(rank: string);
      switchToDevConsole();
      switchToAdmConsole();
      grantLogRoles(rank: string, project: string);
      removeLogRoles(rank: string, project: string);
      uiImpersonate(rank: string);
    }
  }
}

const admin_kubeconfig = Cypress.env('KUBECONFIG_PATH');
const normal_kubeconfig = "/tmp/logging_ui_kubeconfig"
const oauth_url = Cypress.config('baseUrl').replace("console-openshift-console", "oauth-openshift")
const rank_2_num = {
  "first_user": 0,
  "second_user": 1,
  "third_user": 2,
  "fourth_user": 3,
  "fifth_user": 4,
};

Cypress.Commands.add("adminCLI", (command: string, options?: {}) => {
  cy.log(`Run admin command: ${command}`)
  cy.exec(`${command} --kubeconfig ${admin_kubeconfig}`, options)
});

Cypress.Commands.add('getByTestId', (testId: TestIds) => cy.get(`[data-test="${testId}"]`));

Cypress.Commands.add("switchToDevConsole",() => {
  // if side bar is collapsed then expand it before switching perspecting 
  cy.get('body').then((body) => {
    if (body.find('.pf-m-collapsed').length > 0) {
      cy.get('#nav-toggle').click()
    }
  });
  cy.get('[data-test-id="perspective-switcher-toggle"]').click();
  cy.get('[data-test-id="perspective-switcher-menu-option"]').contains('Developer').click();
  //Close guide tour bar
  cy.get('body').then(() => {
    if (Cypress.$("#guided-tour-modal").length > 0) {
       cy.getByTestId('tour-step-footer-secondary').contains('Skip tour').click();
    }
  });
});

Cypress.Commands.add("switchToAdmConsole",() => {
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
            cy.get('[data-test-id="perspective-switcher-menu-option"]').contains('Administrator').click();
	  }
      })
    }
  })
  //Close guide tour bar
  cy.get('body').then(() => {
    if (Cypress.$("#guided-tour-modal").length > 0) {
       cy.getByTestId('tour-step-footer-secondary').contains('Skip tour').click();
    }
  });
});


//login user using cli.
Cypress.Commands.add('cliLogin', (rank: string) => {
  cy.log(`login ${rank}`);
  let username="";
  let userpassword="";
  cy.readFile(admin_kubeconfig)
    .then(content => cy.writeFile(normal_kubeconfig, content));

  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[0];
    userpassword=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[1];
  }
  if( username != "" && userpassword != "" ){
    cy.exec(`oc login -u ${username} -p ${userpassword}  --kubeconfig=${normal_kubeconfig}`);
  }else{
    cy.log('no user can be found.');
    cy.exit();
  }
});

// to avoid influence from upstream login change
Cypress.Commands.add('uiLogin', (idpName: string, username: string, password: string)=> {
  //cy.clearCookie('openshift-session-token');
  cy.clearAllCookies()
  cy.visit('/');
 
  cy.window().then((win: any) => {
    if(win.SERVER_FLAGS?.authDisabled) {
      cy.task('log', 'Skipping login, console is running with auth disabled');
      return;
    }
    cy.origin(oauth_url, { args: { username, password, idpName } },
      ({ username, password, idpName }) => {
        // Select the IDP button
        cy.contains('a', idpName).click()

        // Fill in credentials
        cy.get('#inputUsername').type(username)
        cy.get('#inputPassword').type(password)
        cy.get('button[type="submit"]').click()
      }
    )
    cy.get('[data-test="username"]', {timeout: 120000}).should('be.visible');
  });
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

//Login a user from LOGIN_USERS=test1:passwd,user2,passwd,user2:pasword,...
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

Cypress.Commands.add('uiImpersonateUser', (rank: string) => {
  let username = "";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[rank_2_num[rank]].split(':')[0];
  }
  if( username == "" ){
    cy.log(`can not find the ${rank}.`);
    this.skip();
  }
  let fullusername=Cypress.env('LOGIN_IDP') + ":" + username

  cy.visit("/k8s/cluster/user.openshift.io~v1~User", { timeout: 120000 } );
  cy.contains('td', fullusername, { timeout: 120000 } )  
    .closest('tr')                                        
    .find('button[data-test-id="kebab-button"]')
    .click();            
  cy.contains('button', 'Impersonate User').click();
  //find the username to see if Impersonate User succeed or not
  cy.contains('[data-test="username"]', `${username}`).should('exist') 

  //Close guide tour bar
  cy.get('body').then(() => {
    if (Cypress.$("#guided-tour-modal").length > 0) {
      cy.getByTestId('tour-step-footer-secondary').contains('Skip tour').click();
    }
  });
});

Cypress.Commands.add('assertLogInLogsTable', () => {
  // Ensure the table has loaded rows
  cy.getByTestId(TestIds.LogsTable).within(() => {
    cy.get('tr[data-test-rows="resource-row" ]')
      .its('length')
      .should('be.gt', 1); 
    cy.get('tr[data-test-rows="resource-row" ]').first().within(() => {
      cy.get('td[data-label="date"]').should('exist');
      cy.get('td[data-label="message"]').should('exist');
    });
  });
});
