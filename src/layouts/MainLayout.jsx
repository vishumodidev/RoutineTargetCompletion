import { useContext, useState, Suspense } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getLevelDetails } from '../utils';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Clock,
  BarChart2, 
  Calendar as CalendarIcon, 
  Trophy, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X, 
  Zap, 
  Sword,
  Milestone
} from 'lucide-react';

export default function MainLayout() {
  const { user, logout } = useContext(AuthContext);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // If user is null, avoid rendering details until redirect is complete
  if (!user) return null;

  // Calculate leveling details based on user's XP
  const { level, percent, nextLevelXP } = getLevelDetails(user.xp);

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/routine', label: 'Routine', icon: Clock },
    { to: '/habits', label: 'Habits', icon: CheckSquare },
    { to: '/roadmap', label: 'Roadmap', icon: Milestone },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
    { to: '/achievements', label: 'Achievements', icon: Trophy },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ];

  const renderNavItems = (onClick) => (
    <nav className="space-y-1">
      {navLinks.map((link) => {
        const IconComponent = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClick}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-primary/15 text-brand-primary border-l-4 border-brand-primary'
                  : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'
              }`
            }
          >
            <IconComponent className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-bg-dark flex text-text-primary">
      {/* Desktop Sidebar (Sidebar Navigation) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border-dark bg-bg-card">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-border-dark">
            <Sword className="h-6 w-6 text-brand-primary mr-2.5 animate-pulse" />
            <span className="text-xl font-extrabold bg-gradient-to-r from-brand-primary to-purple-400 bg-clip-text text-transparent tracking-wider">
              HABIT HERO
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 py-6 px-4 overflow-y-auto">
            {renderNavItems()}
          </div>

          {/* User Profile Summary at bottom */}
          <div className="p-4 border-t border-border-dark bg-bg-dark/40">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
                <UserIcon className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-text-secondary truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-2 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Mobile Navigation Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsMobileOpen(false)}
          />

          <div className="relative flex flex-col flex-1 w-full max-w-xs bg-bg-card border-r border-border-dark animate-slide-right">
            <div className="flex items-center justify-between h-16 px-6 border-b border-border-dark">
              <div className="flex items-center">
                <Sword className="h-6 w-6 text-brand-primary mr-2.5" />
                <span className="text-xl font-extrabold bg-gradient-to-r from-brand-primary to-purple-400 bg-clip-text text-transparent">
                  HABIT HERO
                </span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1 text-text-secondary hover:text-text-primary rounded-lg focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 py-6 px-4 overflow-y-auto">
              {renderNavItems(() => setIsMobileOpen(false))}
            </div>

            <div className="p-4 border-t border-border-dark bg-bg-dark/40">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
                  <UserIcon className="h-5 w-5 text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-text-secondary truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full px-4 py-2 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-bg-card/85 backdrop-blur-md border-b border-border-dark h-16 flex items-center px-4 md:px-8 justify-between">
          <div className="flex items-center">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-2 text-text-secondary hover:text-text-primary md:hidden rounded-lg hover:bg-bg-input"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <h2 className="text-lg font-semibold ml-2 md:ml-0 hidden sm:block">
              Welcome Back, <span className="text-brand-primary font-bold">{user.name}</span>!
            </h2>
          </div>

          {/* Gamification Stats Header */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Streak Counter */}
            <div className="flex items-center bg-orange-500/10 border border-orange-500/25 px-3 py-1 rounded-full text-orange-400">
              <Zap className="h-4.5 w-4.5 fill-orange-400 text-orange-400 mr-1.5 animate-bounce" />
              <span className="text-xs font-extrabold tracking-wide uppercase">
                {user.streak || 0} Day Streak
              </span>
            </div>

            {/* Level & XP Progress Info */}
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-text-secondary font-medium hidden xs:inline">
                  {user.xp} / {nextLevelXP || 'Max'} XP
                </span>
                <span className="flex items-center bg-brand-primary/20 border border-brand-primary/30 px-2 py-0.5 rounded text-[11px] font-black text-brand-primary">
                  LVL {level}
                </span>
              </div>
              
              {/* Progress Bar Container */}
              {nextLevelXP && (
                <div className="w-24 xs:w-32 bg-bg-input h-1.5 rounded-full mt-1.5 overflow-hidden border border-border-dark">
                  <div 
                    className="bg-gradient-to-r from-brand-primary to-purple-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet View */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Outlet is where React Router page loads */}
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={
              <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-primary"></div>
              </div>
            }>
              {/* Simple page template inside MainLayout */}
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
