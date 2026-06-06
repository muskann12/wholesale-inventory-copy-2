'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '▦' },
    { href: '/products',  label: 'Products',  icon: '⊞' },
    { href: '/sales',     label: 'Sales',     icon: '◈' },
    { href: '/mobile-scan', label: 'Scan (Mobile)', icon: '📱' },
  ];

  return (
    <>
      <nav style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(8px)',
      }}>
        {/* Logo area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/brand.png"
            alt="Manha Clothing Logo"
            width={48}
            height={48}
            style={{
              borderRadius: '8px',
              objectFit: 'cover',
            }}
          />
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            display: 'none',
          }} className="hidden sm:inline">Manha Clothing</span>
        </div>

        {/* Desktop Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="hidden md:flex">
          {navLinks.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : 'var(--text2)',
                background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg3)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'transparent'; }}}
              >
                <span style={{ fontSize: '12px' }}>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'var(--bg3)',
            border: 'none',
            color: 'var(--text)',
            fontSize: '20px',
            padding: '8px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          className="md:hidden block"
        >
          ≡
        </button>

        {/* Desktop Logout */}
        <button onClick={handleLogout} className="btn btn-ghost btn-sm hidden sm:block">
          Sign out
        </button>

        {/* Mobile Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: 'var(--text2)',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '8px',
          }}
          className="md:hidden block hover:text-red-500"
        >
          ⊗
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'sticky',
          top: '60px',
          zIndex: 39,
          animation: 'slideDown 0.2s ease-out',
        }}>
          {navLinks.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '16px' }}>{icon}</span>
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)',
              border: 'none',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginTop: '8px',
            }}
          >
            Sign out
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .md\\:hidden {
            display: block !important;
          }
          .md\\:flex {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .md\\:hidden {
            display: none !important;
          }
          .md\\:flex {
            display: flex !important;
          }
        }
        @media (max-width: 640px) {
          .sm\\:inline {
            display: none !important;
          }
          .sm\\:block {
            display: none !important;
          }
        }
        @media (min-width: 641px) {
          .sm\\:inline {
            display: inline !important;
          }
          .sm\\:block {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}