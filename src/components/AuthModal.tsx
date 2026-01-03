import { memo, useState, useCallback, useEffect } from 'react';
import * as authService from '../services/auth';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (user: authService.User) => void;
  initialMode?: 'login' | 'signup';
}

export function setCurrentUser(user: authService.User | null) {
  if (user) {
    authService.setStoredUser(user);
  } else {
    authService.logout();
  }
}

export function isAuthenticated(): boolean {
  return authService.isAuthenticated();
}

// Password input with visibility toggle
const PasswordInput = memo(({ 
  value, 
  onChange, 
  placeholder, 
  autoComplete 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string;
  autoComplete: string;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 sm:p-3 pr-10 bg-white border-4 text-black text-sm sm:text-base"
        style={{ borderColor: '#808080 #fff #fff #808080' }}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-black p-1"
        title={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? '👁️' : '👁️‍🗨️'}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

function AuthModal({ onClose, onLogin, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; mongodb: boolean; message?: string } | null>(null);

  // Check API connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const status = await authService.checkHealth();
      setConnectionStatus(status);
      if (!status.connected) {
        setError(status.message || 'Cannot connect to server');
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  }, [password]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await authService.login(email, password);
      
      if (response.success && response.data) {
        const loggedInUser: authService.User = {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          solveCount: response.data.user.solveCount
        };
        onLogin(loggedInUser);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      // Recheck connection status
      const status = await authService.checkHealth();
      setConnectionStatus(status);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, onLogin]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !name || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (name.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await authService.signup(name, email, password);
      
      if (response.success && response.data) {
        const newUser: authService.User = {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          solveCount: response.data.user.solveCount
        };
        onLogin(newUser);
      } else {
        setError(response.message || 'Signup failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Signup failed';
      setError(errorMsg);
      // Recheck connection status
      const status = await authService.checkHealth();
      setConnectionStatus(status);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, name, confirmPassword, onLogin]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setSuccess('If an account exists with this email, you will receive a password reset link.');
  }, [email]);

  const switchMode = useCallback((newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setError('');
    setSuccess('');
    if (newMode !== 'forgot') {
      setEmail('');
      setPassword('');
      setName('');
      setConfirmPassword('');
    }
  }, []);

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return '#f44336';
    if (passwordStrength <= 2) return '#ff9800';
    if (passwordStrength <= 3) return '#ffc107';
    return '#4caf50';
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength <= 3) return 'Good';
    return 'Strong';
  };

  return (
    <div 
      className="modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div 
        className="modal-content retro-window max-w-md"
        onClick={stopPropagation}
        style={{
          boxShadow: '8px 8px 0 rgba(0,0,0,0.5), 0 0 80px rgba(0,217,255,0.4)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Title Bar */}
        <div className="retro-title-bar">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg sm:text-xl flex-shrink-0">
              {mode === 'login' ? '🔐' : mode === 'signup' ? '📝' : '🔑'}
            </span>
            <span className="text-sm sm:text-base truncate">
              {mode === 'login' ? 'Login to RubikSight' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </span>
          </div>
          <div className="retro-title-buttons flex-shrink-0">
            <button className="retro-title-btn" onClick={onClose} title="Minimize">_</button>
            <button className="retro-title-btn" onClick={onClose} title="Maximize">□</button>
            <button 
              className="retro-title-btn" 
              onClick={onClose}
              style={{ color: '#e94560' }}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-body p-4 sm:p-6 bg-gradient-to-b from-gray-200 to-gray-300">
          {/* Connection Status Banner */}
          {connectionStatus && !connectionStatus.connected && (
            <div className="retro-panel mb-4 p-3 bg-red-100 border-2" style={{ borderColor: '#e94560' }}>
              <div className="flex items-start gap-2">
                <span className="text-xl">❌</span>
                <div className="flex-1">
                  <div className="font-bold text-black text-sm mb-1">Backend Server Offline</div>
                  <div className="text-xs text-gray-700">{connectionStatus.message}</div>
                  <div className="text-xs text-gray-600 mt-2">
                    To start the server, run: <code className="bg-gray-800 text-green-400 px-1">cd server && node server.js</code>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {connectionStatus && connectionStatus.connected && !connectionStatus.mongodb && (
            <div className="retro-panel mb-4 p-3 bg-yellow-100 border-2" style={{ borderColor: '#ffc107' }}>
              <div className="flex items-start gap-2">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <div className="font-bold text-black text-sm mb-1">MongoDB Not Connected</div>
                  <div className="text-xs text-gray-700">Authentication features are limited. See MONGODB_SETUP.md for setup instructions.</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="relative inline-block">
              <div className="text-5xl sm:text-6xl mb-2">🧊</div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-black">
              {mode === 'login' ? 'Welcome Back!' : mode === 'signup' ? 'Join RubikSight' : 'Forgot Password?'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {mode === 'login' 
                ? 'Sign in to access the cube solver' 
                : mode === 'signup'
                ? 'Create an account to solve cubes'
                : 'Enter your email to reset your password'}
            </p>
          </div>

          {/* Social Login (UI only) */}
          {mode !== 'forgot' && (
            <div className="mb-4">
              <div className="flex gap-2">
                <button 
                  type="button"
                  className="flex-1 retro-btn flex items-center justify-center gap-2 py-2"
                  onClick={() => setError('Social login coming soon!')}
                >
                  <span>🔷</span>
                  <span className="text-xs sm:text-sm">Google</span>
                </button>
                <button 
                  type="button"
                  className="flex-1 retro-btn flex items-center justify-center gap-2 py-2"
                  onClick={() => setError('Social login coming soon!')}
                >
                  <span>⬛</span>
                  <span className="text-xs sm:text-sm">GitHub</span>
                </button>
              </div>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-400"></div>
                <span className="text-gray-600 text-xs">OR</span>
                <div className="flex-1 h-px bg-gray-400"></div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={
            mode === 'login' ? handleLogin : 
            mode === 'signup' ? handleSignup : 
            handleForgotPassword
          }>
            {mode === 'signup' && (
              <div className="mb-3 sm:mb-4">
                <label className="block text-black font-bold mb-1 text-sm sm:text-base">
                  👤 Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 sm:p-3 bg-white border-4 text-black text-sm sm:text-base"
                  style={{ borderColor: '#808080 #fff #fff #808080' }}
                  placeholder="Enter your name"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="mb-3 sm:mb-4">
              <label className="block text-black font-bold mb-1 text-sm sm:text-base">
                📧 Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 sm:p-3 bg-white border-4 text-black text-sm sm:text-base"
                style={{ borderColor: '#808080 #fff #fff #808080' }}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="mb-3 sm:mb-4">
                <label className="block text-black font-bold mb-1 text-sm sm:text-base">
                  🔒 Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode === 'signup' && password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div
                          key={level}
                          className="flex-1 h-2 rounded"
                          style={{
                            backgroundColor: level <= passwordStrength ? getStrengthColor() : '#ddd'
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: getStrengthColor() }}>
                      Password strength: {getStrengthLabel()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <div className="mb-3 sm:mb-4">
                <label className="block text-black font-bold mb-1 text-sm sm:text-base">
                  🔒 Confirm Password
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-600 text-xs mt-1">⚠️ Passwords do not match</p>
                )}
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-black text-sm">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="retro-checkbox w-4 h-4"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="retro-panel bg-red-100 mb-3 sm:mb-4 p-2 sm:p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl flex-shrink-0">⚠️</span>
                  <span className="text-red-700 text-sm sm:text-base">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="retro-panel bg-green-100 mb-3 sm:mb-4 p-2 sm:p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl flex-shrink-0">✅</span>
                  <span className="text-green-700 text-sm sm:text-base">{success}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`retro-btn w-full py-2 sm:py-3 text-base sm:text-lg mb-3 sm:mb-4 ${
                isLoading ? 'opacity-70' : 'retro-btn-success'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> PLEASE WAIT...
                </span>
              ) : mode === 'login' ? (
                '🔓 LOGIN'
              ) : mode === 'signup' ? (
                '✨ CREATE ACCOUNT'
              ) : (
                '📧 SEND RESET LINK'
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="text-center">
            {mode === 'forgot' ? (
              <button
                onClick={() => switchMode('login')}
                className="text-blue-600 font-bold hover:underline text-sm sm:text-base"
              >
                ← Back to Login
              </button>
            ) : (
              <>
                <p className="text-black text-sm sm:text-base">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </p>
                <button
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-blue-600 font-bold hover:underline text-sm sm:text-base"
                >
                  {mode === 'login' ? 'Sign up here' : 'Login here'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-300 border-t-2 border-gray-400 px-4 py-2 sm:py-3">
          <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="led-on w-2 h-2"></span>
              <span>Secure</span>
            </div>
            <span className="hidden sm:inline">Press ESC to close</span>
            <button onClick={onClose} className="sm:hidden text-blue-600">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(AuthModal);
