import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StatusType = 'loading' | 'success' | 'error';

interface StatusBannerProps {
  status: StatusType;
  message: string;
}

export function StatusBanner({ status, message }: StatusBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    
    // Auto-hide success messages after 3 seconds
    if (status === 'success') {
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
    
    // Auto-hide error messages after 10 seconds
    if (status === 'error') {
      const timer = setTimeout(() => setVisible(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [status, message]);

  if (!visible) return null;

  const variants = {
    loading: {
      variant: 'default',
      icon: (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ),
      title: 'Loading',
    },
    success: {
      variant: 'default',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
      title: 'Success',
    },
    error: {
      variant: 'destructive',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
      title: 'Error',
    },
  };

  const { icon, title, variant } = variants[status];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert variant={variant as any}>
        <div className="flex items-center gap-2">
          {icon}
          <AlertTitle>{title}</AlertTitle>
        </div>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}