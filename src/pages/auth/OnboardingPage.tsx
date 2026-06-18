import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle,
  CreditCard,
  Loader,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import workspaceServices from '@/services/workspaceServices';
import pricingServices from '@/services/pricingServices';
import BillingsInfo from '@/components/billing-form';
import OnboardingPlanCard, { OnboardingPlanSummary } from '@/components/auth/OnboardingPlanCard';
import OnboardingKeysStep from '@/components/auth/OnboardingKeysStep';
import { BillingPlan } from '@/types/pricing';
import RequireAuth from '@/components/auth/RequireAuth';
import {
  markOnboardingCompleted,
  filterOnboardingPlans,
  isTestPlan,
  getInitialOnboardingStep,
  markOnboardingWorkspaceLocked,
  isOnboardingWorkspaceLocked,
  isOnboardingFromInvites,
  clearOnboardingFromInvites,
  hasCompletedOnboarding,
  type OnboardingStep,
} from '@/utils/onboarding';
import { useRequiresOnboarding } from '@/hooks/useRequiresOnboarding';

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'plan', label: 'Plan' },
  { id: 'billing', label: 'Payment' },
  { id: 'complete', label: 'Keys' },
];

function OnboardingFlow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setCurrentWorkspaceId } = useAuth();
  const {
    workspaceId: existingWorkspaceId,
    hasSubscription,
    workspacesFetched,
    needsPendingInvitesScreen,
  } = useRequiresOnboarding();

  const [step, setStep] = useState<OnboardingStep>(getInitialOnboardingStep);
  const [workspaceId, setWorkspaceId] = useState(
    () => sessionStorage.getItem('onboardingWorkspaceId') || existingWorkspaceId || '',
  );
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [workspaceForm, setWorkspaceForm] = useState({ workspace_name: '', description: '' });

  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['onboarding-plans', user?._id],
    queryFn: () =>
      pricingServices.fetchBillingData({
        user_id: user!._id,
        public_key: user!.public_key,
      }),
    enabled: Boolean(user?._id && user?.public_key),
  });

  const { data: workspaceResponse, isLoading: workspaceLoading } = useQuery({
    queryKey: ['onboarding-workspace', workspaceId, user?._id],
    queryFn: () =>
      workspaceServices.fetchWorkspaceById({
        workspace_id: workspaceId,
        user_id: user!._id,
        public_key: user!.public_key,
      }),
    enabled: Boolean(workspaceId && user?._id && user?.public_key),
  });

  const isAdminWorkspace = workspaceResponse?.data?.admin === true;

  const plans = useMemo(
    () => filterOnboardingPlans(plansResponse?.data ?? [], isAdminWorkspace),
    [plansResponse?.data, isAdminWorkspace],
  );

  const resolvedPlan = useMemo(() => {
    if (selectedPlan) return selectedPlan;
    const planId = sessionStorage.getItem('onboardingPlanId');
    if (!planId) return null;
    return plans.find((plan) => plan._id === planId) ?? null;
  }, [selectedPlan, plans]);

  useEffect(() => {
    if (selectedPlan || !resolvedPlan) return;
    setSelectedPlan(resolvedPlan);
  }, [resolvedPlan, selectedPlan]);

  useEffect(() => {
    if (!selectedPlan || workspaceLoading) return;
    if (isTestPlan(selectedPlan) && !isAdminWorkspace) {
      setSelectedPlan(null);
      sessionStorage.removeItem('onboardingPlanId');
    }
  }, [selectedPlan, isAdminWorkspace, workspaceLoading]);

  useEffect(() => {
    sessionStorage.setItem('onboardingStep', step);
  }, [step]);

  useEffect(() => {
    if (workspaceId) {
      sessionStorage.setItem('onboardingWorkspaceId', workspaceId);
      setCurrentWorkspaceId(workspaceId);
    }
  }, [workspaceId, setCurrentWorkspaceId]);

  useEffect(() => {
    if (!workspacesFetched) return;
    if (needsPendingInvitesScreen && !isOnboardingFromInvites()) {
      navigate('/pending-invites', { replace: true });
    }
  }, [workspacesFetched, needsPendingInvitesScreen, navigate]);

  useEffect(() => {
    if (!workspacesFetched || !hasSubscription || hasCompletedOnboarding()) return;
    if (step !== 'complete') {
      setStep('complete');
    }
  }, [workspacesFetched, hasSubscription, step]);

  const isFreePlan = resolvedPlan ? resolvedPlan.monthlyPrice === 0 : false;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const workspaceLocked =
    Boolean(workspaceId || existingWorkspaceId) || isOnboardingWorkspaceLocked();
  const awaitingWorkspaceCheck =
    !workspacesFetched && !workspaceId && !isOnboardingWorkspaceLocked();

  const goToStep = (next: OnboardingStep) => {
    if (workspaceLocked && next === 'workspace') return;
    setStep(next);
  };

  useEffect(() => {
    if (!workspacesFetched) return;

    const resolvedWorkspace = workspaceId || existingWorkspaceId;
    if (!resolvedWorkspace) return;

    markOnboardingWorkspaceLocked();

    if (!workspaceId) {
      setWorkspaceId(resolvedWorkspace);
    }

    if (step === 'workspace') {
      const saved = sessionStorage.getItem('onboardingStep') as OnboardingStep | null;
      setStep(saved && saved !== 'workspace' ? saved : 'plan');
    }
  }, [workspacesFetched, existingWorkspaceId, workspaceId, step]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference || !user?._id || !user.public_key) return;

    const planId = sessionStorage.getItem('onboardingPlanId') || sessionStorage.getItem('pendingPlanId');
    const wsId = sessionStorage.getItem('onboardingWorkspaceId');
    if (!planId || !wsId || sessionStorage.getItem('onboardingPayment') !== 'true') return;

    const processedKey = `onboardingPaymentProcessed:${reference}`;
    if (
      sessionStorage.getItem(processedKey) === 'true' ||
      sessionStorage.getItem(processedKey) === 'processing'
    ) {
      return;
    }
    sessionStorage.setItem(processedKey, 'processing');

    const completeOnboarding = () => {
      sessionStorage.setItem(processedKey, 'true');
      sessionStorage.removeItem('onboardingPayment');
      sessionStorage.removeItem('pendingPlanId');
      sessionStorage.removeItem('onboardingPlanId');
      window.history.replaceState({}, document.title, '/onboarding');
      clearOnboardingFromInvites();
      setStep('complete');
      toast.success('Payment successful! Your subscription is active.');
    };

    const finalize = async () => {
      try {
        await pricingServices.createSubscription({
          user_id: user._id,
          public_key: user.public_key,
          payload: { plan_id: planId, workspace_id: wsId },
        });
        completeOnboarding();
      } catch (error) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } };
          message?: string;
        };
        const msg =
          err?.response?.data?.error ??
          err?.response?.data?.message ??
          err?.message ??
          '';

        if (
          /already has an active subscription|already active|already exists/i.test(msg)
        ) {
          completeOnboarding();
          return;
        }

        sessionStorage.removeItem(processedKey);
        console.error('Onboarding subscription activation failed:', error);
        toast.error(msg || 'Failed to activate subscription after payment.');
      }
    };

    finalize();
  }, [user]);

  const { mutate: createWorkspace, status: creatingWorkspace } = useMutation({
    mutationFn: (data: {
      user_id: string;
      name: string;
      public_key: string;
      description: string;
    }) => workspaceServices.createWorkspace(data),
    onSuccess: (response) => {
      const created = response?.data;
      if (!created?._id && !created?.workspace_id) {
        toast.error('Failed to create workspace');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-workspace'] });
      markOnboardingWorkspaceLocked();
      const newWorkspaceId = created.workspace_id || created._id;
      setWorkspaceId(newWorkspaceId);
      setCurrentWorkspaceId(newWorkspaceId);
      toast.success('Workspace created!');
      setStep('plan');
    },
    onError: () => toast.error('Error creating workspace, try again'),
  });

  return (
    <div data-testid="onboarding-page" className="w-full space-y-8 lg:space-y-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Setup workbench
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-grey tracking-tight">
            Set up your workbench
          </h1>
          <p className="text-grey-600 text-base max-w-2xl">
            Workspace, plan, billing — then you&apos;re in.
          </p>
        </div>

        <div className="w-full lg:max-w-xl xl:max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            {STEPS.map((s, index) => {
              const isActive = index === stepIndex;
              const isComplete = index < stepIndex;
              return (
                <div key={s.id} className="flex flex-1 flex-col items-center gap-2 min-w-0">
                  <div className="flex w-full items-center">
                    {index > 0 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1 rounded-full',
                          index <= stepIndex ? 'bg-primary' : 'bg-grey-300',
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
                        isComplete && 'border-primary bg-primary text-white',
                        isActive && 'border-primary bg-white text-primary ring-4 ring-primary/10',
                        !isActive && !isComplete && 'border-grey-300 bg-white text-grey-500',
                      )}
                    >
                      {isComplete ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1 rounded-full',
                          index < stepIndex ? 'bg-primary' : 'bg-grey-300',
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      isActive ? 'text-primary' : isComplete ? 'text-grey' : 'text-grey-500',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {step === 'workspace' && (
        awaitingWorkspaceCheck ? (
          <section className="rounded-10px border border-grey-400 bg-white shadow-sm p-16 flex justify-center">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </section>
        ) : !workspaceLocked ? (
        <section className="rounded-10px border border-grey-400 bg-white shadow-sm p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-12 xl:gap-16 items-start">
            <div className="space-y-3 lg:pt-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue/10">
                <Building2 className="h-6 w-6 text-blue" />
              </div>
              <h2 className="text-2xl font-bold text-grey">Create your workspace</h2>
              <p className="text-grey-600 leading-relaxed">
                Where your products, apps, and integrations live.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!user?._id || !user.public_key) return;
                createWorkspace({
                  user_id: user._id,
                  name: workspaceForm.workspace_name,
                  public_key: user.public_key,
                  description:
                    workspaceForm.description ||
                    `Workspace for ${workspaceForm.workspace_name}`,
                });
              }}
              className="space-y-5"
            >
              <div>
                <Label htmlFor="workspace_name">Workspace name</Label>
                <Input
                  id="workspace_name"
                  className="mt-2 h-11"
                  placeholder="e.g., Acme Engineering"
                  value={workspaceForm.workspace_name}
                  onChange={(e) =>
                    setWorkspaceForm({ ...workspaceForm, workspace_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  className="mt-2 min-h-[120px]"
                  rows={4}
                  value={workspaceForm.description}
                  onChange={(e) =>
                    setWorkspaceForm({ ...workspaceForm, description: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="h-11 px-8 font-bold"
                  disabled={creatingWorkspace === 'pending' || !workspaceForm.workspace_name.trim()}
                >
                  {creatingWorkspace === 'pending' ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </section>
        ) : null
      )}

      {step === 'plan' && (
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-grey">Choose a subscription</h2>
              <p className="text-grey-600 mt-1">Select the plan that fits your team</p>
            </div>
            <div className="flex gap-3 sm:flex-shrink-0">
              {!workspaceLocked ? (
                <Button variant="outline" onClick={() => goToStep('workspace')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              ) : null}
              <Button
                disabled={!selectedPlan}
                onClick={() => {
                  if (selectedPlan) {
                    sessionStorage.setItem('onboardingPlanId', selectedPlan._id);
                  }
                  goToStep('billing');
                }}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {plansLoading || (workspaceId && workspaceLoading) ? (
            <div className="flex justify-center py-16 rounded-10px border border-grey-400 bg-white">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
              {plans.map((plan) => (
                <OnboardingPlanCard
                  key={plan._id}
                  plan={plan}
                  selected={selectedPlan?._id === plan._id}
                  onSelect={() => {
                    setSelectedPlan(plan);
                    sessionStorage.setItem('onboardingPlanId', plan._id);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {step === 'billing' && (
        <section className="rounded-10px border border-grey-400 bg-white shadow-sm">
          {plansLoading && !resolvedPlan ? (
            <div className="flex justify-center py-16">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !resolvedPlan ? (
            <div className="p-8 sm:p-10 text-center space-y-4">
              <p className="text-grey-600">Select a plan before continuing to payment.</p>
              <Button onClick={() => goToStep('plan')}>Back to plans</Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
              <div className="border-b lg:border-b-0 lg:border-r border-grey-300 bg-grey-50/80 p-6 sm:p-8 lg:p-10 space-y-4 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold text-grey">Add payment method</h2>
                  <p className="text-grey-600 mt-2 leading-relaxed">
                    {isFreePlan
                      ? 'Add your billing details and card to activate your free plan.'
                      : 'Complete payment to activate your workspace.'}
                  </p>
                </div>
                <OnboardingPlanSummary plan={resolvedPlan} />
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => goToStep('plan')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to plans
                </Button>
              </div>

              <div className="p-6 sm:p-8 lg:p-10">
                <BillingsInfo
                  selectedPlan={resolvedPlan}
                  paymentCallbackUrl={`${window.location.origin}/onboarding`}
                  onboardingMode
                  onboardingWorkspaceId={workspaceId}
                  onOnboardingSubscriptionComplete={() => {
                    clearOnboardingFromInvites();
                    queryClient.invalidateQueries({ queryKey: ['onboarding-billing-report'] });
                    setStep('complete');
                  }}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {step === 'complete' && workspaceId && (
        <OnboardingKeysStep
          workspaceId={workspaceId}
          onContinue={() => {
            markOnboardingCompleted();
            navigate('/');
          }}
        />
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <OnboardingFlow />
    </RequireAuth>
  );
}
