import { useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import pricingServices from '@/services/pricingServices';
import { useAuth } from '@/store/useAuth';
import { yearlyOffer } from '@/utils/yearlyOffer';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface YearlyBillingCardProps {
  plan: { _id?: string; name?: string; monthlyPrice?: number | null; isPayAsYouGo?: boolean; isEnterprise?: boolean; annualDiscountPercent?: number; annualBillingEnabled?: boolean } | null | undefined;
  subscription: { _id?: string; billingCycle?: string; status?: string; cancelAtPeriodEnd?: boolean; currentPeriodEnd?: string } | null | undefined;
}

/**
 * Shown under the billing summary. A workspace paying yearly sees when its year ends; one paying monthly on a paid plan is offered the
 * yearly price, with the saving, and asked to confirm before anything is charged.
 */
export default function YearlyBillingCard({ plan, subscription }: YearlyBillingCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const offer = yearlyOffer(plan, subscription);

  if (subscription?.billingCycle === 'annual') {
    return (
      <section className="mt-4 flex items-start gap-3 rounded-[5px] border border-grey-400 p-4" data-testid="yearly-billing-active">
        <CalendarCheck className="mt-0.5 h-5 w-5 text-green" />
        <div>
          <p className="text-sm font-bold text-grey">Billed yearly</p>
          <p className="text-sm text-grey-600">
            {subscription.cancelAtPeriodEnd
              ? `Your plan stays active until ${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'the end of the year'} and will not renew.`
              : `Your year ends on ${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'the date shown above'}, when it renews at the yearly price.`}
          </p>
        </div>
      </section>
    );
  }

  if (!offer || !plan?._id || !subscription?._id) return null;

  const confirm = async () => {
    if (!user?._id || !user.public_key) return;
    setBusy(true);
    try {
      await pricingServices.changeSubscription(
        { user_id: user._id, public_key: user.public_key },
        { subscription_id: subscription._id as string, newPlanId: plan._id as string, reason: 'Switched to yearly billing', billingCycle: 'annual' },
        user.auth_token,
      );
      toast.success('You are now billed yearly.');
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['billingReport'] });
    } catch (error) {
      const e = error as { response?: { data?: { errors?: string; message?: string } }; message?: string };
      toast.error(e?.response?.data?.errors ?? e?.response?.data?.message ?? e?.message ?? 'Could not switch to yearly billing');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="mt-4 flex flex-col gap-3 rounded-[5px] border border-grey-400 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="yearly-billing-offer">
        <div className="flex items-start gap-3">
          <CalendarCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold text-grey">Pay yearly and save {money(offer.saving)}</p>
            <p className="text-sm text-grey-600">{money(offer.yearlyTotal)} once a year instead of {money(offer.monthly)} a month ({offer.discountPercent}% off).</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>Switch to yearly</Button>
      </section>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to yearly billing</DialogTitle>
            <DialogDescription>
              Your card will be charged {money(offer.yearlyTotal)} now for twelve months of {plan.name}. This month's bill is settled first, and your year starts today.
              If a payment cannot be taken, nothing changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={() => void confirm()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay {money(offer.yearlyTotal)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
