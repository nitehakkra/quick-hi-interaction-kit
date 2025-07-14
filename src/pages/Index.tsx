import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

const Index = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const connectToSocket = async () => {
      try {
        // Get user's IP address
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const userIP = ipData.ip;
        
        // Fixed WebSocket connection URL logic
        const socketUrl = process.env.NODE_ENV === 'production' 
          ? window.location.origin  // In production, use same domain
          : 'http://localhost:3001'; // In development, connect to Express server
        
        console.log('Connecting to WebSocket server at:', socketUrl);
        
        const newSocket = io(socketUrl, {
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          transports: ['websocket', 'polling']
        });
        
        setSocket(newSocket);

        newSocket.on('connect', () => {
          console.log('Connected to WebSocket server successfully');
          // Send visitor data when connected
          newSocket.emit('visitor-joined', {
            ipAddress: userIP,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
        });

        newSocket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
        });

        // Clean up on unmount
        return () => {
          console.log('Disconnecting WebSocket');
          newSocket.off('connect');
          newSocket.off('connect_error');
          newSocket.disconnect();
        };
      } catch (error) {
        console.error('Error setting up WebSocket connection:', error);
      }
    };

    connectToSocket();

    // Clean up on unmount
    return () => {
      if (socket) {
        console.log('Disconnecting WebSocket');
        socket.off('connect');
        socket.off('connect_error');
        socket.disconnect();
      }
    };
  }, []);

  const handlePlanSelect = (plan: string, billing: string) => {
    navigate(`/checkout?plan=${plan}&billing=${billing}`);
  };

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Choose Your Plan</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Core Tech</h2>
          <p className="text-gray-600 mb-4">Essential tech courses for beginners.</p>
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => handlePlanSelect('Core Tech', 'monthly')}
          >
            Select Monthly
          </button>
          <button 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
            onClick={() => handlePlanSelect('Core Tech', 'yearly')}
          >
            Select Yearly
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Complete</h2>
          <p className="text-gray-600 mb-4">Access to all courses and learning paths.</p>
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => handlePlanSelect('Complete', 'monthly')}
          >
            Select Monthly
          </button>
          <button 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
            onClick={() => handlePlanSelect('Complete', 'yearly')}
          >
            Select Yearly
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">AI+</h2>
          <p className="text-gray-600 mb-4">Advanced AI and machine learning courses.</p>
           <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => handlePlanSelect('AI+', 'monthly')}
          >
            Select Monthly
          </button>
          <button 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
            onClick={() => handlePlanSelect('AI+', 'yearly')}
          >
            Select Yearly
          </button>
        </div>
         <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Cloud+</h2>
          <p className="text-gray-600 mb-4">Cloud computing courses.</p>
           <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => handlePlanSelect('Cloud+', 'monthly')}
          >
            Select Monthly
          </button>
          <button 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
            onClick={() => handlePlanSelect('Cloud+', 'yearly')}
          >
            Select Yearly
          </button>
        </div>
         <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Data+</h2>
          <p className="text-gray-600 mb-4">Data science courses.</p>
           <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => handlePlanSelect('Data+', 'monthly')}
          >
            Select Monthly
          </button>
          <button 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
            onClick={() => handlePlanSelect('Data+', 'yearly')}
          >
            Select Yearly
          </button>
        </div>
         <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Security+</h2>
          <p className="text-gray-600 mb-4">Cyber security courses.</p>
           <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => handlePlanSelect('Security+', 'monthly')}
          >
            Select Monthly
          </button>
          <button 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
            onClick={() => handlePlanSelect('Security+', 'yearly')}
          >
            Select Yearly
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
