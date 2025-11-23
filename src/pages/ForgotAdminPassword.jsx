import React, { useState } from 'react';
import { API_URL } from '../utils/api';
import logo from '../assets/cseh_final_logo.png';

const ForgotAdminPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/forgot-admin-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Error sending admin password reset email');
    }
  };

  return (
    <div className="login-page">
      <div className="auth-box-modern" style={{ margin: '0 auto', maxWidth: '400px', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={logo} alt="Logo" style={{ height: '60px' }} />
        </div>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2>Forgot Admin Password</h2>
          <p>Enter your admin email address</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modern-input-group">
            <input
              id="forgot-admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=" "
            />
            <label htmlFor="forgot-admin-email">Admin Email</label>
          </div>
          <button type="submit" className="btn-modern">Send Reset Link</button>
        </form>
        {message && (
          <div className={`message ${message.toLowerCase().includes('sent') ? 'success' : 'error'}`} style={{ display: 'block', marginTop: '1.5rem' }}>
            {message}
          </div>
        )}
        <div className="auth-footer">
          <a href="/admin-login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to Admin Login</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotAdminPassword;
