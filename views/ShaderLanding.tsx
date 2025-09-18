import React, { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import ShaderShowcase from '@/components/ui/hero';

interface ShaderLandingProps {
  onAuthSuccess?: () => void;
}

const ShaderLanding: React.FC<ShaderLandingProps> = ({ onAuthSuccess }) => {
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
    <div className="min-h-screen w-full">
      <ShaderShowcase onSwitchToLogin={() => setCurrentView('login')} onSwitchToSignup={() => setCurrentView('signup')} />
    </div>
  );
};

export default ShaderLanding;