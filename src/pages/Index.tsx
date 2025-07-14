import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Star, ArrowRight, Shield, Clock, Users, Trophy, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { io, Socket } from 'socket.io-client';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Display success message if redirected from payment
    if (location.state?.message) {
      setMessage(location.state.message);
      setTimeout(() => setMessage(''), 5000);
    }

    // Connect to WebSocket server for visitor tracking
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
      console.log('Index page connected to WebSocket server');
      
      // Send visitor data
      const visitorData = {
        ipAddress: 'User-' + Math.random().toString(36).substr(2, 9), // Simulated IP
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      
      newSocket.emit('visitor-joined', visitorData);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Index WebSocket connection error:', error);
    });

    // Send periodic heartbeat to keep visitor active
    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('visitor-joined', {
          ipAddress: 'User-' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      }
    }, 30000); // Every 30 seconds

    // Cleanup on component unmount or page leave
    const handleBeforeUnload = () => {
      if (newSocket.connected) {
        newSocket.emit('visitor-left', {
          ipAddress: 'User-' + Math.random().toString(36).substr(2, 9)
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (newSocket.connected) {
        newSocket.emit('visitor-left', {
          ipAddress: 'User-' + Math.random().toString(36).substr(2, 9)
        });
        newSocket.disconnect();
      }
    };
  }, [location.state]);

  const plans = [
    {
      name: "Basic Course",
      price: 2999,
      originalPrice: 5999,
      billing: "One-time payment",
      features: [
        "10 hours of video content",
        "Basic assignments",
        "Community access",
        "Certificate of completion",
        "30-day money-back guarantee"
      ],
      popular: false
    },
    {
      name: "Pro Course",
      price: 4999,
      originalPrice: 9999,
      billing: "One-time payment",
      features: [
        "25 hours of video content",
        "Advanced assignments",
        "1-on-1 mentoring sessions",
        "Community access",
        "Certificate of completion",
        "Lifetime access",
        "Project portfolio review"
      ],
      popular: true
    },
    {
      name: "Premium Course",
      price: 7999,
      originalPrice: 15999,
      billing: "One-time payment",
      features: [
        "50+ hours of video content",
        "Advanced assignments",
        "Weekly 1-on-1 mentoring",
        "Private community access",
        "Certificate of completion",
        "Lifetime access",
        "Job placement assistance",
        "Industry connections"
      ],
      popular: false
    }
  ];

  const handleSelectPlan = (plan: any) => {
    navigate('/checkout', { state: { planData: plan } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Success Message */}
      {message && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">LearnPro</h1>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#courses" className="text-gray-600 hover:text-gray-900">Courses</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Master Web Development
            <span className="text-blue-600"> From Zero to Hero</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of students who have transformed their careers with our comprehensive web development course. 
            Learn the latest technologies and build real-world projects.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">10,000+</div>
              <div className="text-gray-600">Students</div>
            </div>
            <div className="text-center">
              <Trophy className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">95%</div>
              <div className="text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">50+</div>
              <div className="text-gray-600">Hours Content</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="courses" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Learning Path</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Select the perfect course package that fits your goals and budget. All courses include lifetime access and our satisfaction guarantee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">₹{plan.price.toLocaleString()}</span>
                    <span className="text-lg text-gray-500 line-through ml-2">₹{plan.originalPrice.toLocaleString()}</span>
                  </div>
                  <CardDescription className="text-base">{plan.billing}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 text-lg font-semibold ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Money Back Guarantee */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 bg-green-50 px-6 py-3 rounded-full">
              <Shield className="h-6 w-6 text-green-600" />
              <span className="text-green-800 font-medium">30-Day Money-Back Guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Course?</h3>
            <p className="text-lg text-gray-600">Everything you need to become a successful web developer</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                title: "Comprehensive Curriculum",
                description: "From HTML basics to advanced React and Node.js development"
              },
              {
                icon: Users,
                title: "Expert Mentorship",
                description: "Learn from industry professionals with years of experience"
              },
              {
                icon: Trophy,
                title: "Real Projects",
                description: "Build portfolio-worthy projects that showcase your skills"
              },
              {
                icon: Shield,
                title: "Job Support",
                description: "Career guidance and job placement assistance included"
              },
              {
                icon: Clock,
                title: "Lifetime Access",
                description: "Access course materials forever with free updates"
              },
              {
                icon: Star,
                title: "Community",
                description: "Join our active community of developers and learners"
              }
            ].map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-bold text-white mb-6">Ready to Start Your Journey?</h3>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of successful developers who started their careers with our courses.
          </p>
          <Button
            onClick={() => handleSelectPlan(plans[1])} // Default to Pro plan
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
          >
            Enroll Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-6 w-6" />
            <span className="text-xl font-bold">LearnPro</span>
          </div>
          <p className="text-gray-400 mb-4">Empowering developers worldwide</p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-gray-300">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300">Terms of Service</a>
            <a href="#" className="hover:text-gray-300">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
