/* eslint-disable @typescript-eslint/no-explicit-any */
import {z} from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {useState, useEffect, useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {CreditCard, Loader} from 'lucide-react';
import {
  fetchBillingInfo,
  fetchUsdNgnExchangeRate,
  initializeTransaction,
  saveBillingInfo,
  validateAndSaveCard,
} from '@/services/billingServices';
import toast from 'react-hot-toast';
import {useAuth} from '@/store/useAuth';
import {BillingPlan} from '@/types/pricing';
import pricingServices from '@/services/pricingServices';

interface BillingsInfoProps {
  selectedPlan: BillingPlan;
  subscriptionId?: string;
  paymentCallbackUrl?: string;
  onboardingMode?: boolean;
  onboardingWorkspaceId?: string;
  onOnboardingSubscriptionComplete?: () => void;
}

export interface addBillingPayload {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalZipCode: string;
  country: string;
}

export interface PaymentDetails {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
}

// Replace 'countries-list' with a static list to fix the import error
const countryList = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
];

const formSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  address: z.string().min(2).max(100),
  // Apartment/suite/unit — most addresses don't have one; the backend already
  // treats it as optional (billing.validator.create.ts allows '' / null), the
  // frontend just never matched that.
  addressLine: z.string().max(100).optional(),
  city: z.string().min(2).max(50),
  state: z.string().min(2).max(50),
  postal: z.string().min(2).max(50),
  country: z.string({
    required_error: 'Please select a country/region.',
  }),
});

const CARD_TYPES = ['Visa', 'Mastercard', 'Verve', 'AmericanExpress'] as const;

/** Payment autofill (cc-*) only works over HTTPS; HTTP dev shows a browser warning. */
function getCardAutocomplete() {
  const https =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  return {
    number: https ? 'cc-number' : 'off',
    exp: https ? 'cc-exp' : 'off',
    csc: https ? 'cc-csc' : 'off',
  } as const;
}

const paymentSchema = z.object({
  cardNumber: z.string().refine(
    (val) => /^\d{13,19}$/.test(val.replace(/\s/g, '')),
    { message: 'Enter a valid card number (13–19 digits)' },
  ),
  expirationDate: z
    .string()
    .regex(
      /^(0[1-9]|1[0-2])\/\d{2}$/,
      'Expiration date must be in MM/YY format',
    ),
  cvv: z
    .string()
    .min(3, 'CVV must be 3 digits')
    .max(4, 'CVV must be 3 or 4 digits')
    .regex(/^\d+$/, 'CVV must contain only numbers'),
  cardType: z.enum(CARD_TYPES, {required_error: 'Select card type'}),
  // This card is stored (tokenized with Paystack, kept on file) for future
  // charges as soon as this form submits — get explicit consent for that
  // before it happens, not just imply it via the submit button's label.
  saveConsent: z.literal(true, {
    errorMap: () => ({message: 'Please confirm before saving your card'}),
  }),
});

const emptyBilling = {
  firstName: '',
  lastName: '',
  address: '',
  addressLine: '',
  city: '',
  state: '',
  postal: '',
  country: '',
};

