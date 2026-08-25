"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Eye, EyeOff, Heart, Stethoscope, Pill,
  CheckCircle, AlertCircle, ArrowLeft, Shield, Lock, Mail,
  User, ChevronRight
} from 'lucide-react';

type Role = 'doctor' | 'pharmacist';
type AuthTab = 'login' | 'signup';

interface AuthPageProps {
  onLogin: (role: Role) => void;
  onBack: () => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  terms?: string;
}

const roles: {
  id: Role;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  {
    id: 'doctor',
    label: 'Doctor',
    icon: Stethoscope,
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    id: 'pharmacist',
    label: 'Pharmacist',
    icon: Pill,
    color: '#00B894',
    bg: '#F0FDF4',
  },
];

function validate(
  tab: AuthTab,
  fields: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: Role | '';
    terms: boolean;
  }
): FormErrors {
  const errors: FormErrors = {};

  if (tab === 'signup' && !fields.name.trim()) {
    errors.name = 'Full name is required';
  }

  if (!fields.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!fields.password) {
    errors.password = 'Password is required';
  } else if (tab === 'signup' && fields.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (tab === 'signup') {
    if (!fields.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (fields.password !== fields.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!fields.terms) {
      errors.terms = 'You must accept the terms to continue';
    }

    if (!fields.role) {
      errors.role = 'Please select your role';
    }
  }

  return errors;
}

export function AuthPage({ onLogin, onBack }: AuthPageProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [specialization, setSpecialization] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Google OAuth removed for this simplified build — keep flags false
  const isGoogleFlow = false;
  const googleChecking = false;

  const switchTab = (t: AuthTab) => {
    setTab(t);
    setErrors({});
    setSubmitted(false);
    setForgotSent(false);
    setApiError('');
    setSpecialization('');
    setQualifications('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitted(true);
    setApiError('');

    const errs = validate(tab, {
      name,
      email,
      password,
      confirmPassword,
      role,
      terms,
    });

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      setStatusMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      if (tab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          setApiError(data.error || 'Invalid email or password.');
          return;
        }

        const serverRole = (
          data.user?.role as string || ''
        ).toLowerCase() as Role;

        setStatusMessage('Signed in successfully. Redirecting…');
        onLogin(serverRole);
      } else {
        if (!role) {
          setApiError('Please select a role to continue.');
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role: role.toUpperCase(),
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          setApiError(
            data.error || 'Registration failed. Please try again.'
          );
          return;
        }

        const serverRole = (
          data.user?.role as string || ''
        ).toLowerCase() as Role;

        setStatusMessage(
          'Account created successfully. Redirecting…'
        );

        onLogin(serverRole);
      }
    } catch {
      setApiError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p
        className="flex items-center gap-1 mt-1"
        style={{
          color: '#EF4444',
          fontSize: '0.75rem',
        }}
      >
        <AlertCircle className="w-3 h-3 shrink-0" />
        {msg}
      </p>
    ) : null;

  const inputStyle = (
    field: keyof FormErrors
  ): React.CSSProperties => ({
    borderColor:
      submitted && errors[field]
        ? '#EF4444'
        : submitted && !errors[field]
        ? '#22C55E'
        : '#E5E7EB',
    backgroundColor:
      submitted && errors[field]
        ? '#FFF5F5'
        : 'white',
  });

  const stats = [
    {
      value: '50K+',
      label: 'Patient Records',
    },
    {
      value: '1.2K+',
      label: 'Verified Doctors',
    },
    {
      value: '500+',
      label: 'Pharmacies',
    },
    {
      value: '10M+',
      label: 'Prescriptions',
    },
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{
        backgroundColor: '#F8FAFC',
        fontFamily: '"Inter", "Poppins", sans-serif',
      }}
    >
      {/* Left panel — decorative, hidden on mobile */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden"
        style={{
          background:
            'linear-gradient(145deg, #1e3a8a 0%, #5b21b6 55%, #be185d 100%)',
        }}
      >
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            {
              w: 320,
              h: 320,
              top: '-10%',
              left: '-10%',
              opacity: 0.12,
            },
            {
              w: 240,
              h: 240,
              top: '40%',
              left: '60%',
              opacity: 0.1,
            },
            {
              w: 180,
              h: 180,
              top: '70%',
              left: '5%',
              opacity: 0.08,
            },
          ].map((b, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: b.w,
                height: b.h,
                top: b.top,
                left: b.left,
                opacity: b.opacity,
                filter: 'blur(40px)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-12"
            style={{
              fontSize: '0.875rem',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: '#FF6B6B',
              }}
            >
              <Heart className="w-5 h-5 text-white" />
            </div>

            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'white',
              }}
            >
              Medi
              <span style={{ color: '#FF6B6B' }}>
                Track
              </span>
            </span>
          </div>

          <h2
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              marginBottom: '1rem',
            }}
          >
            Healthcare operations,
            <br />
            managed securely.
          </h2>

          <p
            style={{
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.75,
              fontSize: '1rem',
              maxWidth: '340px',
            }}
          >
            Streamline prescription issuance, manage pharmacy
            orders, and oversee healthcare operations — all in
            one unified platform.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 p-10">
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl"
                style={{
                  backgroundColor:
                    'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <p
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: 'white',
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </p>

                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.65)',
                    marginTop: '0.25rem',
                  }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-8 flex items-center gap-3 p-4 rounded-2xl"
            style={{
              backgroundColor:
                'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: '#22C55E',
              }}
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </div>

            <div>
              <p
                style={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Government Approved Platform
              </p>

              <p
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.75rem',
                }}
              >
                HIPAA compliant · Data encrypted · Audit logged
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-12 overflow-y-auto">
        {/* Mobile back + logo */}
        <div className="lg:hidden mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
            style={{
              fontSize: '0.875rem',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: '#FF6B6B',
              }}
            >
              <Heart className="w-5 h-5 text-white" />
            </div>

            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
              }}
            >
              Medi
              <span style={{ color: '#FF6B6B' }}>
                Track
              </span>
            </span>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          {/* Tab switcher — hidden mid Google sign-up, there's nothing to switch between */}
          {!isGoogleFlow && (
            <div
              className="flex p-1 rounded-2xl mb-8"
              style={{
                backgroundColor: '#F1F5F9',
              }}
            >
              {(['login', 'signup'] as AuthTab[]).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className="flex-1 py-2.5 rounded-xl transition-all"
                    style={{
                      backgroundColor:
                        tab === t
                          ? 'white'
                          : 'transparent',
                      color:
                        tab === t
                          ? '#1A1A2E'
                          : '#6B7280',
                      fontWeight:
                        tab === t ? 700 : 500,
                      fontSize: '0.9rem',
                      boxShadow:
                        tab === t
                          ? '0 1px 4px rgba(0,0,0,0.08)'
                          : 'none',
                    }}
                  >
                    {t === 'login'
                      ? 'Log In'
                      : 'Sign Up'}
                  </button>
                )
              )}
            </div>
          )}

          {/* Heading */}
          <div className="mb-7">
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#1A1A2E',
                marginBottom: '0.375rem',
              }}
            >
              {tab === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h1>

            <p
              style={{
                color: '#6B7280',
                fontSize: '0.9rem',
              }}
            >
              {tab === 'login'
                ? 'Enter your credentials to access your dashboard.'
                : 'Join thousands of healthcare professionals on MediTrack.'}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4"
          >
            {/* Full Name — signup only, not needed in the Google flow */}
            {tab === 'signup' && !isGoogleFlow && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.375rem',
                  }}
                >
                  Full Name
                </label>

                <div className="relative">
                  <User
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{
                      color: '#9CA3AF',
                    }}
                  />

                  <Input
                    placeholder="Dr. Priya Sharma"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    className="pl-9"
                    style={inputStyle('name')}
                  />

                  {submitted &&
                    !errors.name &&
                    name && (
                      <CheckCircle className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                </div>

                <FieldError msg={errors.name} />
              </div>
            )}

            {/* Email */}
            {!isGoogleFlow && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.375rem',
                  }}
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{
                      color: '#9CA3AF',
                    }}
                  />

                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    className="pl-9"
                    style={inputStyle('email')}
                  />

                  {submitted &&
                    !errors.email &&
                    email && (
                      <CheckCircle className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                </div>

                <FieldError msg={errors.email} />
              </div>
            )}

            {/* Password */}
            {!isGoogleFlow && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Password
                  </label>

                  {tab === 'login' && (
                    <button
                      type="button"
                      style={{
                        fontSize: '0.775rem',
                        color: '#2563EB',
                        fontWeight: 500,
                      }}
                      onClick={async () => {
                        if (
                          !email ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                            email
                          )
                        ) {
                          setErrors((prev) => ({
                            ...prev,
                            email:
                              'Please enter a valid email address to reset password',
                          }));
                          return;
                        }

                        setErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));

                        try {
                          await fetch(
                            '/api/auth/reset-password',
                            {
                              method: 'POST',
                              headers: {
                                'Content-Type':
                                  'application/json',
                              },
                              body: JSON.stringify({
                                email,
                              }),
                            }
                          );

                          setForgotSent(true);
                        } catch (err) {
                          console.error(
                            'Failed to request password reset',
                            err
                          );
                        }
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {forgotSent && tab === 'login' && (
                  <div
                    className="mb-2 p-2 rounded-lg flex items-center gap-2"
                    style={{
                      backgroundColor: '#F0FDF4',
                    }}
                  >
                    <CheckCircle
                      className="w-3.5 h-3.5"
                      style={{
                        color: '#22C55E',
                      }}
                    />

                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#22C55E',
                      }}
                    >
                      Reset link sent to {email}!
                    </span>
                  </div>
                )}

                <div className="relative">
                  <Lock
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{
                      color: '#9CA3AF',
                    }}
                  />

                  <Input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder={
                      tab === 'signup'
                        ? 'Min. 8 characters'
                        : '••••••••'
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="pl-9 pr-10"
                    style={inputStyle('password')}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((v) => !v)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <FieldError msg={errors.password} />

                {tab === 'signup' && password && (
                  <div className="mt-1.5 flex gap-1">
                    {[8, 12, 16].map((len, i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-colors"
                        style={{
                          backgroundColor:
                            password.length >= len
                              ? [
                                  '#F59E0B',
                                  '#00B894',
                                  '#2563EB',
                                ][i]
                              : '#E5E7EB',
                        }}
                      />
                    ))}

                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: '#9CA3AF',
                        marginLeft: '4px',
                        alignSelf: 'center',
                      }}
                    >
                      {password.length < 8
                        ? 'Weak'
                        : password.length < 12
                        ? 'Fair'
                        : 'Strong'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password — signup only */}
            {tab === 'signup' && !isGoogleFlow && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.375rem',
                  }}
                >
                  Confirm Password
                </label>

                <div className="relative">
                  <Lock
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{
                      color: '#9CA3AF',
                    }}
                  />

                  <Input
                    type={
                      showConfirm
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    className="pl-9 pr-10"
                    style={inputStyle(
                      'confirmPassword'
                    )}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirm((v) => !v)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <FieldError
                  msg={errors.confirmPassword}
                />

                {submitted &&
                  !errors.confirmPassword &&
                  confirmPassword && (
                    <p
                      className="flex items-center gap-1 mt-1"
                      style={{
                        color: '#22C55E',
                        fontSize: '0.75rem',
                      }}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
              </div>
            )}

            {/* Role selector — signup only */}
            {tab === 'signup' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  I am a…
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor:
                          role === r.id
                            ? r.color
                            : '#E5E7EB',
                        backgroundColor:
                          role === r.id
                            ? r.bg
                            : 'white',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor:
                            role === r.id
                              ? r.color
                              : '#F3F4F6',
                        }}
                      >
                        <r.icon
                          className="w-3.5 h-3.5"
                          style={{
                            color:
                              role === r.id
                                ? 'white'
                                : '#9CA3AF',
                          }}
                        />
                      </div>

                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color:
                            role === r.id
                              ? r.color
                              : '#374151',
                        }}
                      >
                        {r.label}
                      </span>

                      {role === r.id && (
                        <CheckCircle
                          className="w-3.5 h-3.5 ml-auto shrink-0"
                          style={{
                            color: r.color,
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                <FieldError msg={errors.role} />
              </div>
            )}

            {/* Terms — signup only */}
            {tab === 'signup' && (
              <div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <div
                    className="mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      borderColor: terms
                        ? '#2563EB'
                        : errors.terms
                        ? '#EF4444'
                        : '#D1D5DB',
                      backgroundColor: terms
                        ? '#2563EB'
                        : 'white',
                    }}
                    onClick={() =>
                      setTerms((v) => !v)
                    }
                  >
                    {terms && (
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: '#6B7280',
                      lineHeight: 1.5,
                    }}
                  >
                    I agree to the{' '}
                    <span
                      style={{
                        color: '#2563EB',
                        fontWeight: 600,
                      }}
                    >
                      Terms of Service
                    </span>
                    {' '}and{' '}
                    <span
                      style={{
                        color: '#2563EB',
                        fontWeight: 600,
                      }}
                    >
                      Privacy Policy
                    </span>
                  </span>
                </label>

                <FieldError msg={errors.terms} />
              </div>
            )}

            {/* API Error */}
            {apiError && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{
                  backgroundColor: '#FFF5F5',
                  border: '1px solid #FCA5A5',
                }}
              >
                <AlertCircle
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: '#EF4444',
                  }}
                />

                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#EF4444',
                  }}
                >
                  {apiError}
                </p>
              </div>
            )}

            {statusMessage && (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor:
                    statusMessage
                      .toLowerCase()
                      .includes('success')
                      ? '#BBF7D0'
                      : '#FECACA',
                  backgroundColor:
                    statusMessage
                      .toLowerCase()
                      .includes('success')
                      ? '#F0FDF4'
                      : '#FEF2F2',
                  color:
                    statusMessage
                      .toLowerCase()
                      .includes('success')
                      ? '#166534'
                      : '#991B1B',
                }}
              >
                {statusMessage}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-white mt-2"
              disabled={loading}
              style={{
                background:
                  'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                fontSize: '0.95rem',
                fontWeight: 700,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? 'Please wait…'
                : tab === 'login'
                ? 'Log In to Dashboard'
                : 'Create My Account'}

              {!loading && (
                <ChevronRight className="w-4 h-4 ml-1" />
              )}
            </Button>
          </form>

          <p
            className="text-center mt-6"
            style={{
              fontSize: '0.875rem',
              color: '#6B7280',
            }}
          >
            {tab === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}

            <button
              onClick={() =>
                switchTab(
                  tab === 'login'
                    ? 'signup'
                    : 'login'
                )
              }
              style={{
                color: '#2563EB',
                fontWeight: 700,
              }}
            >
              {tab === 'login'
                ? 'Sign Up'
                : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}