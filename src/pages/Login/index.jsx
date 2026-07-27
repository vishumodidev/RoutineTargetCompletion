import { useState, useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Mail, Lock, User, Sword, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      name: '',
      email: 'vishu@tracker.com',
      password: 'password'
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (isRegister) {
        await register(data.name, data.email, data.password);
        toast.success('Welcome to Habit Hero! Your account has been registered.', { id: 'auth-success' });
      } else {
        await login(data.email, data.password);
        toast.success('Welcome back, Hero!', { id: 'auth-success' });
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Authentication failed. Please check details.', { id: 'auth-error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-primary px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-bg-card border border-border-dark rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-brand-primary/10 border border-brand-primary/25 flex items-center justify-center mx-auto mb-4 text-brand-primary animate-pulse">
            <Sword className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black tracking-wider text-white">HABIT HERO</h2>
          <p className="text-xs text-text-secondary mt-1.5">
            {isRegister ? 'Begin your journey & level up your life' : 'Welcome back, enter the portal to continue'}
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          
          {/* Display Name Input (Only on Registration) */}
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Display Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  placeholder="Hero Name"
                  {...formRegister('name', { required: 'Name is required' })}
                  className={`w-full pl-11 pr-4 py-3 bg-bg-input border ${
                    errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-border-dark focus:border-brand-primary'
                  } rounded-xl text-sm text-white placeholder-text-secondary/50 focus:outline-none transition duration-200`}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
              )}
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <input
                type="email"
                placeholder="hero@quest.com"
                {...formRegister('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: 'Please enter a valid email'
                  }
                })}
                className={`w-full pl-11 pr-4 py-3 bg-bg-input border ${
                  errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-border-dark focus:border-brand-primary'
                } rounded-xl text-sm text-white placeholder-text-secondary/50 focus:outline-none transition duration-200`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                {...formRegister('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                className={`w-full pl-11 pr-4 py-3 bg-bg-input border ${
                  errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-border-dark focus:border-brand-primary'
                } rounded-xl text-sm text-white placeholder-text-secondary/50 focus:outline-none transition duration-200`}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-brand-primary/20 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Sign Up' : 'Enter Portal'}</span>
                <ArrowRight className="h-4.5 w-4.5 ml-2 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Anchor */}
        <div className="text-center mt-6">
          <p className="text-xs text-text-secondary">
            {isRegister ? 'Already registered?' : 'New to Habit Hero?'}
            <button
              onClick={toggleMode}
              className="ml-1.5 font-bold text-brand-primary hover:text-brand-secondary transition-colors focus:outline-none"
            >
              {isRegister ? 'Login here' : 'Create an Account'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
