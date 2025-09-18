

import React, { useState, useRef, useEffect } from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import Icon from './Icon';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, title }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-gray-200 px-4 h-16 shrink-0">
      <button
        onClick={onMenuClick}
        className="-ml-2 p-2 text-gray-600 hover:text-gray-900"
        aria-label="Open sidebar"
      >
        <MenuIcon className="h-6 w-6" />
      </button>
      
      <div className="flex items-center gap-2">
          <Icon icon="sparkles" className="w-6 h-6 text-gray-800" />
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">
              Digital Studio
          </h1>
      </div>
      
      <div className="relative" ref={menuRef}>
        {isMenuOpen && (
          <div 
            className="absolute top-full right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          >
            <div className="py-1">
              <a href="#" className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">
                Account Settings
              </a>
              <a href="#" className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">
                Sign Out
              </a>
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          aria-label="Open user menu"
        >
            <UserCircleIcon className="w-8 h-8" />
        </button>
      </div>
    </header>
  );
};

export default Header;