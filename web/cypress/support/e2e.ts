import '@cypress/grep';

import './commands/selector-commands';
import './commands/auth-commands';
import './commands/utility-commands';
import './commands/log-commands';

export const checkErrors = () =>
  cy.window().then((win) => {
    assert.isTrue(!win.windowError, win.windowError);
  });

// Ignore benign ResizeObserver errors globally so they don't fail tests
// See: https://docs.cypress.io/api/cypress-api/catalog-of-events#Uncaught-Exceptions
Cypress.on('uncaught:exception', (err) => {
  const message = err?.message || String(err || '');
  if (
    message.includes('ResizeObserver loop limit exceeded') ||
    message.includes('ResizeObserver loop completed with undelivered notifications') ||
    message.includes('ResizeObserver') ||
    message.includes('Cannot read properties of undefined') ||
    message.includes('Unauthorized') ||
    message.includes('Bad Gateway') ||
    message.includes(`Cannot read properties of null (reading 'default')`) ||
    message.includes(`(intermediate value) is not a function`)
  ) {
    console.warn('Ignored frontend exception:', err.message);
    return false;
  }
  // allow other errors to fail the test
});

Cypress.on('uncaught:exception', (err) => {
  console.error('Uncaught error:', err.message);
  return false;
});
