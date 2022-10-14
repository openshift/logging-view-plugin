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
      throw new Error(text);
    }
    return response.json();
  });

  const timeout = init?.timeout ?? 30 * 1000;

  if (timeout <= 0) {
    return { request: () => fetchPromise, abort };
  }

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    setTimeout(() => reject(new TimeoutError(url.toString(), timeout)), timeout);
  });

  const request = () => Promise.race([fetchPromise, timeoutPromise]);

  return { request, abort };
};
