import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaLock, FaGlobe, FaCode } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc';
import { signup, login, setCurrentUser, getCurrentUser, API_URL } from '../utils/api'
import logo from '../assets/cseh_final_logo.png'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [loginData, setLoginData] = useState({ username: '', password: '' })
  const [signupData, setSignupData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = () => {
      const username = getCurrentUser()
      if (username) {
        navigate('/dashboard', { replace: true })
      }
    }
    
    checkAuth()
    
    // Check again when page becomes visible (handles back button)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuth()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkAuth)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkAuth)
    }
  }, [navigate])

  // Handle Google OAuth token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const error = urlParams.get('error')
    
    if (error) {
      showMessage('Google sign-in failed. Please try again.', 'error')
      window.history.replaceState({}, '', '/login')
      return
    }
    
    if (token) {
      // Token received from Google OAuth callback
      // The backend already set the cookie, just verify user
      fetch(`${API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.username) {
            setCurrentUser(data.username)
            showMessage('Successfully signed in with Google!', 'success')
            setTimeout(() => navigate('/dashboard', { replace: true }), 500)
          }
        })
        .catch(err => {
          console.error('Token verification failed:', err)
          showMessage('Sign-in verification failed', 'error')
        })
        .finally(() => {
          window.history.replaceState({}, '', '/login')
        })
    }
  }, [navigate])

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(loginData.username, loginData.password)
      setCurrentUser(loginData.username)
      showMessage('Login successful! Redirecting...', 'success')
      setTimeout(() => navigate('/dashboard', { replace: true }), 1000)
    } catch (error) {
      showMessage(error.message || 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()

    if (signupData.username.length < 3) {
      showMessage('Username must be at least 3 characters long.', 'error')
      return
    }

    if (!signupData.email || !/\S+@\S+\.\S+/.test(signupData.email)) {
      showMessage('Please enter a valid email address.', 'error')
      return
    }

    if (signupData.password.length < 6) {
      showMessage('Password must be at least 6 characters long.', 'error')
      return
    }

    if (signupData.password !== signupData.confirmPassword) {
      showMessage('Passwords do not match.', 'error')
      return
    }

    setLoading(true)

    try {
      const response = await signup(signupData.username, signupData.email, signupData.password)
      showMessage(response.message || 'Account created successfully! Please login.', 'success')

      setTimeout(() => {
        setIsLogin(true)
        setLoginData({ username: signupData.username, password: '' })
        setSignupData({ username: '', email: '', password: '', confirmPassword: '' })
      }, 3000)
    } catch (error) {
      showMessage(error.message || 'Signup failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-split">
        {/* Left Side - Visuals */}
        <div className="login-visual">
          <div className="visual-content">
            <h1>
              <img src={logo} alt="Logo" style={{ height: '60px', marginRight: '15px', display: 'inline-block', verticalAlign: 'middle' }} /> 
              Cache Me If You Can
            </h1>
            <p className="visual-subtitle">
              <span style={{ color: '#60a5fa', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>ROUND 2</span>
              Hosted by the Cybersecurity and Ethical Hacking Club, NHCE
            </p>
            <div className="visual-features">
              <div className="feature-item">
                <div className="feature-icon"><FaGlobe /></div>
                <span>Global Intelligence Challenges</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><FaLock /></div>
                <span>Advanced Cryptography Puzzles</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><FaCode /></div>
                <span>Real-world Scenarios</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="login-form-section">
          <div className="auth-box-modern">
            <div className="auth-header">
              <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
              <p>{isLogin ? 'Enter your credentials to access your dashboard.' : 'Start your journey into OSINT today.'}</p>
            </div>

            <button 
              type="button" 
              onClick={() => window.location.href = `${API_URL}/auth/google`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                backgroundColor: 'white',
                color: '#333',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.95rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <FcGoogle size={20} />
              {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 20px 0', color: '#94a3b8' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <span style={{ padding: '0 10px', fontSize: '0.85rem' }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>

            <form onSubmit={isLogin ? handleLogin : handleSignup}>
              <div className="modern-input-group">
                <input
                  type="text"
                  id="username"
                  placeholder=" "
                  value={isLogin ? loginData.username : signupData.username}
                  onChange={(e) => isLogin ? setLoginData({ ...loginData, username: e.target.value }) : setSignupData({ ...signupData, username: e.target.value })}
                  required
                  autoComplete="username"
                />
                <label htmlFor="username">Username</label>
              </div>

              {!isLogin && (
                <div className="modern-input-group">
                  <input
                    type="email"
                    id="email"
                    placeholder=" "
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                  <label htmlFor="email">Email Address</label>
                </div>
              )}

              <div className="modern-input-group">
                <input
                  type="password"
                  id="password"
                  placeholder=" "
                  value={isLogin ? loginData.password : signupData.password}
                  onChange={(e) => isLogin ? setLoginData({ ...loginData, password: e.target.value }) : setSignupData({ ...signupData, password: e.target.value })}
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <label htmlFor="password">Password</label>
              </div>

              {!isLogin && (
                <div className="modern-input-group">
                  <input
                    type="password"
                    id="confirmPassword"
                    placeholder=" "
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    required
                    autoComplete="new-password"
                  />
                  <label htmlFor="confirmPassword">Confirm Password</label>
                </div>
              )}

              <button type="submit" className="btn-modern" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="auth-footer">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
                {isLogin ? 'Sign up' : 'Log in'}
              </a>
            </div>

            {isLogin && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <a href="/admin-login" style={{ color: '#475569', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#94a3b8'} onMouseOut={(e) => e.target.style.color = '#475569'}>
                  Admin Access →
                </a>
              </div>
            )}

            {isLogin && (
              <div className="forgot-password-link" style={{ textAlign: 'center', marginTop: '12px' }}>
                <a
                  href="#"
                  style={{ color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}
                  onMouseOver={(e) => e.target.style.color = '#93c5fd'}
                  onMouseOut={(e) => e.target.style.color = '#60a5fa'}
                >
                  Forgot Password?
                </a>
              </div>
            )}

            {message.text && (
              <div className={`message ${message.type}`} style={{ display: 'block', marginTop: '24px' }}>
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
