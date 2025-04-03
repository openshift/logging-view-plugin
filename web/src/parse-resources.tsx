import { Resource } from './logs.types';
import { notUndefined } from './value-utils';

export enum KindLabel {
  Container = 'Container',
  Namespace = 'Namespace',
  Pod = 'Pod',
}

export enum OtelStreamLabel {
  ContainerName = 'k8s_container_name',
  Namespace = 'k8s_namespace_name',
  PodName = 'k8s_pod_name',
}

export enum ViaQStreamLabel {
  ContainerName = 'kubernetes_container_name',
  Namespace = 'kubernetes_namespace_name',
  PodName = 'kubernetes_pod_name',
}

export const parse = (
  data: Record<string, string>,
  labelKind: KindLabel,
  otelStreamLabel: OtelStreamLabel,
  viaqStreamLabel: ViaQStreamLabel,
) => {
  if (data[otelStreamLabel]) {
    return {
      kind: labelKind,
      name: data[otelStreamLabel],
    };
  } else if (data[viaqStreamLabel]) {
    return {
      kind: labelKind,
      name: data[viaqStreamLabel],
    };
  }
  return undefined;
};

export const parseResources = (data: Record<string, string>): Array<Resource> => {
  const container = parse(
    data,
    KindLabel.Container,
    OtelStreamLabel.ContainerName,
    ViaQStreamLabel.ContainerName,
  );
  const namespace = parse(
    data,
    KindLabel.Namespace,
    OtelStreamLabel.Namespace,
    ViaQStreamLabel.Namespace,
  );
  const pod = parse(data, KindLabel.Pod, OtelStreamLabel.PodName, ViaQStreamLabel.PodName);
  return [namespace, pod, container].filter(notUndefined);
};
