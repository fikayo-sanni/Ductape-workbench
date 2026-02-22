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

const paymentSchema = z.object({
  cardNumber: z.string().min(16, "Card number must be 16 digits").max(16, "Card number must be 16 digits").regex(/^\d+$/, "Card number must contain only numbers"),
  expirationDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiration date must be in MM/YY format"),
  cvv: z.string().min(3, "CVV must be 3 digits").max(4, "CVV must be 3 or 4 digits").regex(/^\d+$/, "CVV must contain only numbers"),
});


export default function BillingsInfo() {
  const [countryNames, setCountryNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [billingDetails, setBillingDetails] = useState<addBillingPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    setCountryNames(countryList.sort());
    setLoading(false);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      address: '',
      addressLine: '',
      city: '',
      state: '',
      postal: '',
      country: '',
    },
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '',
      expirationDate: '',
      cvv: '',
    },
  });
  

  function onSubmit(values: z.infer<typeof formSchema>) {
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
    
    setBillingDetails(payload);
    setIsFormSubmitted(true);
  }

  function onPaymentSubmit(values: z.infer<typeof paymentSchema>) {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      console.log("payment details", {
        ...values,
        billingDetails
      });
      
      // Here you would typically make an API call to process the payment
      alert("Payment processed successfully!");
      setIsProcessing(false);
      
      // You can add navigation or additional logic here
    }, 2000);
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

  return (
    
        <div>
            
            {!isFormSubmitted ? (
                <section className="flex flex-col justify-center rounded-[5px] w-full">
            <div>
                <p className="font-bold text-grey text-[20px]">Billing Information</p>
          <p className="text-sm text-grey">
            Please confirm your billing details to continue. You only need to do this once.
          </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 w-full pb-5"
            >
              <div className="flex items-center justify-start mt-5 w-full gap-5">
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
                          className="border border-grey-500 rounded w-full min-h-12"
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
                          className="border border-grey-500 rounded w-full min-h-12"
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
                        className="border border-grey-500 rounded max-w-full w-full min-h-12"
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
                        className="border border-grey-500 rounded w-full min-h-12"
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
                        className="border border-grey-500 rounded w-full min-h-12"
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
                        <SelectTrigger className="border border-grey-500 rounded w-full min-h-12 text-grey font-semibold text-sm">
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

              <div className="flex items-center justify-start mt-5 w-full gap-5 pb-10">
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
                          className="border border-grey-500 rounded w-full min-h-12"
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
                          className="border border-grey-500 rounded w-full min-h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className=" w-full min-h-12"
                
              >
               
                Save and continue
              </Button>
            </form>
          </Form>
          </section>
            ) : (
            <section className="text-grey">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-grey">
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
              <div className="py-4">
                <p className="text-[18px] font-bold uppercase">
                  {billingDetails?.firstName} {billingDetails?.lastName}
                </p>
                <div className="text-base font-medium py-2 pb-10 border-b border-grey-400">
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
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <p className="font-bold text-grey text-[20px]">Payment Information</p>
          </div>
          

          <Form {...paymentForm}>
            <form
              onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
              className="space-y-6 w-full"
            >
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
                          className="border border-grey-500 rounded w-full min-h-12 pl-5"
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
                            className="border border-grey-500 rounded w-full min-h-12 pl-10"
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
                            className="border border-grey-500 rounded w-full min-h-12 pl-5"
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
                className="w-full min-h-12 mt-6"
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