import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/api';
import logo from '../assets/cseh_final_logo.png';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState('Verifying your email...');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link.');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message);
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Error connecting to server.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="login-page">
      <div className="auth-box-modern" style={{ margin: '0 auto', maxWidth: '400px', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={logo} alt="Logo" style={{ height: '60px' }} />
        </div>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2>Email Verification</h2>
        </div>
        
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {status === 'loading' && (
            <div style={{ color: 'var(--text-secondary)' }}>Verifying...</div>
          )}
          
          {status === 'success' && (
            <div>
              <div style={{ color: '#4ade80', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>{message}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Redirecting to login...</p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div style={{ color: '#ef4444', fontSize: '3rem', marginBottom: '1rem' }}>✕</div>
              <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{message}</p>
              <button 
                className="btn-modern" 
                onClick={() => navigate('/')}
                style={{ marginTop: '1rem' }}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;