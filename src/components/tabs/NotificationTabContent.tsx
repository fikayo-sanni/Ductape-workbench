import { useState } from 'react';
import { Bell, Mail, Webhook, Loader2, CheckCircle, Eye, EyeOff, Copy, Check, MessageSquare } from 'lucide-react';
import { IProductNotifier } from '@/types/notifier';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { useAuth } from '@/store/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { useSDKProxy } from '@/services/sdkProxy';

interface NotificationTabContentProps {
  data?: any;
}

export default function NotificationTabContent({ data }: NotificationTabContentProps) {
  // Show error if notifier data is incomplete and can't be fetched
  if (!data?.name && !data?.tag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete notifier data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the notifier from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  const notifier: IProductNotifier = data;
  const productTag = data?.productTag;
  const productName = data?.productName;
  const productLogo = data?.productLogo;
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { user, currentWorkspaceId } = useAuth();

  const sdkProxy = useSDKProxy(
    productTag && user?._id
      ? {
          workspace_id: currentWorkspaceId || '',
          user_id: user._id || '',
          token: user.auth_token || '',
          public_key: user.public_key || '',
        }
      : null
  );

  const { data: notificationData, isLoading } = useQuery({
    queryKey: ['notification', productTag, notifier?.tag],
    queryFn: async () => {
      if (!sdkProxy || !productTag || !notifier?.tag) return null;
      try {
        return await sdkProxy.notifications.fetch(productTag, notifier.tag);
      } catch {
        return null;
      }
    },
    enabled: !!sdkProxy && !!productTag && !!notifier?.tag,
  });

  const displayNotifier = notificationData || notifier;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowCredential = (key: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Extract product info for header
  const product = productName && productTag ? {
    name: productName,
    tag: productTag,
    logo: productLogo,
  } : null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading notification details...</p>
        </div>
      </div>
    );
  }

  if (!displayNotifier) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Notifier not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Notification for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This notification service is connected to your product and configured for its environments
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                <CheckCircle className="h-4 w-4 text-green" />
                <span>Auto-connect enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-6 w-6 text-red" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayNotifier.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayNotifier.tag}</span></span>
              </div>
              {displayNotifier.description && (
                <p className="text-sm text-grey-600">{displayNotifier.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Environment Configurations */}
        {displayNotifier.envs && displayNotifier.envs.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-grey">Environment Configurations</h2>
            {displayNotifier.envs.map((env: any, index: number) => {
              const notificationConfig = env;
              const envKey = `${env.slug}-${index}`;
              return (
                <div key={env._id ?? envKey} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold text-grey">{env.slug}</h3>
                    <Badge variant="outline" className="text-grey">Environment</Badge>
                  </div>
                  <div className="space-y-4">
                    {/* Push Notifications (Firebase) */}
                    {notificationConfig.push_notifications && (
                <div className="border border-grey-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="font-medium text-grey">Push Notifications (Firebase)</span>
                    <Badge variant="outline" className="ml-auto text-grey">Active</Badge>
                  </div>
                  <div className="space-y-3">
                    {notificationConfig.push_notifications.databaseUrl && (
                      <div>
                        <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Database URL</Label>
                        <Input
                          value={notificationConfig.push_notifications.databaseUrl || ''}
                          disabled
                          className="bg-white text-grey font-mono"
                        />
                      </div>
                    )}
                    {typeof notificationConfig.push_notifications === 'object' && notificationConfig.push_notifications.credentials && (
                      (() => {
                        const c = notificationConfig.push_notifications.credentials as Record<string, string>;
                        return (
                          <>
                            {c.type && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Credentials Type</Label>
                                <Input value={c.type} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                            {c.project_id != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Project ID</Label>
                                <Input value={c.project_id || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                            {c.private_key_id != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Private Key ID</Label>
                                <Input value={c.private_key_id || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                            {c.private_key != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Private Key</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type={showCredentials[`${envKey}-firebase-key`] ? 'text' : 'password'}
                                    value={showCredentials[`${envKey}-firebase-key`] ? (c.private_key || '') : (c.private_key ? '••••••••••••••••' : '')}
                                    disabled
                                    className="bg-white text-grey font-mono pr-10"
                                  />
                                  <button onClick={() => toggleShowCredential(`${envKey}-firebase-key`)} className="text-grey-600 hover:text-grey">
                                    {showCredentials[`${envKey}-firebase-key`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(c.private_key || '', `${envKey}-firebase-key`)}>
                                    {copiedKey === `${envKey}-firebase-key` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {c.client_email != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Client Email</Label>
                                <Input value={c.client_email || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                            {c.client_id != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Client ID</Label>
                                <Input value={c.client_id || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                            {c.auth_uri != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Auth URI</Label>
                                <Input value={c.auth_uri || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                            {c.token_uri != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Token URI</Label>
                                <Input value={c.token_uri || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                            {c.auth_provider_x509_cert_url != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Auth Provider x509 Cert URL</Label>
                                <Input value={c.auth_provider_x509_cert_url || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                            {c.client_x509_cert_url != null && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Client x509 Cert URL</Label>
                                <Input value={c.client_x509_cert_url || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* Email: only show when there is actual email config (smtp or a provider), not when emails is empty */}
              {notificationConfig.emails && typeof notificationConfig.emails === 'object' && (
                (() => {
                  const emails = notificationConfig.emails as Record<string, any>;
                  const smtp = emails.smtp;
                  const sendgrid = emails.sendgrid;
                  const mailgun = emails.mailgun;
                  const postmark = emails.postmark;
                  const brevo = emails.brevo;
                  const hasEmailConfig = !!(smtp || sendgrid || mailgun || postmark || brevo);
                  if (!hasEmailConfig) return null;

                  const provider = emails.provider
                    || (sendgrid ? 'sendgrid' : mailgun ? 'mailgun' : postmark ? 'postmark' : brevo ? 'brevo' : 'smtp');
                  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
                  const smtpConfig = smtp || (provider === 'smtp' ? emails : null);
                  const auth = smtpConfig?.auth || emails.auth;

                  return (
                    <div className="border border-grey-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="font-medium text-grey">Email ({providerLabel})</span>
                        <Badge variant="outline" className="ml-auto text-grey">Active</Badge>
                      </div>
                      <div className="space-y-3">
                        {/* SMTP */}
                        {smtpConfig && (
                          <>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Host</Label>
                              <Input value={smtpConfig.host || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Port</Label>
                              <Input value={smtpConfig.port || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Email</Label>
                              <Input value={smtpConfig.sender_email || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                            <div className="flex items-center justify-between border border-grey-300 rounded-lg p-3 bg-grey-50">
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide block">TLS / Secure</Label>
                                <p className="text-xs text-grey-600 mt-1">Enable secure connection</p>
                              </div>
                              <span className={`text-xs ${smtpConfig.secure ? 'text-green' : 'text-grey-400'}`}>
                                {smtpConfig.secure ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            {smtpConfig.tls != null && (
                              <div className="flex items-center justify-between border border-grey-300 rounded-lg p-3 bg-grey-50">
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide block">TLS Reject Unauthorized</Label>
                                <span className={`text-xs ${smtpConfig.tls?.rejectUnauthorized === false ? 'text-grey-400' : 'text-green'}`}>
                                  {smtpConfig.tls?.rejectUnauthorized === false ? 'Disabled' : 'Enabled'}
                                </span>
                              </div>
                            )}
                            {auth && (
                              <div className="border-t border-grey-300 pt-3">
                                <h3 className="text-sm font-semibold text-grey mb-3">Authentication</h3>
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">User</Label>
                                    <Input value={auth.user || ''} disabled className="bg-white text-grey font-mono" />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Password</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type={showCredentials[`${envKey}-email-pass`] ? 'text' : 'password'}
                                        value={auth.pass ? '••••••••••••••••' : ''}
                                        disabled
                                        className="bg-white text-grey font-mono pr-10"
                                      />
                                      <button onClick={() => toggleShowCredential(`${envKey}-email-pass`)} className="text-grey-600 hover:text-grey">
                                        {showCredentials[`${envKey}-email-pass`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* SendGrid */}
                        {sendgrid && (
                          <>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">API Key</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showCredentials[`${envKey}-email-sendgrid-apikey`] ? 'text' : 'password'}
                                  value={sendgrid.apiKey ? (showCredentials[`${envKey}-email-sendgrid-apikey`] ? sendgrid.apiKey : '••••••••••••••••') : ''}
                                  disabled
                                  className="bg-white text-grey font-mono pr-10"
                                />
                                <button onClick={() => toggleShowCredential(`${envKey}-email-sendgrid-apikey`)} className="text-grey-600 hover:text-grey">
                                  {showCredentials[`${envKey}-email-sendgrid-apikey`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(sendgrid.apiKey || '', `${envKey}-email-sendgrid-apikey`)}>
                                  {copiedKey === `${envKey}-email-sendgrid-apikey` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Email</Label>
                              <Input value={sendgrid.sender_email || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                          </>
                        )}

                        {/* Mailgun */}
                        {mailgun && (
                          <>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">API Key</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showCredentials[`${envKey}-email-mailgun-apikey`] ? 'text' : 'password'}
                                  value={mailgun.apiKey ? (showCredentials[`${envKey}-email-mailgun-apikey`] ? mailgun.apiKey : '••••••••••••••••') : ''}
                                  disabled
                                  className="bg-white text-grey font-mono pr-10"
                                />
                                <button onClick={() => toggleShowCredential(`${envKey}-email-mailgun-apikey`)} className="text-grey-600 hover:text-grey">
                                  {showCredentials[`${envKey}-email-mailgun-apikey`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(mailgun.apiKey || '', `${envKey}-email-mailgun-apikey`)}>
                                  {copiedKey === `${envKey}-email-mailgun-apikey` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Domain</Label>
                              <Input value={mailgun.domain || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Email</Label>
                              <Input value={mailgun.sender_email || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Region</Label>
                              <Input value={mailgun.region || ''} disabled className="bg-white text-grey font-mono" placeholder="us / eu" />
                            </div>
                            {mailgun.baseUrl != null && mailgun.baseUrl !== '' && (
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Base URL</Label>
                                <Input value={mailgun.baseUrl || ''} disabled className="bg-white text-grey font-mono" />
                              </div>
                            )}
                          </>
                        )}

                        {/* Postmark */}
                        {postmark && (
                          <>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Server Token</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showCredentials[`${envKey}-email-postmark-token`] ? 'text' : 'password'}
                                  value={postmark.serverToken ? (showCredentials[`${envKey}-email-postmark-token`] ? postmark.serverToken : '••••••••••••••••') : ''}
                                  disabled
                                  className="bg-white text-grey font-mono pr-10"
                                />
                                <button onClick={() => toggleShowCredential(`${envKey}-email-postmark-token`)} className="text-grey-600 hover:text-grey">
                                  {showCredentials[`${envKey}-email-postmark-token`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(postmark.serverToken || '', `${envKey}-email-postmark-token`)}>
                                  {copiedKey === `${envKey}-email-postmark-token` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Email</Label>
                              <Input value={postmark.sender_email || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Message Stream</Label>
                              <Input value={postmark.messageStream || ''} disabled className="bg-white text-grey font-mono" placeholder="Optional" />
                            </div>
                          </>
                        )}

                        {/* Brevo */}
                        {brevo && (
                          <>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">API Key</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showCredentials[`${envKey}-email-brevo-apikey`] ? 'text' : 'password'}
                                  value={brevo.apiKey ? (showCredentials[`${envKey}-email-brevo-apikey`] ? brevo.apiKey : '••••••••••••••••') : ''}
                                  disabled
                                  className="bg-white text-grey font-mono pr-10"
                                />
                                <button onClick={() => toggleShowCredential(`${envKey}-email-brevo-apikey`)} className="text-grey-600 hover:text-grey">
                                  {showCredentials[`${envKey}-email-brevo-apikey`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(brevo.apiKey || '', `${envKey}-email-brevo-apikey`)}>
                                  {copiedKey === `${envKey}-email-brevo-apikey` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Email</Label>
                              <Input value={brevo.sender_email || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Name</Label>
                              <Input value={brevo.sender_name || ''} disabled className="bg-white text-grey font-mono" placeholder="Optional" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* SMS */}
              {notificationConfig.sms && (
                <div className="border border-grey-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="font-medium text-grey">SMS</span>
                    <Badge variant="outline" className="ml-auto text-grey">Active</Badge>
                  </div>
                  <div className="space-y-3">
                    {typeof notificationConfig.sms === 'object' && (() => {
                      const sms = notificationConfig.sms as Record<string, any>;
                      return (
                        <>
                          {sms.provider != null && (
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Provider</Label>
                              <Input
                                value={String(sms.provider).charAt(0).toUpperCase() + String(sms.provider).slice(1)}
                                disabled
                                className="bg-white text-grey font-mono"
                              />
                            </div>
                          )}
                          {sms.accountSid != null && (
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Account SID / Auth ID</Label>
                              <Input value={sms.accountSid || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                          )}
                          {sms.authToken != null && (
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Auth Token</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showCredentials[`${envKey}-sms-token`] ? 'text' : 'password'}
                                  value={sms.authToken ? (showCredentials[`${envKey}-sms-token`] ? sms.authToken : '••••••••••••••••') : ''}
                                  disabled
                                  className="bg-white text-grey font-mono pr-10"
                                />
                                <button onClick={() => toggleShowCredential(`${envKey}-sms-token`)} className="text-grey-600 hover:text-grey">
                                  {showCredentials[`${envKey}-sms-token`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(sms.authToken || '', `${envKey}-sms-token`)}>
                                  {copiedKey === `${envKey}-sms-token` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          )}
                          {sms.apiKey != null && (
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">API Key</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showCredentials[`${envKey}-sms-apikey`] ? 'text' : 'password'}
                                  value={sms.apiKey ? (showCredentials[`${envKey}-sms-apikey`] ? sms.apiKey : '••••••••••••••••') : ''}
                                  disabled
                                  className="bg-white text-grey font-mono pr-10"
                                />
                                <button onClick={() => toggleShowCredential(`${envKey}-sms-apikey`)} className="text-grey-600 hover:text-grey">
                                  {showCredentials[`${envKey}-sms-apikey`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(sms.apiKey || '', `${envKey}-sms-apikey`)}>
                                  {copiedKey === `${envKey}-sms-apikey` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          )}
                          {sms.apiSecret != null && (
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">API Secret</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showCredentials[`${envKey}-sms-apisecret`] ? 'text' : 'password'}
                                  value={sms.apiSecret ? (showCredentials[`${envKey}-sms-apisecret`] ? sms.apiSecret : '••••••••••••••••') : ''}
                                  disabled
                                  className="bg-white text-grey font-mono pr-10"
                                />
                                <button onClick={() => toggleShowCredential(`${envKey}-sms-apisecret`)} className="text-grey-600 hover:text-grey">
                                  {showCredentials[`${envKey}-sms-apisecret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(sms.apiSecret || '', `${envKey}-sms-apisecret`)}>
                                  {copiedKey === `${envKey}-sms-apisecret` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          )}
                          {sms.sender != null && (
                            <div>
                              <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Phone Number</Label>
                              <Input value={sms.sender || ''} disabled className="bg-white text-grey font-mono" />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Callbacks */}
              {notificationConfig.callbacks && typeof notificationConfig.callbacks === 'object' && (
                (() => {
                  const cb = notificationConfig.callbacks as Record<string, any>;
                  const headers = cb.headers && typeof cb.headers === 'object' ? cb.headers : {};
                  const query = cb.query && typeof cb.query === 'object' ? cb.query : {};
                  const params = cb.params && typeof cb.params === 'object' ? cb.params : {};
                  const hasHeaders = Object.keys(headers).length > 0;
                  const hasQuery = Object.keys(query).length > 0;
                  const hasParams = Object.keys(params).length > 0;
                  const bodyVal = cb.body != null
                    ? (typeof cb.body === 'string' ? cb.body : JSON.stringify(cb.body, null, 2))
                    : '';
                  return (
                    <div className="border border-grey-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <Webhook className="h-4 w-4 text-orange-500" />
                        </div>
                        <span className="font-medium text-grey">Callbacks (Webhook)</span>
                        <Badge variant="outline" className="ml-auto text-grey">Active</Badge>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">URL</Label>
                          <Input value={cb.url || ''} disabled className="bg-white text-grey font-mono" placeholder="—" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Method</Label>
                          <Input value={cb.method ? String(cb.method).toUpperCase() : ''} disabled className="bg-white text-grey font-mono" placeholder="—" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Headers</Label>
                          <div className="bg-grey-50 border border-grey-300 rounded-lg p-3 space-y-2 min-h-[44px]">
                            {hasHeaders ? Object.entries(headers).map(([key, value], idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-grey w-32">{key}:</span>
                                <span className="text-grey-600 font-mono flex-1">{String(value)}</span>
                              </div>
                            )) : <span className="text-grey-500 text-sm">—</span>}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Query Parameters</Label>
                          <div className="bg-grey-50 border border-grey-300 rounded-lg p-3 space-y-2 min-h-[44px]">
                            {hasQuery ? Object.entries(query).map(([key, value], idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-grey w-32">{key}:</span>
                                <span className="text-grey-600 font-mono flex-1">{String(value)}</span>
                              </div>
                            )) : <span className="text-grey-500 text-sm">—</span>}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Path Parameters</Label>
                          <div className="bg-grey-50 border border-grey-300 rounded-lg p-3 space-y-2 min-h-[44px]">
                            {hasParams ? Object.entries(params).map(([key, value], idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-grey w-32">{key}:</span>
                                <span className="text-grey-600 font-mono flex-1">{String(value)}</span>
                              </div>
                            )) : <span className="text-grey-500 text-sm">—</span>}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Body</Label>
                          <Textarea value={bodyVal} disabled className="bg-white text-grey font-mono text-sm" rows={4} placeholder="—" />
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600">No environment configurations</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Notifications</h3>
          <p className="text-xs text-blue-800">
            Notification services allow you to send messages via push notifications, email, SMS, and webhooks. Configure credentials for each environment to enable multi-channel messaging.
          </p>
        </div>
      </div>
    </div>
  );
}
