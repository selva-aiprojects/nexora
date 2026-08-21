import * as React from 'react';
import { api, setStoredToken, type AuthUser } from '@/lib/api';
import { Button } from '@/components/Button';
import { FormField, TextField } from '@/components/Input';
import { ThemeToggle } from '@/components/ThemeToggle';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

const DEMO_PERSONAS = [
  {
    role: 'Owner / CEO',
    name: 'Rajesh Kumar',
    email: 'owner@acme.in',
    icon: '👑',
    module: 'Command Center & All Modules',
    badge: 'Superadmin',
  },
  {
    role: 'Finance Lead',
    name: 'Priya Nair',
    email: 'finance@acme.in',
    icon: '💰',
    module: 'Accounting, Cash Flow & GST',
    badge: 'Finance',
  },
  {
    role: 'HR Manager',
    name: 'Anita Sharma',
    email: 'hr@acme.in',
    icon: '👥',
    module: 'HRMS, Attendance & Payroll',
    badge: 'HR',
  },
  {
    role: 'Employee',
    name: 'Vikram Singh',
    email: 'vikram@acme.in',
    icon: '👷',
    module: 'Employee Self-Service (ESS)',
    badge: 'ESS',
  },
];

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = React.useState('owner@acme.in');
  const [password, setPassword] = React.useState('demo1234');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email.trim(), password);
      setStoredToken(res.token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectPersona = (personaEmail: string) => {
    setEmail(personaEmail);
    setPassword('demo1234');
    setError(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink md:flex-row">
      {/* Top Header Controls */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Left Feature & Branding Panel */}
      <div className="relative flex flex-1 flex-col justify-between bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 text-white md:p-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Nexora" className="h-10 w-auto brightness-200" />
            <div className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-300 backdrop-blur-md">
              AI-NATIVE PLATFORM
            </div>
          </div>

          <div className="max-w-md space-y-3 pt-6">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Run Your Business. Intelligently.
            </h1>
            <p className="text-sm leading-relaxed text-indigo-200/80">
              The next-generation autonomous Operating System for enterprise Accounting, HRMS, CRM, Manufacturing, and Supply Chain.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300">
                ⚡
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">PostgreSQL Multi-Tenant Engine</h3>
                <p className="text-xs text-indigo-200/70">Sub-millisecond queries with strict row-level tenant security.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Autonomous AI Copilot</h3>
                <p className="text-xs text-indigo-200/70">Real-time financial anomaly detection and automated invoice parsing.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300">
                📊
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">7 Operational Command Dashboards</h3>
                <p className="text-xs text-indigo-200/70">Live KPIs across Finance, Inventory, HRMS, Procurement & CRM.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 text-xs text-indigo-300/60">
          © 2026 Nexora Operating Systems • Powered by Cloud PostgreSQL & Vercel
        </div>
      </div>

      {/* Right Login Form Container */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Sign In to Nexora</h2>
            <p className="text-sm text-ink-muted">Enter your credentials or choose a quick demo persona below.</p>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3.5 text-xs font-medium text-danger">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email address" htmlFor="login-email" required>
              <TextField
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </FormField>

            <FormField label="Password" htmlFor="login-password" required>
              <div className="relative">
                <TextField
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-xs font-medium text-ink-muted hover:text-ink"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </FormField>

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
              Sign In
            </Button>
          </form>

          {/* Quick Demo Login Section */}
          <div className="space-y-3 pt-4 border-t border-border-strong">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span className="font-semibold text-ink">Quick Demo Login:</span>
              <span>Click to auto-fill persona</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => selectPersona(p.email)}
                  className={`flex flex-col text-left rounded-lg border p-2.5 transition-all hover:border-primary hover:bg-primary/5 ${
                    email === p.email ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border-strong bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{p.icon} {p.name}</span>
                    <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">{p.badge}</span>
                  </div>
                  <span className="mt-1 text-[11px] font-medium text-ink-muted truncate">{p.role}</span>
                  <span className="text-[10px] text-ink-muted/70 truncate">{p.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
