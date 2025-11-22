
import React, { useState } from 'react';
import { API_URL } from '../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || 'Password reset email sent successfully!');
      } else {
        setMessage(data.error || data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setMessage('Error connecting to server. Please ensure the server is running.');
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1>Forgot Password</h1>
        <p className="forgot-password-desc">Enter your email address and we'll send you a link to reset your password.</p>
        <form onSubmit={handleSubmit} className="forgot-password-form">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
          <button type="submit">Send Reset Link</button>
        </form>
        {message && <div className="forgot-password-message">{message}</div>}
      </div>
      <style>{`
        .forgot-password-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 20% 20%, #1e293b 60%, #0f172a 100%);
        }
        .forgot-password-box {
          background: rgba(30, 41, 59, 0.95);
          padding: 2.5rem 2rem 2rem 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          max-width: 400px;
          width: 100%;
          color: #fff;
        }
        .forgot-password-box h1 {
          margin-bottom: 0.5rem;
          font-size: 2rem;
          font-weight: bold;
          text-align: center;
        }
        .forgot-password-desc {
          text-align: center;
          margin-bottom: 1.5rem;
          color: #cbd5e1;
        }
        .forgot-password-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .forgot-password-form label {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .forgot-password-form input {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: none;
          font-size: 1rem;
          background: #334155;
          color: #fff;
        }
        .forgot-password-form input:focus {
          outline: 2px solid #60a5fa;
        }
        .forgot-password-form button {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: none;
          background: #3b82f6;
          color: #fff;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .forgot-password-form button:hover {
          background: #2563eb;
        }
        .forgot-password-message {
          margin-top: 1rem;
          text-align: center;
          color: #38bdf8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;