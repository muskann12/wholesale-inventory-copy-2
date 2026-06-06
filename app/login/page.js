'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) router.push('/dashboard');
    else {
      const data = await res.json();
      setError(data.error || 'Login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg) 0%, rgba(59,130,246,0.05) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-200px', right: '-200px',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-200px', left: '-200px',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Brand Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <img 
              src="/brand.jpeg" 
              alt="Manha Clothing" 
              style={{
                height: '100px',
                width: 'auto',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
            marginBottom: '8px',
          }}>Manha Clothing</h1>
          <p style={{ 
            color: 'var(--text2)', 
            fontSize: '14px', 
            marginTop: '8px',
            fontWeight: 500,
          }}>
            Wholesale Inventory Management System
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ 
          padding: '36px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(10px)',
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '14px',
              marginBottom: '22px',
              fontWeight: 500,
              animation: 'slideDown 0.3s ease-out',
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '22px' }}>
              <label className="lbl" style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text)',
              }}>Email address</label>
              <input
                type="email"
                className="inp"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label className="lbl" style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text)',
              }}>Password</label>
              <input
                type="password"
                className="inp"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '13px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}