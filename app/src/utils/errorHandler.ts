import toast from 'react-hot-toast';

export function handleServiceError(error: any, context: string) {
  console.error(`[Service Error - ${context}]`, error);
  const message = error?.message || 'An unexpected error occurred';
  toast.error(`${context}: ${message}`);
}

