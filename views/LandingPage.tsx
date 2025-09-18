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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <nav className="relative max-w-7xl mx-auto flex items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Icon icon="sparkles" className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Mzon</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView('login')}
            className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={() => setCurrentView('signup')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Icon icon="sparkles" className="w-4 h-4" />
            AI-Powered Digital Photography Studio
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Create Stunning
            <span className="block text-indigo-600">Visual Content</span>
            <span className="block text-gray-900">with AI</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your ideas into professional visuals with our AI-powered photography studio.
            Generate images, create variations, and build complete campaigns in minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => setCurrentView('signup')}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <Icon icon="rocket" className="w-5 h-5" />
              Start Creating Free
            </button>
            <button
              onClick={() => setCurrentView('login')}
              className="w-full sm:w-auto border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Icon icon="play" className="w-5 h-5" />
              Watch Demo
            </button>
          </div>

          {/* Social Proof */}
          <div className="text-center text-gray-500 mb-16">
            <p className="text-sm mb-4">Trusted by creators worldwide</p>
            <div className="flex items-center justify-center gap-8 opacity-60">
              <div className="text-sm font-medium">10K+ Users</div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="text-sm font-medium">500K+ Images Generated</div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="text-sm font-medium">99.9% Uptime</div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="image" className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Image Generation</h3>
            <p className="text-gray-600">
              Create professional-quality images from simple text descriptions using advanced AI models.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="magicWand" className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Variations</h3>
            <p className="text-gray-600">
              Generate multiple variations of your images with different styles, colors, and compositions.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="layers" className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Campaign Builder</h3>
            <p className="text-gray-600">
              Build complete marketing campaigns with consistent visuals across multiple platforms.
            </p>
          </div>
        </div>

        {/* News & Content Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest News to Content</h2>
            <p className="text-gray-600">
              Transform trending news into engaging visual content for your social media channels.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="newspaper" className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Real-time News Feed</h3>
                <p className="text-gray-600">
                  Access premium AI and tech news sources updated in real-time.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="sparkles" className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Instant Content Creation</h3>
                <p className="text-gray-600">
                  Convert news articles into images, videos, and social media posts instantly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center bg-gray-900 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to transform your content?</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Join thousands of creators using AI to produce stunning visuals.
          </p>
          <button
            onClick={() => setCurrentView('signup')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 inline-flex items-center gap-2"
          >
            <Icon icon="rocket" className="w-5 h-5" />
            Get Started Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
                <Icon icon="sparkles" className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Mzon</span>
            </div>
            <p className="text-sm">
              © 2024 Mzon. All rights reserved. Built with AI for creators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;