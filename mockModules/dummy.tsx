export { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
export { WSFactory } from '@openshift-console/dynamic-plugin-sdk/lib/utils/k8s/ws-factory';

export class Dummy extends Error {
  constructor() {
    super('Dummy file for exports');
  }
}
