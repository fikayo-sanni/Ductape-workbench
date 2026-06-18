/** React Query keys for cloud connections — always include workspace id. */

export function cloudConnectionsQueryKey(workspaceId: string | null | undefined) {
  return ['cloud-connections', workspaceId ?? ''] as const;
}

export function cloudConnectionQueryKey(
  workspaceId: string | null | undefined,
  cloudRef: string,
  resolvedId?: string | null,
) {
  return ['cloud-connection', workspaceId ?? '', cloudRef, resolvedId ?? ''] as const;
}

export function cloudConnectionResourcesQueryKey(
  workspaceId: string | null | undefined,
  cloudRef: string,
  activeService: string,
  region: string,
) {
  return ['cloud-connection-resources', workspaceId ?? '', cloudRef, activeService, region] as const;
}
