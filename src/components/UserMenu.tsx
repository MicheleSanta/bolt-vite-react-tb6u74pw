import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserMenuProps {
  userEmail: string;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ userEmail, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { userRole } = useAuth();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-white hover:text-blue-200 focus:outline-none"
      >
        <div className={`w-8 h-8 rounded-full ${userRole === 'admin' ? 'bg-purple-500' : 'bg-blue-500'} flex items-center justify-center`}>
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium">{userEmail}</div>
          <div className="text-xs text-blue-200">{userRole === 'admin' ? 'Amministratore' : userRole === 'employee' ? 'Dipendente' : 'Utente'}</div>
        </div>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{userEmail}</p>
            <p className={`text-xs ${userRole === 'admin' ? 'text-purple-600' : userRole === 'employee' ? 'text-blue-600' : 'text-gray-600'}`}>
              {userRole === 'admin' ? 'Amministratore' : userRole === 'employee' ? 'Dipendente' : 'Utente'}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4 mr-2 text-gray-500" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;