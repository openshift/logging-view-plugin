import { nav } from '../../views/nav';
import { guidedTour } from '../../views/tour';
import * as Env from './env';

export {};
declare global {
  namespace Cypress {
    interface Chainable {
      switchPerspective(perspective: string);
      uiLogin(provider: string, username: string, password: string, oauthurl?: string);
      uiLogout();
      cliLogin(username?, password?, hostapi?);
      cliLogout();
      login(provider?: string, username?: string, password?: string, oauthurl?: string): Chainable<Element>;
      loginNoSession(provider: string, username: string, password: string, oauthurl: string): Chainable<Element>;
      adminCLI(command: string, options?);
      executeAndDelete(command: string);
      validateLogin(): Chainable<Element>;
      cliLoginAsUser(index: string);
      uiLoginAsUser(index: string);
      uiLogoutUser(index: string);
      uiLoginAsClusterAdminForUser(index: string);
      uiLogoutClusterAdminForUser(index: string);
      uiImpersonateUser(index: string);
      switchToDevConsole();
      switchToAdmConsole();
    }
  }
}

  function getOauthUrl() {
    const baseUrl = Cypress.config('baseUrl');
    if (!baseUrl) {
      throw new Error('Cypress baseUrl is not set');
    }
    return baseUrl.replace("console-openshift-console", "oauth-openshift");
  }

  // Core login function (used by both session and non-session versions)
  function performLogin(
    provider: string,
    username: string,
    password: string,
    oauthurl: string
  ): void {
    cy.visit(Cypress.config('baseUrl'));
    cy.log('Session - after visiting');
    cy.window().then(
      (
        win: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ) => {
        // Check if auth is disabled (for a local development environment)
        if (win.SERVER_FLAGS?.authDisabled) {
          cy.task('log', '  skipping login, console is running with auth disabled');
          return;
        }
        cy.exec(
          `oc get node --selector=hypershift.openshift.io/managed --kubeconfig ${Cypress.env('KUBECONFIG_PATH')}`,
        ).then((result) => {
          cy.log(result.stdout);
          cy.task('log', result.stdout);
          if (result.stdout.includes('Ready')) {
            cy.log(`Attempting login via cy.origin to: ${oauthurl}`);
            cy.task('log', `Attempting login via cy.origin to: ${oauthurl}`);
            cy.origin(
              oauthurl,
              { args: { username, password } },
              ({ username, password }) => {
                cy.get('#inputUsername').type(username);
                cy.get('#inputPassword').type(password);
                cy.get('button[type=submit]').click();
              },
            );
          } else {
            cy.task('log', `Logging in as ${username} using fallback on ${oauthurl}`);
            cy.origin(
              oauthurl,
              { args: { provider, username, password } },
              ({ provider, username, password }) => {
                cy.get('[data-test-id="login"]').should('be.visible');
                cy.get('body').then(($body) => {
                  if ($body.text().includes(provider)) {
                    cy.contains(provider).should('be.visible').click();
                  }
                });
                cy.get('#inputUsername').type(username);
                cy.get('#inputPassword').type(password);
                cy.get('button[type=submit]').click();
              }
            );
          }
        });
      },
    );
  }

  Cypress.Commands.add('validateLogin', () => {
    cy.visit('/');
    cy.wait(2000);
    cy.byTestID("username", {timeout: 120000}).should('be.visible');
    guidedTour.close();
  });

  // Session-wrapped login
  Cypress.Commands.add(
      'login',
      (
        provider: string = Cypress.env('LOGIN_IDP'),
        username: string = Cypress.env('LOGIN_USERNAME'),
        password: string = Cypress.env('LOGIN_PASSWORD'),
        oauthurl: string,
      ) => {
        cy.session(
          [provider, username],
          () => {
            performLogin(provider, username, password, oauthurl);
          },
          {
            cacheAcrossSpecs: true,
            validate() {
              cy.validateLogin();
            },
          },
        );
      },
    );

  // Non-session login (for use within sessions)
  Cypress.Commands.add('loginNoSession', (provider: string, username: string, password: string, oauthurl: string) => {
    performLogin(provider, username, password, oauthurl);
    cy.validateLogin();
  });

  Cypress.Commands.add('switchPerspective', (perspective: string) => {
    /* If side bar is collapsed then expand it
    before switching perspecting */
    cy.wait(2000);
    cy.get('body').then((body) => {
      if (body.find('.pf-m-collapsed').length > 0) {
        cy.get('#nav-toggle').click();
      }
    });
    nav.sidenav.switcher.changePerspectiveTo(perspective);
  });

  // To avoid influence from upstream login change
  Cypress.Commands.add('uiLogin', (provider: string, username: string, password: string) => {
    cy.log('Commands uiLogin');
    cy.clearCookie('openshift-session-token');
    cy.visit('/');
    cy.window().then(
      (
        win: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ) => {
        if (win.SERVER_FLAGS?.authDisabled) {
          cy.task('log', 'Skipping login, console is running with auth disabled');
          return;
        }
        cy.get('[data-test-id="login"]').should('be.visible');
        cy.get('body').then(($body) => {
          if ($body.text().includes(provider)) {
            cy.contains(provider).should('be.visible').click();
          } else if ($body.find('li.idp').length > 0) {
            //Using the last idp if doesn't provider idp name
            cy.get('li.idp').last().click();
          }
        });
        cy.get('#inputUsername').type(username);
        cy.get('#inputPassword').type(password);
        cy.get('button[type=submit]').click();
        cy.byTestID('username', { timeout: 120000 }).should('be.visible');
      },
    );
    cy.switchPerspective('Administrator');
  });

  Cypress.Commands.add('uiLogout', () => {
    cy.window().then(
      (
        win: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ) => {
        if (win.SERVER_FLAGS?.authDisabled) {
          cy.log('Skipping logout, console is running with auth disabled');
          return;
        }
        cy.log('Log out UI');
        cy.byTestID('username').click({ force: true });
        cy.byTestID('log-out').should('be.visible');
        cy.byTestID('log-out').click({ force: true });
      },
    );
  });

  Cypress.Commands.add('cliLogin', (username?, password?, hostapi?) => {
    const loginUsername = username || Cypress.env('LOGIN_USERNAME');
    const loginPassword = password || Cypress.env('LOGIN_PASSWORD');
    const hostapiurl = hostapi || Cypress.env('HOST_API');
    cy.exec(
      `oc login -u ${loginUsername} -p ${loginPassword} ${hostapiurl} --insecure-skip-tls-verify=true`,
      { failOnNonZeroExit: false },
    ).then((result) => {
      cy.log(result.stderr);
      cy.log(result.stdout);
    });
  });

  Cypress.Commands.add('cliLogout', () => {
    cy.exec(`oc logout`, { failOnNonZeroExit: false }).then((result) => {
      cy.log(result.stderr);
      cy.log(result.stdout);
    });
  });

  Cypress.Commands.add('adminCLI', (command: string) => {
    const kubeconfig = Cypress.env('KUBECONFIG_PATH');
    cy.log(`Run admin command: ${command}`);
    cy.exec(`${command} --kubeconfig ${kubeconfig}`);
  });
  
  Cypress.Commands.add('executeAndDelete', (command: string) => {
    cy.exec(command, { failOnNonZeroExit: false })
      .then(result => {
        if (result.code !== 0) {
          cy.task('logError', `Command "${command}" failed: ${result.stderr || result.stdout}`);
        } else {
          cy.task('log', `Command "${command}" executed successfully`);
        }
      });
  });

