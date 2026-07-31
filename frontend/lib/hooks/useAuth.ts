import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { LoginInput, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validations/auth.schema';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, extractZodErrors, extractApiErrors } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';

/**
 * Custom hook for user login.
 * Wraps AuthService.loginWithCredentials and automatically updates the auth store.
 */
export function useLogin() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (credentials: LoginInput) => AuthService.loginWithCredentials(credentials),
    onSuccess: async () => {
      // Re-hydrate auth store session details after a successful login
      await useAuthStore.getState().hydrate();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'login'));
    },
  });
}

/**
 * Custom hook for logging out.
 * Destroys the session on the backend and resets the store client-side.
 */
export function useLogout() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => {
      useAuthStore.getState().clear();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t as any, 'login'));
    },
  });
}

/**
 * Custom hook for password recovery flow initiation.
 */
export function useForgotPassword() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (email: string) => AuthService.forgotPassword(email),
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'login'));
    },
  });
}

/**
 * Custom hook for verifying OTP reset code.
 */
export function useVerifyResetCode() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: { email: string; code: string }) =>
      AuthService.verifyResetCode(data.email, data.code),
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'login'));
    },
  });
}

/**
 * Custom hook for resetting the password using verified credentials and code.
 */
export function useResetPassword() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: { email: string; code: string; newPassword: string }) =>
      AuthService.resetPassword(data),
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'login'));
    },
  });
}

/**
 * Container Hook for the Login form UI.
 * Manages state, validation, errors, and redirects for LoginPage.
 */
export function useLoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    if (hydrated && user) {
      router.push('/');
    }
  }, [hydrated, user, router]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const loginMutation = useLogin();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = loginSchema.safeParse({ username, password, rememberMe });
    if (!validation.success) {
      setFieldErrors(extractZodErrors(validation.error, t as any, 'login.errors'));
      return;
    }
    setFieldErrors({});

    loginMutation.mutate(validation.data, {
      onSuccess: () => {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.details && err.details.length > 0) {
            const backendFieldErrors = extractApiErrors(err, t, 'login.errors');
            if (Object.keys(backendFieldErrors).length > 0) {
              setFieldErrors(backendFieldErrors);
            }
            if (err.slug === 'VALIDATION_ERROR') {
              return;
            }
          }
          setError(t.login.errors[err.slug.toLowerCase() as keyof typeof t.login.errors] || err.message);
        } else {
          setError(getErrorMessage(err, t, 'login'));
        }
      }
    });
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    error,
    fieldErrors,
    isSuccess,
    isLoading: loginMutation.isPending,
    handleLogin,
  };
}

/**
 * Container Hook for the ForgotPassword form UI.
 * Manages steps, OTP entry, verification state, strength indicators, and redirects.
 */
export function useForgotPasswordForm() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'code' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isCodeComplete, setIsCodeComplete] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const forgotPasswordMutation = useForgotPassword();
  const verifyResetCodeMutation = useVerifyResetCode();
  const resetPasswordMutation = useResetPassword();

  const isLoading =
    forgotPasswordMutation.isPending ||
    verifyResetCodeMutation.isPending ||
    resetPasswordMutation.isPending;

  const verifyCode = (codeStr: string) => {
    setError('');
    verifyResetCodeMutation.mutate({ email, code: codeStr }, {
      onSuccess: () => {
        setIsCodeComplete(true);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err, t, 'forgotpassword'));
        setIsCodeComplete(false);
      }
    });
  };

  const handleCodeChange = async (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...codeDigits];
    newCode[index] = value;
    setCodeDigits(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      verifyCode(fullCode);
    } else {
      setIsCodeComplete(false);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newCode = [...codeDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCodeDigits(newCode);

    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
      verifyCode(pastedData);
    } else {
      inputRefs.current[pastedData.length]?.focus();
      setIsCodeComplete(false);
    }
  };

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = checkPasswordStrength(newPassword);

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return '';
    if (strengthScore <= 2) return t.forgotpassword.weak;
    if (strengthScore <= 4) return t.forgotpassword.medium;
    return t.forgotpassword.strong;
  };

  const getStrengthColor = () => {
    if (strengthScore <= 2) return 'bg-destructive';
    if (strengthScore <= 4) return 'bg-[#f59e0b]';
    return 'bg-[#10b981]';
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setFieldErrors(extractZodErrors(validation.error, t, 'forgotpassword.errors'));
      return;
    }

    forgotPasswordMutation.mutate(validation.data.email, {
      onSuccess: () => {
        setStep('code');
        setResendTimer(60);
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.details && err.details.length > 0) {
            const backendFieldErrors = extractApiErrors(err, t, 'forgotpassword.errors');
            if (Object.keys(backendFieldErrors).length > 0) setFieldErrors(backendFieldErrors);
            if (err.slug === 'VALIDATION_ERROR') {
              return;
            }
          }
          setError(t.forgotpassword.errors[err.slug.toLowerCase() as keyof typeof t.forgotpassword.errors] || err.message);
        } else {
          setError(getErrorMessage(err, t, 'forgotpassword'));
        }
      }
    });
  };

  const handleResendCode = () => {
    if (resendTimer > 0) return;
    setError('');
    forgotPasswordMutation.mutate(email, {
      onSuccess: () => {
        setResendTimer(60);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err, t, 'forgotpassword'));
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: t.forgotpassword.passwords_not_match });
      return;
    }

    const code = codeDigits.join('');
    const validation = resetPasswordSchema.safeParse({ email, code, newPassword });
    if (!validation.success) {
      setFieldErrors(extractZodErrors(validation.error, t, 'forgotpassword.errors'));
      return;
    }

    resetPasswordMutation.mutate(validation.data, {
      onSuccess: () => {
        setIsSuccess(true);
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.details && err.details.length > 0) {
            const backendFieldErrors = extractApiErrors(err, t, 'forgotpassword.errors');
            if (Object.keys(backendFieldErrors).length > 0) setFieldErrors(backendFieldErrors);
            if (err.slug === 'VALIDATION_ERROR') {
              return;
            }
          }
          setError(t.forgotpassword.errors[err.slug.toLowerCase() as keyof typeof t.forgotpassword.errors] || err.message);
        } else {
          setError(getErrorMessage(err, t, 'forgotpassword'));
        }
      }
    });
  };

  return {
    step,
    setStep,
    email,
    setEmail,
    resendTimer,
    codeDigits,
    inputRefs,
    isCodeComplete,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    error,
    fieldErrors,
    isSuccess,
    isLoading,
    handleForgotPassword,
    handleResendCode,
    handleResetPassword,
    handleCodeChange,
    handleCodeKeyDown,
    handleCodePaste,
    strengthScore,
    getStrengthLabel,
    getStrengthColor,
  };
}
