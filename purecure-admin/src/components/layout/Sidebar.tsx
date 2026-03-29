import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  Star, 
  FileText, 
  LogOut,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { path: '/patients',     icon: Users,           label: 'Patients'     },
  { path: '/appointments', icon: Calendar,        label: 'Appointments' },
  { path: '/doctors',      icon: Stethoscope,     label: 'Doctors'      },
  { path: '/reviews',      icon: Star,            label: 'Reviews'      },
  { path: '/reports',      icon: FileText,        label: 'Reports'      },
];

export default function Sidebar() {
  const { logout, admin } = useAuth();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <PlusCircle className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Pure<span className="text-primary">Cure</span>
          </h1>
        </div>
        <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
          Clinic Admin Portal
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center px-4 py-3 rounded-xl transition-all duration-200 group
              ${isActive 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'text-gray-600 hover:bg-primary/5 hover:text-primary'}
            `}
          >
            <item.icon className="w-5 h-5 mr-3 shrink-0" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-gray-100">
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <p className="text-sm font-bold text-gray-900 truncate">
            {admin?.clinic?.name || 'Loading Clinic...'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {admin?.full_name}
          </p>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
