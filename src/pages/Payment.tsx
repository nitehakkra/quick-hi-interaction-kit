import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

const Payment = () => {
  const [searchParams] = useSearchParams();
  const planName = searchParams.get('plan') || 'Complete';
  const billing = searchParams.get('billing') || 'yearly';

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
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <span className="text-slate-300">ACCOUNT</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-white font-medium">PAYMENT</span>
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
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Payment Page</h1>
          <p className="text-slate-300 mb-6">
            Selected Plan: {planName} ({billing})
          </p>
          <p className="text-slate-400">
            Payment integration will be implemented in the next step.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;