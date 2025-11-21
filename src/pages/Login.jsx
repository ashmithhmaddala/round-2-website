import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt } from 'react-icons/fa'
import { signup, login, setCurrentUser } from '../utils/api'

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
      setTimeout(() => navigate('/dashboard'), 1000)
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
      await signup(signupData.username, signupData.password)
      showMessage('Account created successfully! Please login.', 'success')

      setTimeout(() => {
        setIsLogin(true)
        setLoginData({ username: signupData.username, password: '' })
        setSignupData({ username: '', email: '', password: '', confirmPassword: '' })
      }, 1500)
    } catch (error) {
      showMessage(error.message || 'Signup failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="auth-box">
        <div className="logo">
          <h1>
            <FaShieldAlt /> OSINT & Crypto CTF
          </h1>
          <p>Challenge Your Mind</p>
        </div>

        {isLogin ? (
          <div className="form-container active">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="loginUsername">Username</label>
                <input
                  type="text"
                  id="loginUsername"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="input-group">
                <label htmlFor="loginPassword">Password</label>
                <input
                  type="password"
                  id="loginPassword"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <p className="toggle-form">
              Don't have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(false); }}>
                Sign up
              </a>
            </p>
            <p className="toggle-form" style={{ marginTop: '10px', fontSize: '0.85rem' }}>
              <a href="/admin-login" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Admin Access →
              </a>
            </p>
          </div>
        ) : (
          <div className="form-container active">
            <h2>Sign Up</h2>
            <form onSubmit={handleSignup}>
              <div className="input-group">
                <label htmlFor="signupUsername">Username</label>
                <input
                  type="text"
                  id="signupUsername"
                  value={signupData.username}
                  onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="input-group">
                <label htmlFor="signupEmail">Email</label>
                <input
                  type="email"
                  id="signupEmail"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="input-group">
                <label htmlFor="signupPassword">Password</label>
                <input
                  type="password"
                  id="signupPassword"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="input-group">
                <label htmlFor="signupConfirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="signupConfirmPassword"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
            <p className="toggle-form">
              Already have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(true); }}>
                Login
              </a>
            </p>
          </div>
        )}

        {message.text && (
          <div className={`message ${message.type}`} style={{ display: 'block' }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
