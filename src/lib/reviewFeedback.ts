export type ReviewFeedbackTopic =
  | 'general'
  | 'metadata'
  | 'actions'
  | 'authentication'
  | 'environments'
  | 'webhooks';

export interface ReviewFeedbackResource {
  id: string;
  label: string;
}

export type ReviewFeedbackResourcesByTopic = Partial<
  Record<ReviewFeedbackTopic, ReviewFeedbackResource[]>
>;

export interface ReviewFeedbackMessage {
  _id: string;
  app_id: string;
  workspace_id: string;
  author_type: 'admin' | 'workspace';
  author_id: string;
  author_name: string;
  topic: ReviewFeedbackTopic;
  resource_id?: string;
  resource_label?: string;
  message: string;
  created_at: string;
}

export interface ReviewFeedbackPostPayload {
  message: string;
  topic: ReviewFeedbackTopic;
  resource_id?: string;
  resource_label?: string;
}

export const REVIEW_FEEDBACK_TOPICS: Array<{ value: ReviewFeedbackTopic; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'metadata', label: 'App info & metadata' },
  { value: 'actions', label: 'Actions' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'environments', label: 'Environments' },
  { value: 'webhooks', label: 'Webhooks' },
];

export function topicLabel(topic: string) {
  return REVIEW_FEEDBACK_TOPICS.find((t) => t.value === topic)?.label ?? topic;
}

export function resourceSelectLabel(topic: ReviewFeedbackTopic) {
  switch (topic) {
    case 'actions':
      return 'Specific action';
    case 'authentication':
      return 'Specific auth config';
    case 'environments':
      return 'Specific environment';
    case 'webhooks':
      return 'Specific webhook';
    default:
      return 'Specific item';
  }
}

function resourceId(value?: string, fallback?: string) {
  return String(value ?? fallback ?? '').trim();
}

export function buildReviewFeedbackResources(version?: {
  actions?: Array<{ _id?: string; tag?: string; name?: string }>;
  envs?: Array<{ slug?: string; env_name?: string }>;
  auths?: Array<{ tag?: string; name?: string }>;
  webhooks?: Array<{ tag?: string; name?: string }>;
}): ReviewFeedbackResourcesByTopic {
  if (!version) return {};

  const resources: ReviewFeedbackResourcesByTopic = {};

  if (version.actions?.length) {
    resources.actions = version.actions
      .map((action) => ({
        id: resourceId(action.tag, action._id),
        label: action.name ?? action.tag ?? 'Untitled action',
      }))
      .filter((item) => item.id);
  }

  if (version.auths?.length) {
    resources.authentication = version.auths
      .map((auth) => ({
        id: resourceId(auth.tag, auth.name),
        label: auth.name ?? auth.tag ?? 'Auth config',
      }))
      .filter((item) => item.id);
  }

  if (version.envs?.length) {
    resources.environments = version.envs
      .map((env) => ({
        id: resourceId(env.slug, env.env_name),
        label: env.env_name ?? env.slug ?? 'Environment',
      }))
      .filter((item) => item.id);
  }

  if (version.webhooks?.length) {
    resources.webhooks = version.webhooks
      .map((webhook) => ({
        id: resourceId(webhook.tag, webhook.name),
        label: webhook.name ?? webhook.tag ?? 'Webhook',
      }))
      .filter((item) => item.id);
  }

  return resources;
}

function getLatestVersion(app?: {
  versions?: Array<{
    latest?: boolean;
    actions?: Array<{ _id?: string; tag?: string; name?: string }>;
    envs?: Array<{ slug?: string; env_name?: string }>;
    auths?: Array<{ tag?: string; name?: string }>;
    webhooks?: Array<{ tag?: string; name?: string }>;
  }>;
}) {
  if (!app?.versions?.length) return undefined;
  return app.versions.find((version) => version.latest) ?? app.versions[0];
}

export function buildReviewFeedbackResourcesFromApp(app?: {
  versions?: Array<{
    latest?: boolean;
    actions?: Array<{ _id?: string; tag?: string; name?: string }>;
    envs?: Array<{ slug?: string; env_name?: string }>;
    auths?: Array<{ tag?: string; name?: string }>;
    webhooks?: Array<{ tag?: string; name?: string }>;
  }>;
}) {
  return buildReviewFeedbackResources(getLatestVersion(app ?? {}));
}
