/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />
import { TestIds } from '../../src/test-ids';

declare global {
  namespace Cypress {
    interface Chainable {
      getByTestId(testId: TestIds): Chainable<JQuery<Element>>;
      byTestID(testId: TestIds): Chainable<JQuery<Element>>;
    }
  }
}

Cypress.Commands.add('getByTestId', (testId: TestIds) => cy.get(`[data-test="${testId}"]`));
Cypress.Commands.add('byTestID', (testId: TestIds) => cy.get(`[data-test="${testId}"]`));
