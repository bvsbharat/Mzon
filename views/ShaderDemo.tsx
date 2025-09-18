import React from 'react';
import ShaderShowcase from '@/components/ui/hero';

interface ShaderDemoProps {
  onNavigate: (view: string) => void;
}

const ShaderDemo: React.FC<ShaderDemoProps> = ({ onNavigate }) => {
  return (
    <div className="h-full w-full">
      <ShaderShowcase />
    </div>
  );
};

export default ShaderDemo;