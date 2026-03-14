import { AxiosError } from 'axios';
import Toast from 'react-native-toast-message';

export function useApiError() {
  const handleError = (error: unknown, fallback = 'Something went wrong') => {
    if (error instanceof AxiosError) {
      const data = error.response?.data;

      // Django validation errors come as {errors: {field: [msg]}}
      if (data?.errors && typeof data.errors === 'object') {
        const firstField = Object.keys(data.errors)[0];
        const messages = data.errors[firstField];
        const msg = Array.isArray(messages) ? messages[0] : messages;
        Toast.show({ type: 'error', text1: 'Error', text2: msg });
        return msg;
      }

      // Generic message
      const msg = data?.message || fallback;
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
      return msg;
    }

    Toast.show({ type: 'error', text1: 'Error', text2: fallback });
    return fallback;
  };

  return { handleError };
}