///UI Common Function for Logging for anli

Cypress.Commands.add('cliLoginAsUser', (index: string) => {
  cy.log(`login as the ${index} user`);
  let username="";
  let userpassword="";
  cy.readFile(Env.admin_kubeconfig)
    .then(content => cy.writeFile(Env.normal_kubeconfig, content));

  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[Env.Rank.toIndex[index]].split(':')[0];
    userpassword=Cypress.env('LOGIN_USERS').split(',')[Env.Rank.toIndex[index]].split(':')[1];
  }
  if( username != "" && userpassword != "" ){
    cy.exec(`oc login -u ${username} -p ${userpassword}  --kubeconfig=${Env.normal_kubeconfig}`);
  }else{
    cy.log('no user can be found.');
    cy.exit();
  }
})

//Login a user from LOGIN_USERS=test1:passwd,user2,passwd,user2:pasword,...
Cypress.Commands.add('uiLoginAsUser', (index: string) => {
  cy.log(`login as the ${index} user`);
  let username="";
  let userpassword="";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[Env.Rank.toIndex[index]].split(':')[0];
    userpassword=Cypress.env('LOGIN_USERS').split(',')[Env.Rank.toIndex[index]].split(':')[1];
  }
  const oauth_url=getOauthUrl()
  if( username != "" && userpassword != "" && Cypress.env('LOGIN_IDP') != "" ){
    cy.login(Cypress.env('LOGIN_IDP'), username, userpassword, oauth_url);
    guidedTour.close()
  }else{
    cy.log('no user can be found.');
    cy.exit();
  }
})

