import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_URL } from '../utils/api';
import logo from '../assets/cseh_final_logo.png';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const isAdmin = searchParams.get('admin') === 'true';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const endpoint = isAdmin
        ? `${API_URL}/auth/reset-admin-password`
        : `${API_URL}/auth/reset-password`;
      const body = isAdmin
        ? { token, password }
        : { token, newPassword: password };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-box-modern" style={{ margin: '0 auto', maxWidth: '400px', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={logo} alt="Logo" style={{ height: '60px' }} />
        </div>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2>Reset Password</h2>
          <p>Enter your new password below</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modern-input-group">
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder=" "
            />
            <label htmlFor="new-password">New Password</label>
          </div>
          <div className="modern-input-group">
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder=" "
            />
            <label htmlFor="confirm-password">Confirm Password</label>
          </div>
          <button type="submit" className="btn-modern" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        {message && (
          <div className={`message ${message.toLowerCase().includes('success') ? 'success' : 'error'}`} style={{ display: 'block', marginTop: '1.5rem' }}>
            {message}
          </div>
        )}
        <div className="auth-footer">
          <a href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to Login</a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;