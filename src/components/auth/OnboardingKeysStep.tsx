import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Check, Copy, Eye, EyeOff, Key, Loader, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import tokensServices from '@/services/tokensServices';

type OnboardingKeysStepProps = {
  workspaceId: string;
  onContinue: () => void;
};

function KeyField({
  label,
  description,
  value,
  visible,
  onToggleVisibility,
  onCopy,
  copied,
  loading,
  masked = true,
  revealLabel,
}: {
  label: string;
  description: string;
  value: string | null;
  visible: boolean;
  onToggleVisibility?: () => void;
  onCopy: () => void;
  copied: boolean;
  loading?: boolean;
  masked?: boolean;
  revealLabel?: string;
}) {
  const displayValue =
    loading ? 'Loading…' : visible && value ? value : masked ? '•'.repeat(40) : value || 'Unavailable';

  return (
    <div className="rounded-lg border border-grey-300 bg-grey-50/60 p-5 text-left">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-grey-600">{label}</p>
          <p className="mt-1 text-sm text-grey-600">{description}</p>
        </div>
        {onToggleVisibility ? (
          <Button type="button" size="sm" variant="outline" onClick={onToggleVisibility} className="shrink-0 gap-2">
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {visible ? 'Hide' : revealLabel || 'Reveal'}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-grey-300 bg-white p-4">
        <code className="flex-1 break-all font-mono text-sm text-grey select-all">{displayValue}</code>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCopy}
          disabled={!value || !visible || loading}
          className="h-8 w-8 shrink-0 p-0"
          title={`Copy ${label.toLowerCase()}`}
        >
          {copied ? <Check className="h-4 w-4 text-green" /> : <Copy className="h-4 w-4 text-grey-600" />}
        </Button>
      </div>
    </div>
  );
}

export default function OnboardingKeysStep({ workspaceId, onContinue }: OnboardingKeysStepProps) {
  const { user } = useAuth();

  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [publishableKeyLoading, setPublishableKeyLoading] = useState(true);
  const [copiedPublishableKey, setCopiedPublishableKey] = useState(false);

  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [accessKeyVisible, setAccessKeyVisible] = useState(false);
  const [copiedAccessKey, setCopiedAccessKey] = useState(false);

  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const fetchPublishableKey = useCallback(async () => {
    if (!workspaceId || !user?._id || !user.public_key) return;

    setPublishableKeyLoading(true);
    try {
      const res = await tokensServices.getPublishableKey({
        workspace_id: workspaceId,
        user_id: user._id,
        public_key: user.public_key,
      });
      if (res.status && res.data?.publishable_key) {
        setPublishableKey(res.data.publishable_key);
      } else {
        setPublishableKey(null);
      }
    } catch (error) {
      console.error('Failed to fetch publishable key:', error);
      setPublishableKey(null);
      toast.error('Failed to load publishable key.');
    } finally {
      setPublishableKeyLoading(false);
    }
  }, [workspaceId, user?._id, user?.public_key]);

  useEffect(() => {
    fetchPublishableKey();
  }, [fetchPublishableKey]);

  useEffect(() => {
    if (secondsLeft === 0 || !showOtpDialog) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, showOtpDialog]);

  const handleCopyPublishableKey = () => {
    if (!publishableKey) return;
    navigator.clipboard.writeText(publishableKey).then(
      () => {
        setCopiedPublishableKey(true);
        toast.success('Publishable key copied!');
        setTimeout(() => setCopiedPublishableKey(false), 2000);
      },
      () => toast.error('Failed to copy publishable key.'),
    );
  };

  const handleCopyAccessKey = () => {
    if (!accessKey || !accessKeyVisible) return;
    navigator.clipboard.writeText(accessKey).then(
      () => {
        setCopiedAccessKey(true);
        toast.success('Access key copied!');
        setTimeout(() => setCopiedAccessKey(false), 2000);
      },
      () => toast.error('Failed to copy access key.'),
    );
  };

  const handleRequestOtp = async () => {
    if (otpSent) {
      setShowOtpDialog(true);
      return;
    }

    try {
      await tokensServices.getTwoFA({
        user_id: user?._id ?? '',
        public_key: user?.public_key ?? '',
      });
      toast.success('Verification code sent to your email');
      setOtpSent(true);
      setShowOtpDialog(true);
      setSecondsLeft(60);
    } catch (error) {
      toast.error('Failed to send verification code.');
      console.error('Error sending OTP:', error);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = otpValues.join('');
    if (otp.length !== 6) {
      toast.error('Please enter the full verification code');
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await tokensServices.postTwoFA({
        user_id: user?._id ?? '',
        public_key: user?.public_key ?? '',
        workspace_id: workspaceId,
        token: otp,
      });

      if (response.status && response.data?.access_key) {
        setAccessKey(response.data.access_key);
        setAccessKeyVisible(true);
        setOtpVerified(true);
        setShowOtpDialog(false);
        setOtpValues(['', '', '', '', '', '']);
        toast.success('Access key revealed');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Verification failed');
      console.error('Error verifying OTP:', error);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const next = [...otpValues];
    next[index] = value.replace(/\D/, '');
    setOtpValues(next);

    if (value && index < 5) {
      document.getElementById(`onboarding-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      document.getElementById(`onboarding-otp-${index - 1}`)?.focus();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleToggleAccessKeyVisibility = () => {
    if (accessKeyVisible) {
      setAccessKeyVisible(false);
      return;
    }

    if (!otpVerified) {
      void handleRequestOtp();
      return;
    }

    setAccessKeyVisible(true);
  };

  return (
    <>
      <section className="mx-auto max-w-3xl rounded-10px border border-grey-400 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green/10">
            <Key className="h-8 w-8 text-green" />
          </div>
          <h2 className="text-3xl font-bold text-grey">Your workspace keys</h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-grey-600">
            Save these keys now. You&apos;ll use the access key for server-side SDK calls and the
            publishable key for browser apps.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <KeyField
            label="Publishable key"
            description="Safe for frontend apps and browser SDK initialization."
            value={publishableKey}
            visible={Boolean(publishableKey)}
            onCopy={handleCopyPublishableKey}
            copied={copiedPublishableKey}
            loading={publishableKeyLoading}
            masked={false}
          />

          <KeyField
            label="Access key"
            description="Server-side SDK key. Email verification is required before reveal."
            value={accessKey}
            visible={accessKeyVisible}
            onToggleVisibility={handleToggleAccessKeyVisibility}
            onCopy={handleCopyAccessKey}
            copied={copiedAccessKey}
            revealLabel="Reveal key"
          />

          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-left">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-grey-600">
              You can always find these keys later under{' '}
              <span className="font-medium text-grey">Secrets &amp; credentials</span> in your
              workspace settings.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button className="h-12 px-10 font-bold" onClick={onContinue}>
            Go to Workbench
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-grey">Verify your email</DialogTitle>
            <DialogDescription className="pt-2 text-sm text-grey-600">
              Enter the six-digit code we sent to your email to reveal your access key.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex justify-between gap-2">
              {otpValues.map((value, index) => (
                <Input
                  key={index}
                  id={`onboarding-otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="h-12 w-12 text-center text-lg font-semibold"
                />
              ))}
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={otpValues.some((v) => !v) || verifyingOtp}
              className="w-full"
            >
              {verifyingOtp ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify code'
              )}
            </Button>

            <p className="text-center text-sm text-grey-600">
              Resend available in{' '}
              <span className={cn('font-semibold', secondsLeft > 0 ? 'text-primary' : 'text-grey')}>
                {secondsLeft > 0 ? formatTime(secondsLeft) : 'now'}
              </span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
