/** Apply a cloud import component draft env onto inline form state */

export function isSecretRef(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('$Secret{');
}

/** DT-039 trace: shows presence/shape of a possibly-sensitive value, never the plaintext. */
function redact(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  const str = String(value);
  if (!str) return 'empty-string';
  return `len=${str.length}${isSecretRef(str) ? ' isSecretRef=true' : ''} preview="${str.slice(0, 4)}..."`;
}

/** Hide manual credential fields once a cloud connection has been chosen. */
export function shouldHideManualCloudCredentials(env: {
  cloud?: string;
  linkedFromCloud?: boolean;
}): boolean {
  return Boolean(env.cloud?.trim()) || Boolean(env.linkedFromCloud);
}

/** Bucket/container name for validation and display (handles GCP field naming). */
export function getStorageBucketName(env: {
  type?: string;
  bucketName?: string;
  gcpBucketName?: string;
  containerName?: string;
}): string {
  const type = String(env.type || '').toLowerCase();
  if (type === 'gcp') {
    return String(env.gcpBucketName || env.bucketName || '');
  }
  if (type === 'azure') {
    return String(env.containerName || '');
  }
  return String(env.bucketName || env.gcpBucketName || '');
}

export function extractCloudDraftEnv(
  result: unknown,
  envSlug?: string,
): Record<string, unknown> | undefined {
  const root = result as Record<string, unknown> | undefined;
  if (!root) return undefined;

  const componentDraft = (
    (root.componentDraft as Record<string, unknown> | undefined) ??
    (root.data as Record<string, unknown> | undefined)?.componentDraft ??
    ((root.data as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)
      ?.componentDraft
  ) as Record<string, unknown> | undefined;

  const draft =
    (componentDraft?.draft as Record<string, unknown> | undefined) ??
    (componentDraft as Record<string, unknown> | undefined);

  const envs = draft?.envs as Array<Record<string, unknown>> | undefined;
  if (envs?.length) {
    const draftType = draft?.type as string | undefined;
    const env = envSlug
      ? (envs.find((e) => String(e.slug || '') === envSlug) ?? envs[0])
      : envs[0];
    return draftType ? { graphType: draftType, ...env } : env;
  }

  const resource = root.resource as Record<string, unknown> | undefined;
  const resourceName = String(resource?.name || resource?.id || '');
  if (resourceName) {
    return {
      slug: envSlug,
      config: { bucketName: resourceName, containerName: resourceName },
    };
  }

  return undefined;
}

/** Minimal draft shape when applying a selected resource before import completes. */
export function storageResourceShellDraft(
  provider: string,
  resource: { id?: string; name?: string } | undefined,
  resourceId: string,
  envSlug: string,
): Record<string, unknown> {
  const resourceName = String(resource?.name || resource?.id || resourceId);
  const p = provider.toLowerCase();
  if (p === 'azure') {
    return { slug: envSlug, type: 'azure', config: { containerName: resourceName } };
  }
  if (p === 'gcp') {
    return { slug: envSlug, type: 'gcp', config: { bucketName: resourceName } };
  }
  return { slug: envSlug, type: 'aws', config: { bucketName: resourceName } };
}

export function mergeStorageEnvFromDraft(
  env: Record<string, unknown>,
  draftEnv: Record<string, unknown>,
): Record<string, unknown> {
  const cfg = (draftEnv.config as Record<string, unknown> | undefined) || draftEnv;
  const provider = String(draftEnv.type || cfg.type || env.type || '').toLowerCase();
  const cloud = String(cfg.cloud || draftEnv.cloud || env.cloud || '');
  const next = { ...env, type: provider || env.type };

  if (cloud) {
    const bucketName = String(
      cfg.bucketName ||
        cfg.containerName ||
        draftEnv.bucketName ||
        draftEnv.gcpBucketName ||
        draftEnv.containerName ||
        env.bucketName ||
        env.gcpBucketName ||
        env.containerName ||
        '',
    );
    return {
      ...next,
      cloud,
      linkedFromCloud: true,
      bucketName: provider === 'aws' || provider === 'gcp' ? bucketName : env.bucketName,
      gcpBucketName: provider === 'gcp' ? bucketName : env.gcpBucketName,
      containerName: provider === 'azure' ? bucketName : env.containerName,
      region: String(cfg.region || draftEnv.region || env.region || 'us-east-1'),
      location: String(cfg.location || draftEnv.location || env.location || 'US'),
    };
  }

  if (provider === 'aws') {
    const bucketName = String(cfg.bucketName || draftEnv.bucketName || env.bucketName || '');
    return {
      ...next,
      bucketName,
      accessKeyId: String(cfg.accessKeyId || draftEnv.accessKeyId || env.accessKeyId || ''),
      secretAccessKey: String(cfg.secretAccessKey || draftEnv.secretAccessKey || env.secretAccessKey || ''),
      region: String(cfg.region || draftEnv.region || env.region || 'us-east-1'),
    };
  }
  if (provider === 'azure') {
    return {
      ...next,
      containerName: String(cfg.containerName || draftEnv.containerName || env.containerName || ''),
      connectionString: String(
        cfg.connectionString || draftEnv.connectionString || env.connectionString || '',
      ),
    };
  }
  if (provider === 'gcp') {
    const nested = (cfg.config || {}) as Record<string, unknown>;
    const bucketName = String(
      cfg.bucketName || draftEnv.gcpBucketName || draftEnv.bucketName || env.gcpBucketName || env.bucketName || '',
    );
    return {
      ...next,
      gcpBucketName: bucketName,
      bucketName,
      gcpProjectId: String(nested.project_id || draftEnv.gcpProjectId || env.gcpProjectId || ''),
      gcpClientEmail: String(nested.client_email || draftEnv.gcpClientEmail || env.gcpClientEmail || ''),
      gcpPrivateKey: String(nested.private_key || draftEnv.gcpPrivateKey || env.gcpPrivateKey || ''),
    };
  }

  const fallbackBucket = String(
    cfg.bucketName ||
      cfg.containerName ||
      draftEnv.bucketName ||
      draftEnv.gcpBucketName ||
      draftEnv.containerName ||
      '',
  );
  if (fallbackBucket) {
    return {
      ...next,
      bucketName: fallbackBucket,
      gcpBucketName: fallbackBucket,
      containerName: fallbackBucket,
    };
  }
  return next;
}

export function mergeDatabaseEnvFromDraft(
  env: Record<string, unknown>,
  draftEnv: Record<string, unknown>,
): Record<string, unknown> {
  const cloud = String(draftEnv.cloud || env.cloud || '');
  if (cloud) {
    const securityGroups = Array.isArray(draftEnv.securityGroups)
      ? (draftEnv.securityGroups as string[]).map(String).filter(Boolean)
      : Array.isArray(env.securityGroups)
        ? (env.securityGroups as string[]).map(String).filter(Boolean)
        : undefined;
    const next: Record<string, unknown> = {
      ...env,
      cloud,
      linkedFromCloud: true,
      connection_url: String(draftEnv.connection_url || env.connection_url || ''),
      region: String(draftEnv.region || env.region || ''),
      instance: String(draftEnv.instance || env.instance || ''),
      ...(draftEnv.dbName != null ? { dbName: String(draftEnv.dbName) } : {}),
    };
    if (securityGroups?.length) {
      next.securityGroups = securityGroups;
      next.securityGroupsAuto = false;
    } else if (typeof draftEnv.securityGroupsAuto === 'boolean') {
      next.securityGroupsAuto = draftEnv.securityGroupsAuto;
    }
    if (typeof draftEnv.importExisting === 'boolean') {
      next.importExisting = draftEnv.importExisting;
    }
    if (draftEnv.credentialsStored === true && draftEnv.importExisting) {
      next.credentialsStored = true;
      delete next.masterPassword;
    } else if (draftEnv.masterPassword && draftEnv.importExisting) {
      next.masterPassword = String(draftEnv.masterPassword);
      next.credentialsStored = false;
    } else if (draftEnv.importExisting === false) {
      delete next.masterPassword;
      delete next.credentialsStored;
    }
    return next;
  }
  return {
    ...env,
    connection_url: String(draftEnv.connection_url || env.connection_url || ''),
    region: String(draftEnv.region || env.region || ''),
  };
}

export function mergeGraphEnvFromDraft(
  env: Record<string, unknown>,
  draftEnv: Record<string, unknown>,
): Record<string, unknown> {
  const cloud = String(draftEnv.cloud || env.cloud || '');
  if (cloud) {
    const securityGroups = Array.isArray(draftEnv.securityGroups)
      ? (draftEnv.securityGroups as string[]).map(String).filter(Boolean)
      : Array.isArray(env.securityGroups)
        ? (env.securityGroups as string[]).map(String).filter(Boolean)
        : undefined;
    const next: Record<string, unknown> = {
      ...env,
      cloud,
      linkedFromCloud: true,
      connection_url: String(draftEnv.connection_url || env.connection_url || ''),
      region: String(draftEnv.region || env.region || ''),
      instance: String(draftEnv.instance || env.instance || ''),
      iamAuth: draftEnv.iamAuth === true || draftEnv.iamAuth === 'true',
      ...(draftEnv.database != null ? { database: String(draftEnv.database) } : {}),
    };
    if (securityGroups?.length) {
      next.securityGroups = securityGroups;
      next.securityGroupsAuto = false;
    } else if (typeof draftEnv.securityGroupsAuto === 'boolean') {
      next.securityGroupsAuto = draftEnv.securityGroupsAuto;
    }
    if (typeof draftEnv.importExisting === 'boolean') {
      next.importExisting = draftEnv.importExisting;
    }
    if (draftEnv.credentialsStored === true && draftEnv.importExisting) {
      next.credentialsStored = true;
      delete next.masterPassword;
    } else if (draftEnv.masterPassword && draftEnv.importExisting) {
      next.masterPassword = String(draftEnv.masterPassword);
      next.credentialsStored = false;
    } else if (draftEnv.importExisting === false) {
      delete next.masterPassword;
      delete next.credentialsStored;
    }
    console.log('[DT-039-TRACE] mergeGraphEnvFromDraft output:', {
      slug: env.slug,
      draftEnvMasterPassword: redact(draftEnv.masterPassword),
      draftEnvImportExisting: draftEnv.importExisting,
      draftEnvCredentialsStored: draftEnv.credentialsStored,
      nextMasterPassword: redact(next.masterPassword),
      nextCredentialsStored: next.credentialsStored,
    });
    return next;
  }
  return {
    ...env,
    connection_url: String(draftEnv.connection_url || env.connection_url || ''),
    region: String(draftEnv.region || env.region || ''),
    iamAuth: draftEnv.iamAuth === true || draftEnv.iamAuth === 'true',
  };
}

export function mergeBrokerEnvFromDraft(
  env: Record<string, unknown>,
  draftEnv: Record<string, unknown>,
): Record<string, unknown> {
  const cfg = (draftEnv.config as Record<string, unknown> | undefined) || draftEnv;
  const cloud = String(cfg.cloud || draftEnv.cloud || env.cloud || '');
  if (cloud) {
    return {
      ...env,
      cloud,
      linkedFromCloud: true,
      awsRegion: String(cfg.region || draftEnv.region || env.awsRegion || 'us-east-1'),
      awsQueueUrl: String(cfg.queueUrl || env.awsQueueUrl || ''),
      queueName: String(cfg.queueName || cfg.topicName || env.queueName || ''),
      gcpProjectId: String(cfg.projectId || env.gcpProjectId || ''),
    };
  }
  return {
    ...env,
    awsRegion: String(cfg.region || env.awsRegion || 'us-east-1'),
    awsAccessKeyId: String(cfg.accessKeyId || env.awsAccessKeyId || ''),
    awsSecretAccessKey: String(cfg.secretAccessKey || env.awsSecretAccessKey || ''),
    awsQueueUrl: String(cfg.queueUrl || env.awsQueueUrl || ''),
  };
}

export function mergeVectorEnvFromDraft(
  env: Record<string, unknown>,
  draftEnv: Record<string, unknown>,
): Record<string, unknown> {
  const cloud = String(draftEnv.cloud || env.cloud || '');
  if (cloud) {
    return {
      ...env,
      cloud,
      linkedFromCloud: true,
      endpoint: String(draftEnv.endpoint || env.endpoint || ''),
      apiKey: String(draftEnv.apiKey || env.apiKey || ''),
      index: String(draftEnv.index || env.index || ''),
      namespace: String(draftEnv.namespace || env.namespace || ''),
      region: String(draftEnv.region || env.region || ''),
    };
  }
  return {
    ...env,
    endpoint: String(draftEnv.endpoint || env.endpoint || ''),
    apiKey: String(draftEnv.apiKey || env.apiKey || ''),
    index: String(draftEnv.index || env.index || ''),
    namespace: String(draftEnv.namespace || env.namespace || ''),
    region: String(draftEnv.region || env.region || ''),
  };
}
