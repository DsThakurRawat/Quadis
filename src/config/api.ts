// Quadis Hotels API Configuration
// Automatically detects local development vs AWS S3/CloudFront production environment

export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.origin.includes('localhost:517')
    ? 'http://localhost:3001/api'
    : '/api'
);

export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};
