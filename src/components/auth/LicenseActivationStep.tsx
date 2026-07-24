import { useEffect, useRef, useState } from 'react';
import { Loader, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { userServices } from '@/services/userServices';
import licenseServices from '@/services/licenseServices';

interface LicenseActivationStepProps {
  onActivated: () => void;
}

const CODE_PATTERN = /^DCTP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function formatLicenseCode(raw: string): string {
  // Strip everything except alphanumeric, work with uppercase
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Prefix is always DCTP (4 chars), then four groups of 4
  // Total clean chars (without prefix): 16
  const parts: string[] = [];
  parts.push(clean.slice(0, 4)); // DCTP
  parts.push(clean.slice(4, 8));
  parts.push(clean.slice(8, 12));
  parts.push(clean.slice(12, 16));
  parts.push(clean.slice(16, 20));

  return parts
    .filter((p) => p.length > 0)
    .join('-')
    .slice(0, 24); // DCTP-XXXX-XXXX-XXXX-XXXX = 24 chars
}

export default function LicenseActivationStep({ onActivated }: LicenseActivationStepProps) {
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Use ref to avoid re-running the effect when the parent recreates the callback
  const onActivatedRef = useRef(onActivated);
  onActivatedRef.current = onActivated;

  useEffect(() => {
    let cancelled = false;
    userServices
      .fetchInstanceStatus()
      .then((res) => {
        if (cancelled) return;
        const { activated, userCount } = res.data;
        if (activated || userCount > 0) {
          onActivatedRef.current();
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseCode(e.target.value);
    setCode(formatted);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!CODE_PATTERN.test(code)) {
      setError('Enter a valid code in the format DCTP-XXXX-XXXX-XXXX-XXXX.');
      return;
    }

    setSubmitting(true);
    try {
      const cloudRes = await licenseServices.activateLicense({
        activation_code: code,
        instance_url: window.location.origin,
      });

      const licenseData: Record<string, unknown> =
        cloudRes.data && typeof cloudRes.data === 'object' ? cloudRes.data : {};

      await userServices.activateInstance(licenseData);
      toast.success('License activated successfully.');
      onActivated();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors ||
        err?.message ||
        'Activation failed. Check your code and try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <section className="rounded-10px border border-grey-400 bg-white shadow-sm p-16 flex justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section className="rounded-10px border border-grey-400 bg-white shadow-sm p-6 sm:p-8 lg:p-10 mx-auto max-w-2xl">
      <div className="flex flex-col items-center text-center gap-4 mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-grey">Activate your Ductape license</h2>
          <p className="text-grey-600 mt-2 max-w-md mx-auto leading-relaxed">
            Enter the activation code you received by email after purchasing a self-hosted license.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-sm mx-auto">
        <div>
          <Label htmlFor="license_code">Activation code</Label>
          <Input
            id="license_code"
            className="mt-2 h-11 font-mono tracking-widest uppercase"
            placeholder="DCTP-XXXX-XXXX-XXXX-XXXX"
            value={code}
            onChange={handleCodeChange}
            maxLength={24}
            autoComplete="off"
            spellCheck={false}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 font-bold"
          disabled={submitting || !code}
        >
          {submitting ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Activating...
            </>
          ) : (
            'Activate license'
          )}
        </Button>
      </form>
    </section>
  );
}
