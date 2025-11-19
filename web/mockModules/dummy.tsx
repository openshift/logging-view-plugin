export { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
export { WSFactory } from '@openshift-console/dynamic-plugin-sdk/lib/utils/k8s/ws-factory';

export const useK8sWatchResource = () => [null, true, ''];
export const useActivePerspective = () => ['admin'];
export const useAccessReview = () => [true, false];

class FetchError extends Error {
  status: number;
  name: string;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'Fetch Error';
    this.status = status;
  }
}

export const consoleFetchJSON = async (
  url: string,
  _method: string,
  init?: RequestInit,
  _timeout?: number,
) => {
  const response = await fetch(url, init);

  if (!response.ok) {
    const text = await response.text();
    throw new FetchError(text, response.status);
  }
  return response.json();
};
