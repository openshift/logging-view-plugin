const mockConsoleFetch = jest.fn();
const mockPost = jest.fn();

// Properly type the mock
Object.assign(mockConsoleFetch, {
  post: mockPost,
});

jest.mock('@openshift-console/dynamic-plugin-sdk/lib/utils/fetch', () => ({
  consoleFetchJSON: mockConsoleFetch,
}));

import { cancellableFetch, isFetchError } from '../cancellable-fetch';

describe('cancellableFetch with consoleFetchJSON', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should make a GET request using consoleFetchJSON', async () => {
    const mockResponse = { data: 'test' };
    mockConsoleFetch.mockResolvedValue(mockResponse);

    const { request } = cancellableFetch('https://example.com');
    const result = await request();

    expect(result).toEqual(mockResponse);
    expect(mockConsoleFetch).toHaveBeenCalledWith(
      'https://example.com',
      'GET',
      { signal: expect.any(AbortSignal) },
      30000,
    );
  });

  it('should make a POST request using consoleFetchJSON.post', async () => {
    const mockResponse = { data: 'test' };
    mockPost.mockResolvedValue(mockResponse);

    const { request } = cancellableFetch(
      'https://example.com',
      {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      },
      5000,
    );
    await request();

    expect(mockPost).toHaveBeenCalledWith(
      'https://example.com',
      JSON.stringify({ test: 'data' }),
      {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        signal: expect.any(AbortSignal),
      },
      5000,
    );
  });

  it('should handle timeout configuration', async () => {
    const mockResponse = { data: 'test' };
    mockConsoleFetch.mockResolvedValue(mockResponse);

    const { request } = cancellableFetch('https://example.com', undefined, 5000);
    await request();

    expect(mockConsoleFetch).toHaveBeenCalledWith(
      'https://example.com',
      'GET',
      { signal: expect.any(AbortSignal) },
      5000,
    );
  });

  it('should disable timeout when timeout is 0', async () => {
    const mockResponse = { data: 'test' };
    mockConsoleFetch.mockResolvedValue(mockResponse);

    const { request } = cancellableFetch('https://example.com', undefined, 0);
    await request();

    expect(mockConsoleFetch).toHaveBeenCalledWith(
      'https://example.com',
      'GET',
      { signal: expect.any(AbortSignal) },
      undefined,
    );
  });

  it('should handle errors and convert them to FetchError', async () => {
    const error = new Error('Network error');
    mockConsoleFetch.mockRejectedValue(error);

    const { request } = cancellableFetch('https://example.com');

    await expect(request()).rejects.toThrow('Network error');

    try {
      await request();
    } catch (err) {
      expect(isFetchError(err)).toBe(true);
    }
  });

  it('should handle abort controller', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    mockConsoleFetch.mockRejectedValue(abortError);

    const { request } = cancellableFetch('https://example.com');

    await expect(request()).rejects.toThrow('AbortError');
  });

  it('should work with POST method', async () => {
    const mockResponse = { data: 'test' };

    // Test POST
    mockPost.mockResolvedValueOnce(mockResponse);
    const postRequest = cancellableFetch('https://example.com', { method: 'POST', body: '{}' });
    await postRequest.request();
    expect(mockPost).toHaveBeenCalled();
  });
});
