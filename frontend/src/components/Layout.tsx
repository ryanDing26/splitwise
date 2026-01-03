import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  Plus, 
  User, 
  LogOut, 
  Menu, 
  X,
  Home,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui';
import { cn } from '@/utils';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/bills', label: 'Bills', icon: Receipt },
    { path: '/payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-surface-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-surface-900">
              Split<span className="text-primary-600">wise</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              to="/bills/new"
              className="btn-primary hidden sm:inline-flex"
            >
              <Plus className="w-4 h-4" />
              New Bill
            </Link>

            {/* User menu */}
            <div className="relative group">
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-50 transition-colors">
                <Avatar src={user?.avatar} name={user?.name || user?.phoneNumber} size="sm" />
                <span className="hidden lg:block text-sm font-medium text-surface-700">
                  {user?.name || user?.displayName}
                </span>
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-white rounded-xl shadow-soft-lg border border-surface-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <hr className="my-2 border-surface-100" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-surface-100 animate-slide-up">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:bg-surface-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/bills/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 mt-2 bg-primary-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-5 h-5" />
              New Bill
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-surface-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

// Page Header component
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backLink?: string;
}

export function PageHeader({ title, description, action, backLink }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      {backLink && (
        <button
          onClick={() => navigate(backLink)}
          className="text-sm text-surface-500 hover:text-surface-700 mb-2 flex items-center gap-1"
        >
          ← Back
        </button>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">{title}</h1>
          {description && (
            <p className="mt-1 text-surface-500">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
