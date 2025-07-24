import { TestIds } from '../../../src/test-ids';
import {
  queryRangeMatrixInvalidResponse,
  queryRangeMatrixValidResponse,
  queryRangeStreamsErrorResponse,
  queryRangeStreamsInvalidResponse,
  queryRangeStreamsValidResponse,
  queryRangeStreamsWithLineFormatting,
  queryRangeStreamsWithMessage,
  volumeRangeMatrixValidResponse,
} from '../../fixtures/query-range-fixtures';
import { namespaceListResponse, podsListResponse } from '../fixtures/resource-api-fixtures';
import { formatTimeRange } from '../../src/time-range';
import { configResponse } from '../../fixtures/backend-fixtures';

const LOGS_PAGE_URL = '/monitoring/logs';

describe('Logs Page', () => {

  before( function() {
    cy.uiLoginAsClusterAdmin('first_user');
  });

  it('tests hello word', () => {
    cy.visit(LOGS_PAGE_URL);
    cy.getByTestId(TestIds.LogsTable, {timeout: 10000}).should("be.visible")
  });
});