//Login user as the cluster-admin
//Rank: first_user, second_user ... five_user
Cypress.Commands.add('uiLoginAsClusterAdminForUser', (index: string) => {
  cy.log(`login the ${index} user as clsuter admin`);
  let username="";
  let userpassword="";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[Env.Rank.toIndex[index]].split(':')[0];
    userpassword=Cypress.env('LOGIN_USERS').split(',')[Env.Rank.toIndex[index]].split(':')[1];
  }
  const oauth_url=getOauthUrl()
  if( username != "" && userpassword != "" && Cypress.env('LOGIN_IDP') != "" ){
    cy.adminCLI(`oc adm policy add-cluster-role-to-user cluster-admin ${username}`);
    cy.login(Cypress.env('LOGIN_IDP'), username, userpassword, oauth_url);
    guidedTour.close()
  }else{
    cy.log('Can not find the ${index} user');
    cy.exit();
  }
})

Cypress.Commands.add('uiLogoutUser', (index: string) => {
  cy.log('Logout the ${index} user');
  cy.uiLogout();
})

Cypress.Commands.add('uiLogoutClusterAdminForUser', (index: string) => {
  cy.log('Logout the ${index} user and remove the cluster admin roles');
  let username = "";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[Env.Rank.toIndex[index]].split(':')[0];
  }
  if( username != "" ){
    cy.adminCLI(`oc adm policy remove-cluster-role-from-user cluster-admin ${username}`);
  }
  cy.uiLogout();
})

Cypress.Commands.add('uiImpersonateUser', (index: string) => {
  cy.log(`Cluster Admin Impersonate the ${index} user `);
  let username = "";
  if (Cypress.env('LOGIN_USERS')){
    username=Cypress.env('LOGIN_USERS').split(',')[Env.Rank.toIndex[index]].split(':')[0];
  }
  if( username == "" ){
    cy.log(`can not find the ${index} user.`);
    this.skip();
  }
  let fullusername=Cypress.env('LOGIN_IDP') + ":" + username

  cy.switchToAdmConsole();
  //cy.visit("/k8s/cluster/user.openshift.io~v1~User", { timeout: 120000 } );
  cy.clickNavLink(['User Management', 'Users']);
  //We can check if User Table exist or not in 4.22+
  //cy.get(`table[aria-label="Users table"]`, { timeout: 120000 } ).should('exist');
  cy.contains('td', fullusername, { timeout: 120000 } )
    .closest('tr')
    .find('button[data-test-id="kebab-button"]')
    .click();
  cy.contains('button', 'Impersonate User').click();
  //find the username to see if Impersonate User succeed or not
  cy.contains('[data-test="username"]', `${username}`).should('exist')

  //Close guide tour bar
  guidedTour.close()
})

Cypress.Commands.add("switchToDevConsole",() => {
  cy.switchPerspective('Developer');
  guidedTour.close();
})

Cypress.Commands.add("switchToAdmConsole",() => {
  cy.exec(`oc get console.operator cluster -o jsonpath='{.spec.customization.perspectives}'`).then((result) => {
    if (!result.stdout.includes('{"state":"Enabled"}')){
       cy.log('no customization.perspectives is enabled');
    }else{
      switch (String(Cypress.env('OPENSHIFT_VERSION'))) {
        case '4.12':
        case '4.13':
        case '4.14':
        case '4.15':
        case '4.16':
        case '4.17':
        case '4.18':
        case '4.19':
        case '4.20':
          cy.switchPerspective('Administrator');
          break
        default:
          cy.switchPerspective('Core platform');
      }
    }
  })
  guidedTour.close();
})
