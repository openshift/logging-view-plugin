export type CancellableFetch<T> = {
  request: () => Promise<T>;
  abort: () => void;
};

export type RequestInitWithTimeout = RequestInit & { timeout?: number };

class TimeoutError extends Error {
  constructor(url: string, ms: number) {
    super(`Request: ${url} timed out after ${ms}ms.`);
  }
}

class FetchError extends Error {
  status: number;
  name: string;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'Fetch Error';
    this.status = status;
  }
}

export const isFetchError = (error: unknown): error is FetchError =>
  !!(error as FetchError).name && (error as FetchError).name === 'Fetch Error';

export const cancellableFetch = <T>(
  url: string,
  init?: RequestInitWithTimeout,
): CancellableFetch<T> => {
  const abortController = new AbortController();
  const abort = () => abortController.abort();

  const fetchPromise = fetch(url, {
    ...init,
    headers: { ...init?.headers, Accept: 'application/json' },
    signal: abortController.signal,
  }).then(async (response) => {
    if (!response.ok) {
      const text = await response.text();
      throw new FetchError(text, response.status);
    }
    return response.json();
  });

  const timeout = init?.timeout ?? 60 * 1000;

  if (timeout <= 0) {
    return { request: () => fetchPromise, abort };
  }

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    setTimeout(() => reject(new TimeoutError(url.toString(), timeout)), timeout);
  });

  const request = () => Promise.race([fetchPromise, timeoutPromise]);

  return { request, abort };
};
