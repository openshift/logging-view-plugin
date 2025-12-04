/* eslint-disable @typescript-eslint/no-var-requires */
import './commands';

Cypress.on('uncaught:exception', (err) => {
  console.error("Uncaught error:", err.message);
  return false;
});
