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
import {useState, useEffect} from 'react';
import { Calendar, CreditCard, Loader } from 'lucide-react';
import { fetchBillingInfo, saveBillingInfo, validateAndSaveCard } from '@/services/billingServices';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';


export interface addBillingPayload {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    stateProvince: string;
    postalZipCode: string,
    country: string;
}

export interface PaymentDetails {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
}

// Replace 'countries-list' with a static list to fix the import error
const countryList = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon",
  "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia",
  "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia",
  "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
  "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
  "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine",
  "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania",
  "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe"
];

const formSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  address: z.string().min(2).max(100),
  addressLine: z.string().min(2).max(100),
  city: z.string().min(2).max(50),
  state: z.string().min(2).max(50),
  postal: z.string().min(2).max(50),
  country: z.string({
    required_error: 'Please select a country/region.',
  }),
});

const CARD_TYPES = ['Visa', 'Mastercard', 'Verve', 'AmericanExpress'] as const;

const paymentSchema = z.object({
  cardNumber: z.string().min(16, "Card number must be 16 digits").max(19).regex(/^\d+$/, "Card number must contain only numbers"),
  expirationDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiration date must be in MM/YY format"),
  cvv: z.string().min(3, "CVV must be 3 digits").max(4, "CVV must be 3 or 4 digits").regex(/^\d+$/, "CVV must contain only numbers"),
  cardType: z.enum(CARD_TYPES, { required_error: 'Select card type' }),
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

export default function BillingsInfo() {
  const [countryNames, setCountryNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [billingDetails, setBillingDetails] = useState<addBillingPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);

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
    fetchBillingInfo()
      .then((info) => {
        if (cancelled) return;
        const hasAny = !!(
          (info.firstName || info.lastName || info.addressLine1 || info.city || info.country)
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
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { user } = useAuth();
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '',
      expirationDate: '',
      cvv: '',
      cardType: undefined,
    },
  });
  

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload: addBillingPayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      addressLine1: values.address,
      addressLine2: values.addressLine,
      city: values.city,
      stateProvince: values.state,
      postalZipCode: values.postal,
      country: values.country,
    };
    try {
      setLoadingBilling(true);
      await saveBillingInfo({
        ...payload,
        addressLine2: payload.addressLine2 ?? '',
      });
      setBillingDetails(payload);
      setIsFormSubmitted(true);
      setHasSavedAddress(true);
      toast.success('Billing address saved. You won’t need to re-enter it next time.');
    } catch (e) {
      console.error('Save billing info failed:', e);
      toast.error('Failed to save billing address. Please try again.');
    } finally {
      setLoadingBilling(false);
    }
  }

  async function onPaymentSubmit(values: z.infer<typeof paymentSchema>) {
    const email = (user as any)?.email;
    if (!email) {
      toast.error('Please log in so we can save your card securely.');
      return;
    }
    setIsProcessing(true);
    try {
      const [mm, yy] = values.expirationDate.split('/');
      await validateAndSaveCard({
        email,
        card: {
          number: values.cardNumber.replace(/\s/g, ''),
          cvv: values.cvv,
          expiry_month: parseInt(mm!, 10),
          expiry_year: parseInt(yy!, 10),
          type: values.cardType,
        },
      });
      toast.success('Card validated and saved. You can use it for future plan upgrades.');
      paymentForm.reset({ cardNumber: '', expirationDate: '', cvv: '', cardType: undefined });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Card validation failed. Check details and try again.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }

//   const formatCardNumber = (value: string) => {
//     const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
//     const matches = v.match(/\d{4,16}/g);
//     const match = (matches && matches[0]) || '';
//     const parts = [];
//     for (let i = 0; i < match.length; i += 4) {
//       parts.push(match.substring(i, i + 4));
//     }
//     if (parts.length) {
//       return parts.join(' ');
//     } else {
//       return value;
//     }
//   };

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
                <p className="font-semibold text-grey text-base">Billing Information</p>
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
                      Address line 2 (Apartment, suite, unit)
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
                    {billingDetails?.addressLine1} /{' '}
                    {billingDetails?.addressLine2}
                  </p>
                  <p>
                    {billingDetails?.city}, {billingDetails?.stateProvince}{' '}
                    {billingDetails?.postalZipCode}
                  </p>
                  <p>{billingDetails?.country}</p>
                </div>
              </div>

              {isFormSubmitted && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="font-semibold text-grey text-base">Payment Information</p>
          </div>
          <p className="text-xs text-grey mb-3">
            Your card is validated by Paystack before we save it. We never charge without your approval.
          </p>

          <Form {...paymentForm}>
            <form
              onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
              className="space-y-4 w-full"
            >
              <FormField
                control={paymentForm.control}
                name="cardType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-grey font-semibold">Card type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border border-grey-500 rounded h-9">
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CARD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Card Number - Full width */}
              <FormField
                control={paymentForm.control}
                name="cardNumber"
                render={({field}) => (
                  <FormItem>
                    <FormLabel className="text-grey font-semibold">
                      Card Number
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          onChange={(e) => {
                            const formatted = e.target.value;
                            field.onChange(formatted.replace(/\s/g, ''));
                            e.target.value = formatted;
                          }}
                          value={field.value}
                          placeholder="1234 5678 9012 3456"
                          className="border border-grey-500 rounded w-full h-9 pl-5"
                          maxLength={19}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expiration Date and CVV - Half width each */}
              <div className="flex items-center justify-start w-full gap-5">
                <FormField
                  control={paymentForm.control}
                  name="expirationDate"
                  render={({field}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-grey font-semibold">
                        Expiration Date
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="MM/YY"
                            className="border border-grey-500 rounded w-full h-9 pl-10"
                            maxLength={5}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '');
                              if (value.length >= 2) {
                                value = value.slice(0,2) + '/' + value.slice(2,4);
                              }
                              field.onChange(value);
                            }}
                          />
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="cvv"
                  render={({field}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-grey font-semibold">
                        CVV
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="password"
                            placeholder="cvv"
                            className="border border-grey-500 rounded w-full h-9 pl-5"
                            maxLength={4}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-9 mt-4"
                disabled={isProcessing}
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
            </form>
          </Form>
        </div>
      )}
            </section>
            )}
        
      </div>
   
  );
}