export default function BillingsInfo({
  selectedPlan,
  subscriptionId,
  paymentCallbackUrl,
  onboardingMode = false,
  onboardingWorkspaceId,
  onOnboardingSubscriptionComplete,
}: BillingsInfoProps) {
  const [countryNames, setCountryNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [billingDetails, setBillingDetails] =
    useState<addBillingPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const {user} = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyBilling,
  });

  // Load saved billing address when the form is shown
  useEffect(() => {
    setCountryNames(countryList.sort());
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingBilling(true);
    fetchBillingInfo({
      userId: user?._id || '',
      publicKey: user?.public_key || '',
    })
      .then(info => {
        if (cancelled) return;
        const hasAny = !!(
          info.firstName ||
          info.lastName ||
          info.addressLine1 ||
          info.city ||
          info.country
        );
        setHasSavedAddress(hasAny);
        form.reset({
          firstName: info.firstName ?? '',
          lastName: info.lastName ?? '',
          address: info.addressLine1 ?? '',
          addressLine: info.addressLine2 ?? '',
          city: info.city ?? '',
          state: info.stateProvince ?? '',
          postal: info.postalZipCode ?? '',
          country: info.country ?? '',
        });
        if (hasAny) {
          setBillingDetails({
            firstName: info.firstName ?? '',
            lastName: info.lastName ?? '',
            addressLine1: info.addressLine1 ?? '',
            addressLine2: info.addressLine2 ?? '',
            city: info.city ?? '',
            stateProvince: info.stateProvince ?? '',
            postalZipCode: info.postalZipCode ?? '',
            country: info.country ?? '',
          });
          setIsFormSubmitted(true);
        }
      })
      .catch(() => {
        if (!cancelled) form.reset(emptyBilling);
      })
      .finally(() => {
        if (!cancelled) setLoadingBilling(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '',
      expirationDate: '',
      cvv: '',
      cardType: undefined,
      saveConsent: undefined as unknown as true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload: addBillingPayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      addressLine1: values.address,
      addressLine2: values.addressLine ?? '',
      city: values.city,
      stateProvince: values.state,
      postalZipCode: values.postal,
      country: values.country,
    };

    try {
      setLoadingBilling(true);

      // Pass payload and params as separate arguments
      await saveBillingInfo(payload, {
        userId: user?._id || '',
        publicKey: user?.public_key || '',
        token: user?.auth_token || '',
      });

      setBillingDetails(payload);
      setIsFormSubmitted(true);
      setHasSavedAddress(true);
      toast.success(
        'Billing address saved. You won’t need to re-enter it next time.',
      );
    } catch (e) {
      console.error('Save billing info failed:', e);
      toast.error('Failed to save billing address. Please try again.');
    } finally {
      setLoadingBilling(false);
    }
  }

  const isFreePlan = (selectedPlan?.monthlyPrice ?? 0) === 0;

  const { data: usdNgnRate } = useQuery({
    queryKey: ['usd-ngn-exchange-rate'],
    queryFn: fetchUsdNgnExchangeRate,
    enabled: !isFreePlan && (selectedPlan?.monthlyPrice ?? 0) > 0,
    staleTime: 15 * 60 * 1000,
  });

  const ngnChargeEstimate = useMemo(() => {
    if (!usdNgnRate?.rate || !selectedPlan?.monthlyPrice) return null;
    return Math.ceil(selectedPlan.monthlyPrice * usdNgnRate.rate);
  }, [usdNgnRate?.rate, selectedPlan?.monthlyPrice]);

  const cardAutocomplete = useMemo(() => getCardAutocomplete(), []);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts: string[] = [];
    for (let i = 0; i < digits.length && i < 16; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const formatExpirationDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  async function onPaymentSubmit(values: z.infer<typeof paymentSchema>) {
    const email = user?.email;
    const authToken = user?.auth_token || localStorage.getItem('token')?.replace(/"/g, '') || '';

    if (!email) {
      toast.error('Please log in so we can save your card securely.');
      return;
    }

    if (!user?._id || !user.public_key || !authToken) {
      toast.error('Missing authentication data');
      return;
    }

    setIsProcessing(true);
    try {
      const [mm, yy] = values.expirationDate.split('/');
      await validateAndSaveCard(
        {
          email,
          card: {
            number: values.cardNumber.replace(/\s/g, ''),
            cvv: values.cvv,
            expiry_month: parseInt(mm!, 10),
            expiry_year: parseInt(yy!, 10),
            type: values.cardType,
          },
        },
        {
          userId: user._id,
          publicKey: user.public_key,
          authToken,
        },
      );

      if (onboardingMode) {
        if (!onboardingWorkspaceId || !user?._id || !user.public_key) {
          toast.error('Missing workspace or authentication details.');
          return;
        }

        if (isFreePlan) {
          await pricingServices.createSubscription({
            user_id: user._id,
            public_key: user.public_key,
            payload: {
              plan_id: selectedPlan._id,
              workspace_id: onboardingWorkspaceId,
            },
          });
          toast.success(`Subscribed to ${selectedPlan.name}`);
          onOnboardingSubscriptionComplete?.();
          return;
        }

        await handlePayment();
        return;
      }

      toast.success(
        'Card validated and saved. You can use it for future plan upgrades.',
      );
      paymentForm.reset({
        cardNumber: '',
        expirationDate: '',
        cvv: '',
        cardType: undefined,
        saveConsent: undefined as unknown as true,
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        'Card validation failed. Check details and try again.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }

  const handlePayment = async () => {
    const userId = user?._id || '';
    const publicKey = user?.public_key || '';
    const authToken = user?.auth_token || '';

    if (!userId || !publicKey || !authToken) {
      toast.error('Missing authentication data');
      return;
    }

    setIsProcessing(true);
    if (selectedPlan?._id) {
      sessionStorage.setItem('pendingPlanId', selectedPlan._id);
      if (onboardingMode) {
        sessionStorage.setItem('onboardingPlanId', selectedPlan._id);
        sessionStorage.setItem('onboardingPayment', 'true');
      }
    }

    try {
      const paymentData = {
        email: user?.email || '',
        amount: Math.max((selectedPlan?.monthlyPrice ?? 0) * 100, 100),
        callback_url: paymentCallbackUrl ?? `${window.location.origin}`,
        currency: 'USD' as const,
      };

      const response = await initializeTransaction(paymentData, {
        userId,
        publicKey,
        authToken,
      });

      if (response.status) {
        // Store plan change data BEFORE redirect
        sessionStorage.setItem(
          'validation',
          response?.status ? 'true' : 'false',
        );
        sessionStorage.setItem(
          'pendingPlanChange',
          JSON.stringify({
            subscription_id: subscriptionId || '', // Make sure you have this
            newPlanId: selectedPlan?._id || '',
            reason: 'Upgrading to accommodate team growth',
          }),
        );

        window.location.href = response.data.authorization_url;
      } else {
        console.error('Payment initialization failed:', response.message);
        toast.error(response.message || 'Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment initialization failed:', error);
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        (typeof error === 'string' ? error : undefined) ??
        err?.message ??
        'Failed to initialize payment. Please try again.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = () => {
    // Populate form with existing values when editing
    if (billingDetails) {
      form.reset({
        firstName: billingDetails.firstName,
        lastName: billingDetails.lastName,
        address: billingDetails.addressLine1,
        addressLine: billingDetails.addressLine2,
        city: billingDetails.city,
        state: billingDetails.stateProvince,
        postal: billingDetails.postalZipCode,
        country: billingDetails.country,
      });
    }
    setIsFormSubmitted(false);
  };

  if (loadingBilling && !billingDetails) {
    return (
      <div className="flex items-center justify-center py-8 text-grey-600">
        <Loader className="h-5 w-5 animate-spin mr-2" />
        Loading your billing information…
      </div>
    );
  }

  return (
    <div>
      {!isFormSubmitted ? (
        <section className="flex flex-col justify-center rounded-[5px] w-full">
          <div className="mb-2">
            <p className="font-semibold text-grey text-base">
              Billing Information
            </p>
            <p className="text-xs text-grey mt-0.5">
              {hasSavedAddress
                ? 'Your saved billing address is shown below. Edit if needed, then continue to payment.'
                : 'Enter your billing details once; we’ll save them for future plan changes and upgrades.'}
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 w-full pb-3"
            >
              <div className="flex items-center justify-start mt-3 w-full gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({field}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-grey font-semibold">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border border-grey-500 rounded w-full h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({field}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-grey font-semibold">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border border-grey-500 rounded w-full h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({field}) => (
                  <FormItem>
                    <FormLabel className="text-grey font-semibold">
                      Address (Street, P.O. box)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border border-grey-500 rounded max-w-full w-full h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine"
                render={({field}) => (
                  <FormItem>
                    <FormLabel className="text-grey font-semibold">
                      Address line 2 (Apartment, suite, unit) — optional
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border border-grey-500 rounded w-full h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({field}) => (
                  <FormItem>
                    <FormLabel className="text-grey font-semibold">
                      City
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border border-grey-500 rounded w-full h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Country/Region</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border border-grey-500 rounded w-full h-9 text-grey font-semibold text-sm">
                          <SelectValue placeholder="Country/Region*" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loading ? (
                          <SelectItem value="loading" disabled>
                            Loading...
                          </SelectItem>
                        ) : (
                          countryNames.map(country => (
                            <SelectItem
                              key={country}
                              value={country}
                              className="text-grey"
                            >
                              {country}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-start mt-3 w-full gap-4 pb-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({field}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-grey font-semibold">
                        State/Province
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border border-grey-500 rounded w-full h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postal"
                  render={({field}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-grey font-semibold">
                        Postal/Zip code
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border border-grey-500 rounded w-full h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-9"
                disabled={loadingBilling}
              >
                {loadingBilling ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  'Save and continue'
                )}
              </Button>
            </form>
          </Form>
        </section>
      ) : (
        <section className="text-grey">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-grey">
              Billing Information
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="text-grey bg-[#F9F9F9] dark:bg-white-700 dark:border-grey-400 hover:opacity-65 hover:text-grey border border-grey-500 font-semibold text-xs"
            >
              Edit
            </Button>
          </div>
          <div className="py-2">
            <p className="text-sm font-semibold uppercase">
              {billingDetails?.firstName} {billingDetails?.lastName}
            </p>
            <div className="text-sm font-medium py-2 pb-4 border-b border-grey-400">
              <p>
                {billingDetails?.addressLine1} / {billingDetails?.addressLine2}
              </p>
              <p>
                {billingDetails?.city}, {billingDetails?.stateProvince}{' '}
                {billingDetails?.postalZipCode}
              </p>
              <p>{billingDetails?.country}</p>
            </div>
          </div>

          {isFormSubmitted && (
            <div className="mt-6 pt-6 border-t border-grey-400">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-base font-semibold text-grey">Payment details</h3>
                  <p className="text-xs text-grey-600 mt-0.5">
                    {onboardingMode
                      ? isFreePlan
                        ? 'Add a card to activate your free plan. You will not be charged monthly.'
                        : 'Add your card details to continue to secure checkout.'
                      : 'Save a card for future plan changes and upgrades.'}
                  </p>
                  {!isFreePlan && ngnChargeEstimate ? (
                    <p className="text-xs text-grey-600 mt-1">
                      You will be charged approximately{' '}
                      <span className="font-semibold text-grey">
                        ₦{ngnChargeEstimate.toLocaleString()}
                      </span>{' '}
                      (live USD→NGN rate).
                    </p>
                  ) : null}
                </div>
              </div>

              <Form {...paymentForm}>
                <form
                  onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
                  className="space-y-4"
                  autoComplete={cardAutocomplete.number === 'off' ? 'off' : 'on'}
                >
                  <FormField
                    control={paymentForm.control}
                    name="cardType"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel className="text-grey font-semibold">Card type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border border-grey-500 rounded w-full h-9 text-grey font-semibold text-sm">
                              <SelectValue placeholder="Select card type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CARD_TYPES.map((type) => (
                              <SelectItem key={type} value={type} className="text-grey">
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={paymentForm.control}
                    name="cardNumber"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel className="text-grey font-semibold">Card number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="numeric"
                            autoComplete={cardAutocomplete.number}
                            placeholder="1234 5678 9012 3456"
                            className="border border-grey-500 rounded w-full h-9"
                            onChange={(e) =>
                              field.onChange(formatCardNumber(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-start gap-4">
                    <FormField
                      control={paymentForm.control}
                      name="expirationDate"
                      render={({field}) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-grey font-semibold">
                            Expiration (MM/YY)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="numeric"
                              autoComplete={cardAutocomplete.exp}
                              placeholder="MM/YY"
                              className="border border-grey-500 rounded w-full h-9"
                              onChange={(e) =>
                                field.onChange(formatExpirationDate(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={paymentForm.control}
                      name="cvv"
                      render={({field}) => (
                        <FormItem className="w-28">
                          <FormLabel className="text-grey font-semibold">CVV</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="numeric"
                              autoComplete={cardAutocomplete.csc}
                              placeholder="123"
                              className="border border-grey-500 rounded w-full h-9"
                              maxLength={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={paymentForm.control}
                    name="saveConsent"
                    render={({field}) => (
                      <FormItem>
                        <div className="flex items-start gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value === true}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal text-grey-600 leading-snug">
                            I agree to have this card securely saved with Paystack for future
                            plan changes and billing.
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-9"
                    disabled={isProcessing || paymentForm.watch('saveConsent') !== true}
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : onboardingMode ? (
                      isFreePlan ? (
                        'Add card and activate'
                      ) : (
                        'Add card and continue'
                      )
                    ) : (
                      'Save card'
                    )}
                  </Button>
                </form>
              </Form>

              {!onboardingMode ? (
                <Button
                  type="button"
                  onClick={handlePayment}
                  className="w-full h-9 mt-4"
                  disabled={isProcessing}
                  variant="outline"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Make Payment'
                  )}
                </Button>
              ) : null}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
