import React, { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import Icon from '../components/Icon';

interface LandingPageProps {
  onAuthSuccess: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'signup'>('landing');

  if (currentView === 'login') {
    return (
      <LoginForm
        onSwitchToSignup={() => setCurrentView('signup')}
        onSuccess={onAuthSuccess}
      />
    );
  }

  if (currentView === 'signup') {
    return (
      <SignupForm
        onSwitchToLogin={() => setCurrentView('login')}
        onSuccess={onAuthSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Mesh Gradient Background */}
      <div
        className="fixed inset-0 w-full h-full z-0"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, #001c80 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, #1ac7ff 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, #04ffb1 0%, transparent 50%),
            radial-gradient(circle at 60% 60%, #ff1ff1 0%, transparent 50%),
            linear-gradient(135deg, #001c80, #1ac7ff, #04ffb1, #ff1ff1)
          `,
          animation: 'gradientShift 8s ease-in-out infinite alternate'
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-5">
        <div className="w-full max-w-md mx-auto">
          {/* Main Card/Modal */}
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            {/* Header inside card */}
            <div className="px-8 pt-6 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Icon icon="sparkles" className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Mzon</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('login')}
                  className="text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => setCurrentView('signup')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Get started
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="px-8 py-8">
              <div className="text-center mb-8">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-400/30 text-indigo-200 px-3 py-1.5 rounded-full text-xs font-medium mb-6">
                  <Icon icon="sparkles" className="w-3 h-3" />
                  AI-Powered Digital Photography Studio
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl font-bold text-white tracking-tight mb-4">
                  Create Stunning
                  <span className="block text-indigo-300">Visual Content</span>
                  <span className="block text-white">with AI</span>
                </h1>

                {/* Subtitle */}
                <p className="text-sm text-white/70 mb-8 leading-relaxed">
                  Transform your ideas into professional visuals with our AI-powered photography studio.
                  Generate images, create variations, and build complete campaigns in minutes.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-3 mb-6">
                  <button
                    onClick={() => setCurrentView('signup')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
                  >
                    <Icon icon="rocket" className="w-4 h-4" />
                    Start Creating Free
                  </button>
                  <button
                    onClick={() => setCurrentView('login')}
                    className="w-full border border-white/30 hover:border-white/50 hover:bg-white/5 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Icon icon="play" className="w-4 h-4" />
                    Watch Demo
                  </button>
                </div>

                {/* Social Proof */}
                <div className="text-center text-white/50 border-t border-white/10 pt-6">
                  <p className="text-xs mb-3">Trusted by creators worldwide</p>
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <span>10K+ Users</span>
                    <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                    <span>500K+ Images</span>
                    <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                    <span>99.9% Uptime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for gradient animation */}
      <style jsx>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
            transform: scale(1) rotate(0deg);
          }
          50% {
            background-position: 100% 50%;
            transform: scale(1.1) rotate(2deg);
          }
          100% {
            background-position: 0% 50%;
            transform: scale(1) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;