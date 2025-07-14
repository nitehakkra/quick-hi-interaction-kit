import React, { useState, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { io, Socket } from 'socket.io-client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const Index = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('Core Tech');
  const [showBanner, setShowBanner] = useState(true);
  const [email, setEmail] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Set up visitor tracking when component mounts
  useEffect(() => {
    const connectSocket = () => {
      try {
        // Connect to WebSocket with proper environment handling
        const socketUrl = process.env.NODE_ENV === 'production' 
          ? window.location.origin
          : undefined; // Use Vite proxy in dev
        
        const newSocket = io(socketUrl, {
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          transports: ['websocket', 'polling']
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
          console.log('Connected to WebSocket server for visitor tracking');
          
          // Send visitor joined event with IP address
          const visitorData = {
            ipAddress: 'Fetching IP...',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          };
          
          // Fetch real IP address
          fetch('https://api.ipify.org?format=json')
            .then(response => response.json())
            .then(data => {
              const updatedVisitorData = {
                ...visitorData,
                ipAddress: data.ip
              };
              newSocket.emit('visitor-joined', updatedVisitorData);
            })
            .catch(() => {
              // Fallback if IP service fails
              const fallbackData = {
                ...visitorData,
                ipAddress: 'Unknown IP'
              };
              newSocket.emit('visitor-joined', fallbackData);
            });
        });

        newSocket.on('disconnect', () => {
          console.log('Disconnected from WebSocket server');
        });

        return newSocket;
      } catch (error) {
        console.error('Error connecting to WebSocket for visitor tracking:', error);
        return null;
      }
    };

    const socketInstance = connectSocket();

    // Handle page visibility change and unload
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && socketInstance) {
        // User is leaving/minimizing - emit visitor left
        fetch('https://api.ipify.org?format=json')
          .then(response => response.json())
          .then(data => {
            socketInstance.emit('visitor-left', { ipAddress: data.ip });
          })
          .catch(() => {
            socketInstance.emit('visitor-left', { ipAddress: 'Unknown IP' });
          });
      }
    };

    const handleBeforeUnload = () => {
      if (socketInstance) {
        fetch('https://api.ipify.org?format=json')
          .then(response => response.json())
          .then(data => {
            socketInstance.emit('visitor-left', { ipAddress: data.ip });
            socketInstance.disconnect();
          })
          .catch(() => {
            socketInstance.emit('visitor-left', { ipAddress: 'Unknown IP' });
            socketInstance.disconnect();
          });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (socketInstance) {
        fetch('https://api.ipify.org?format=json')
          .then(response => response.json())
          .then(data => {
            socketInstance.emit('visitor-left', { ipAddress: data.ip });
            socketInstance.disconnect();
          })
          .catch(() => {
            socketInstance.emit('visitor-left', { ipAddress: 'Unknown IP' });
            socketInstance.disconnect();
          });
      }
    };
  }, []);

  const handleBuyNow = (planName: string) => {
    try {
      if (!planName) {
        console.error('Plan name is required');
        return;
      }
      
      // Show loading state
      setIsNavigating(true);
      
      // Navigate after loading timeout
      setTimeout(() => {
        const billing = isYearly ? 'yearly' : 'monthly';
        navigate(`/checkout?plan=${encodeURIComponent(planName)}&billing=${billing}`);
        setIsNavigating(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error navigating to checkout:', error);
      setIsNavigating(false);
      alert('Unable to proceed to checkout. Please try again.');
    }
  };

  const pricingData = {
    yearly: {
      core: {
        price: '880.25',
        total: '10,563'
      },
      complete: {
        price: '1635.25',
        total: '19,623'
      },
      addon: {
        price: '1027.25',
        total: '12,327'
      }
    },
    monthly: {
      core: {
        price: '1100',
        total: '1,100'
      },
      complete: {
        price: '2195',
        total: '2,195'
      },
      addon: {
        price: '1299',
        total: '1,299'
      }
    }
  };
  const currentPricing = isYearly ? pricingData.yearly : pricingData.monthly;

  // Update Complete plan pricing to match exact year total of 28,750
  if (isYearly) {
    currentPricing.complete.price = '2395.83';
  }
  const comparisonData = {
    'Core Tech library': {
      'Software development': true,
      'IT Operations': true,
      'Product & UX': true,
      'Business skills': true
    },
    'Expanded libraries': {
      'AI': selectedPlan !== 'Core Tech',
      'Cloud': selectedPlan !== 'Core Tech',
      'Data': selectedPlan !== 'Core Tech',
      'Security': selectedPlan !== 'Core Tech'
    },
    'Hands-on playground': {
      'Instant terminal': true,
      'Cloud servers': true,
      'Cloud sandboxes': selectedPlan !== 'Core Tech',
      'AI sandboxes': selectedPlan !== 'Core Tech'
    },
    'Features': {
      'Skill assessments': true,
      'Certification courses': true,
      'Learning paths & channels': true,
      'Hands-on labs': true
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-x-hidden">
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4">
              <svg 
                className="animate-spin w-full h-full" 
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="70 30"
                />
              </svg>
            </div>
            <p className="text-white text-lg font-medium">Loading checkout...</p>
          </div>
        </div>
      )}

      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 25px 25px, white 2px, transparent 0)`,
        backgroundSize: '50px 50px'
      }}></div>
      </div>

      {/* Promo Banner */}
      {showBanner && <div className="relative bg-slate-800 border-b border-slate-700 px-4 py-3 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-yellow-400 font-semibold">⚡ Save 50%</span>
            <span>on a year of our new Complete plan. Use code</span>
            <span className="bg-slate-900 px-2 py-1 rounded font-mono text-xs">FLASH50</span>
            <span>at checkout.</span>
          </div>
          <button onClick={() => setShowBanner(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>}

      {/* Hero Section */}
      <section className="relative text-center mx-[8px] my-0 px-[19px] py-0">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in">
            Achieve your career goals faster
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto animate-fade-in">
            Start with the basics, the whole package, or a deeper dive into a preferred tech topic.
          </p>

          {/* Pricing Toggle */}
          <div className="flex items-center justify-center mb-12 animate-fade-in">
            <div className="bg-slate-800 rounded-full p-1 flex items-center">
              <button onClick={() => setIsYearly(true)} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${isYearly ? 'bg-white text-slate-900 shadow-lg' : 'text-gray-300 hover:text-white'}`}>
                Yearly <span className="text-blue-400 ml-1">Save 30%</span>
              </button>
              <button onClick={() => setIsYearly(false)} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-white text-slate-900 shadow-lg' : 'text-gray-300 hover:text-white'}`}>
                Monthly
              </button>
            </div>
          </div>

          {/* Primary Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-8">
            {/* Core Tech Plan */}
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl animate-scale-in overflow-hidden mx-0 px-0 py-px my-[33px]">
              <div className="flex">
                <div className="flex-1 p-8">
                  <h3 className="text-2xl font-bold mb-3">Core Tech</h3>
                  <p className="text-gray-600 mb-8 text-sm leading-relaxed">
                    Start your learning journey with a strong foundation in the basics and access to over 3,900 courses.
                  </p>
                  
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl">₹</span>
                      <span className="text-4xl font-bold">{currentPricing.core.price}</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>📅</span>
                      <span>Billed yearly</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleBuyNow('Core Tech')} 
                    disabled={isNavigating}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold mb-4 disabled:opacity-50"
                  >
                    Buy now
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <a href="https://www.pluralsight.com/individuals/pricing/free-trial" className="text-gray-600 hover:text-gray-800 underline">
                      Try 10 days free*
                    </a>
                    <a href="https://www.pluralsight.com/individuals/pricing/core-tech" className="text-gray-600 hover:text-gray-800 underline">
                      Plan details
                    </a>
                  </div>
                </div>

                <div className="w-80 bg-gray-50 p-8 border-l border-gray-200 py-[44px] px-[34px]">
                  <h4 className="font-semibold mb-6 text-gray-700">What's included</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                        <Check size={12} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium mb-2">Course topics:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Software development</li>
                          <li>• IT Operations</li>
                          <li>• Product & UX</li>
                          <li>• Business skills</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                        <Check size={12} className="text-purple-600 mx-[4px]" />
                      </div>
                      <p className="text-sm">
                        Skill assessments, learning paths, certification prep, hands-on labs
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Plan */}
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl relative animate-scale-in overflow-hidden">
              <div className="absolute -top-4 right-4 bg-blue-600 text-white rounded-full text-sm font-medium z-10 px-[16px] mx-0 my-[18px] py-[5px]">
                Best value
              </div>
              
              <div className="flex">
                <div className="flex-1 p-8 pt-10">
                  <h3 className="text-2xl font-bold mb-3">Complete</h3>
                  <p className="text-gray-600 mb-8 text-sm leading-relaxed">
                    Build expertise across all tech domains with unlimited access to over 6,500 courses.
                  </p>
                  
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl">₹</span>
                      <span className="text-4xl font-bold">{currentPricing.complete.price}</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>📅</span>
                      <span>Billed yearly</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleBuyNow('Complete')} 
                    disabled={isNavigating}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold mb-4 disabled:opacity-50"
                  >
                    Buy now
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <a href="https://www.pluralsight.com/individuals/pricing/free-trial" className="text-gray-600 hover:text-gray-800 underline">
                      Try 10 days free*
                    </a>
                    <a href="https://www.pluralsight.com/individuals/pricing/complete" className="text-gray-600 hover:text-gray-800 underline">
                      Plan details
                    </a>
                  </div>
                </div>

                <div className="w-80 bg-gray-50 p-8 border-l border-gray-200 px-[36px] py-[54px] my-px mx-px">
                  <h4 className="font-semibold mb-6 text-gray-700">What's included</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                        <Check size={12} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium mb-2">Course topics:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Software development</li>
                          <li>• IT Operations</li>
                          <li>• Product & UX</li>
                          <li>• Business skills</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                        <Check size={12} className="text-purple-600 mx-[4px]" />
                      </div>
                      <p className="text-sm">
                        Skill assessments, learning paths, certification prep, hands-on labs, and sandboxes
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                        <Check size={12} className="text-purple-600 mx-[4px]" />
                      </div>
                      <div>
                        <p className="font-medium mb-2">Expanded course libraries:</p>
                        <p className="text-sm text-gray-600">AI, data, cloud, and security</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Plans Grid */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* AI+ Plan */}
            <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-xl animate-scale-in mx-px my-0 py-[39px] px-[24px]">
              <h3 className="text-2xl font-bold mb-4">AI+</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Prepare for the future with hands-on AI learning from the experts.
              </p>
              <p className="text-pink-500 font-semibold text-sm mb-6">
                Includes Core Tech
              </p>
              
              <div className="mb-8">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl">₹</span>
                  <span className="text-4xl font-bold">{currentPricing.addon.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📅</span>
                  <span>Billed yearly</span>
                </div>
              </div>

              <Button 
                onClick={() => handleBuyNow('AI+')} 
                disabled={isNavigating}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold mb-4 disabled:opacity-50"
              >
                Buy now
              </Button>

              <div className="flex items-center justify-between text-sm">
                <a href="https://www.pluralsight.com/individuals/pricing/free-trial" className="text-gray-600 hover:text-gray-800 underline">
                  Try 10 days free*
                </a>
                <a href="https://www.pluralsight.com/individuals/pricing/ai" className="text-gray-600 hover:text-gray-800 underline">
                  Plan details
                </a>
              </div>
            </div>

            {/* Cloud+ Plan */}
            <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-xl animate-scale-in py-[36px] px-[23px]">
              <h3 className="text-2xl font-bold mb-4">Cloud+</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Advance your cloud career with access to all <strong>A Cloud Guru</strong> courses.
              </p>
              <p className="text-pink-500 font-semibold text-sm mb-6">
                Includes Core Tech
              </p>
              
              <div className="mb-8">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl">₹</span>
                  <span className="text-4xl font-bold">{currentPricing.addon.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📅</span>
                  <span>Billed yearly</span>
                </div>
              </div>

              <Button 
                onClick={() => handleBuyNow('Cloud+')} 
                disabled={isNavigating}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold mb-4 disabled:opacity-50"
              >
                Buy now
              </Button>

              <div className="flex items-center justify-between text-sm">
                <a href="https://www.pluralsight.com/individuals/pricing/free-trial" className="text-gray-600 hover:text-gray-800 underline">
                  Try 10 days free*
                </a>
                <a href="https://www.pluralsight.com/individuals/pricing/cloud" className="text-gray-600 hover:text-gray-800 underline">
                  Plan details
                </a>
              </div>
            </div>

            {/* Data+ Plan */}
            <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-xl animate-scale-in py-[33px] px-[24px]">
              <h3 className="text-2xl font-bold mb-4">Data+</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Become a specialist with access to over 1,400 data science courses.
              </p>
              <p className="text-pink-500 font-semibold text-sm mb-6">
                Includes Core Tech
              </p>
              
              <div className="mb-8">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl">₹</span>
                  <span className="text-4xl font-bold">{currentPricing.addon.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📅</span>
                  <span>Billed yearly</span>
                </div>
              </div>

              <Button 
                onClick={() => handleBuyNow('Data+')} 
                disabled={isNavigating}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold mb-4 disabled:opacity-50"
              >
                Buy now
              </Button>

              <div className="flex items-center justify-between text-sm">
                <a href="https://www.pluralsight.com/individuals/pricing/free-trial" className="text-gray-600 hover:text-gray-800 underline">
                  Try 10 days free*
                </a>
                <a href="https://www.pluralsight.com/individuals/pricing/data" className="text-gray-600 hover:text-gray-800 underline">
                  Plan details
                </a>
              </div>
            </div>

            {/* Security+ Plan */}
            <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-xl animate-scale-in py-[31px] px-[24px]">
              <h3 className="text-2xl font-bold mb-4">Security+</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Learn the skills to keep up with tomorrow's cybersecurity threats.
              </p>
              <p className="text-pink-500 font-semibold text-sm mb-6">
                Includes Core Tech
              </p>
              
              <div className="mb-8">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl">₹</span>
                  <span className="text-4xl font-bold">{currentPricing.addon.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📅</span>
                  <span>Billed yearly</span>
                </div>
              </div>

              <Button 
                onClick={() => handleBuyNow('Security+')} 
                disabled={isNavigating}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold mb-4 disabled:opacity-50"
              >
                Buy now
              </Button>

              <div className="flex items-center justify-between text-sm">
                <a href="https://www.pluralsight.com/individuals/pricing/free-trial" className="text-gray-600 hover:text-gray-800 underline">
                  Try 10 days free*
                </a>
                <a href="https://www.pluralsight.com/individuals/pricing/security" className="text-gray-600 hover:text-gray-800 underline">
                  Plan details
                </a>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-400 text-sm mb-8">
            *Free trial excludes lab and sandbox features.
          </p>

          <div className="text-center">
            <a href="https://www.pluralsight.com/individuals/pricing" className="inline-block bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-full">
              Compare plans and features ↑
            </a>
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="px-4 py-16 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <p className="text-gray-400 mb-4">Choose a plan</p>
            <div className="relative max-w-xs">
              <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)} className="w-full bg-white text-slate-900 px-4 py-3 rounded-lg appearance-none font-medium pr-10">
                <option>Core Tech</option>
                <option>Complete</option>
                <option>AI+</option>
                <option>Cloud+</option>
                <option>Data+</option>
                <option>Security+</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {Object.entries(comparisonData).map(([category, features]) => <div key={category} className="animate-fade-in">
                <h3 className="text-lg font-semibold mb-6 pb-2 border-b border-slate-600">
                  {category}
                </h3>
                <div className="space-y-4">
                  {Object.entries(features).map(([feature, included]) => <div key={feature} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${included ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {included ? <Check size={12} /> : <X size={12} />}
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>)}
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://help.pluralsight.com/" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="https://help.pluralsight.com/" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="https://help.pluralsight.com/help/ip-allowlist" className="hover:text-white transition-colors">IP Allowlist</a></li>
                <li><a href="https://www.pluralsight.com/sitemap" className="hover:text-white transition-colors">Sitemap</a></li>
                <li><a href="https://www.pluralsight.com/mobile" className="hover:text-white transition-colors">Download Pluralsight</a></li>
                <li><a href="https://www.pluralsight.com/individuals/pricing" className="hover:text-white transition-colors">View Plans</a></li>
                <li><a href="https://www.pluralsight.com/product/flow" className="hover:text-white transition-colors">Flow Plans</a></li>
                <li><a href="https://www.pluralsight.com/professional-services" className="hover:text-white transition-colors">Professional Services</a></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://www.pluralsight.com/guides" className="hover:text-white transition-colors">Guides</a></li>
                <li><a href="https://www.pluralsight.com/teach" className="hover:text-white transition-colors">Teach</a></li>
                <li><a href="https://www.pluralsight.com/partners" className="hover:text-white transition-colors">Partner with Pluralsight</a></li>
                <li><a href="https://www.pluralsight.com/one" className="hover:text-white transition-colors">Pluralsight One</a></li>
                <li><a href="https://www.pluralsight.com/authors" className="hover:text-white transition-colors">Authors</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://www.pluralsight.com/about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="https://www.pluralsight.com/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="https://www.pluralsight.com/newsroom" className="hover:text-white transition-colors">Newsroom</a></li>
                <li><a href="https://www.pluralsight.com/resources" className="hover:text-white transition-colors">Resources</a></li>
              </ul>
            </div>

            {/* Industries */}
            <div>
              <h4 className="font-semibold mb-4">Industries</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://www.pluralsight.com/industries/education" className="hover:text-white transition-colors">Education</a></li>
                <li><a href="https://www.pluralsight.com/industries/financial-services" className="hover:text-white transition-colors">Financial Services (FSBI)</a></li>
                <li><a href="https://www.pluralsight.com/industries/healthcare" className="hover:text-white transition-colors">Healthcare</a></li>
                <li><a href="https://www.pluralsight.com/industries/insurance" className="hover:text-white transition-colors">Insurance</a></li>
                <li><a href="https://www.pluralsight.com/industries/non-profit" className="hover:text-white transition-colors">Non-Profit</a></li>
                <li><a href="https://www.pluralsight.com/industries/public-sector" className="hover:text-white transition-colors">Public Sector</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-semibold mb-4">Newsletter</h4>
              <p className="text-sm text-gray-400 mb-4">
                Sign up with your email to join our mailing list.
              </p>
              <div className="space-y-4">
                <Input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-400" />
                <div className="flex items-start gap-2">
                  <Checkbox checked={emailOptIn} onCheckedChange={checked => setEmailOptIn(checked as boolean)} className="mt-1" />
                  <label className="text-xs text-gray-400 leading-relaxed">
                    I would like to receive emails from Pluralsight
                  </label>
                </div>
                <Button className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-full">
                  Submit
                </Button>
              </div>

              {/* Social Icons */}
              <div className="flex gap-4 mt-6">
                <a href="https://twitter.com/pluralsight" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
                <a href="https://www.facebook.com/pluralsight" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>
                </a>
                <a href="https://www.instagram.com/pluralsight" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.219-.359-.219c0-1.781 1.062-3.188 2.384-3.188 1.125 0 1.669.844 1.669 1.853 0 1.128-.719 2.813-1.094 4.375-.312 1.313.656 2.384 1.953 2.384 2.344 0 4.031-3.021 4.031-6.594 0-2.724-1.812-4.781-4.969-4.781-3.72 0-6.062 2.75-6.062 5.797 0 1.047.401 1.789.934 2.384.219.25.25.469.188.719-.063.281-.203.844-.266 1.078-.078.375-.312.469-.719.281-1.297-.469-1.906-1.844-1.906-3.375 0-2.5 2.094-5.5 6.25-5.5 3.359 0 5.469 2.437 5.469 5.031 0 3.437-1.875 6.094-4.625 6.094-1.125 0-2.125-.656-2.469-1.406 0 0-.594 2.437-.719 2.937-.25.969-.875 1.844-1.281 2.469 1.062.328 2.188.516 3.375.516 6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" /></svg>
                </a>
                <a href="https://www.linkedin.com/company/pluralsight" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
                <a href="https://www.youtube.com/pluralsight" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white"></div>
              </div>
              <p className="text-sm text-gray-400">
                Copyright © 2004 - 2025 Pluralsight LLC. All rights reserved
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="https://www.pluralsight.com/terms" className="hover:text-white transition-colors">Terms of Use</a>
              <a href="https://www.pluralsight.com/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="https://www.pluralsight.com/code-of-conduct" className="hover:text-white transition-colors">Code of Conduct</a>
            </div>
          </div>
        </div>
      </footer>

      {/* User Avatar */}
      <div className="fixed bottom-4 right-4 w-12 h-12 bg-white rounded-full overflow-hidden shadow-lg animate-fade-in">
        <img alt="User avatar" className="w-full h-full object-cover" src="/lovable-uploads/a2ae8783-61ec-4548-8f02-d8c580bc4739.jpg" />
      </div>
    </div>
  );
};

export default Index;
