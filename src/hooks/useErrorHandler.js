import { useCallback, useState } from "react";
import {
  handleApiError,
  handlePromise,
  safeExecute,
  retryExecute,
} from "../utils/errorHandler";

/**
 * 컴포넌트 레벨에서 오류를 처리하는 커스텀 훅
 * @param {Object} options - 훅 설정 옵션
 * @param {string} options.context - 오류 컨텍스트 (예: 'prize_management', 'participant_list')
 * @param {boolean} options.showNotifications - 알림 자동 표시 여부 (기본: true)
 * @returns {Object} 오류 처리 관련 함수들과 상태
 */
export const useErrorHandler = (options = {}) => {
  const { context = "component", showNotifications = true } = options;

  // 컴포넌트별 오류 상태 관리
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  /**
   * 단순 오류 처리
   */
  const handleError = useCallback(
    (error, customOptions = {}) => {
      const errorInfo = handleApiError(error, {
        context,
        showNotification: showNotifications,
        ...customOptions,
      });

      // 컴포넌트 오류 상태 업데이트
      setErrors((prev) => [...prev, errorInfo]);
      setHasError(true);

      return errorInfo;
    },
    [context, showNotifications]
  );

  /**
   * Promise를 안전하게 실행하고 로딩 상태를 관리
   */
  const executeAsync = useCallback(
    async (asyncFunction, customOptions = {}) => {
      setIsLoading(true);
      setHasError(false);

      try {
        const result = await handlePromise(asyncFunction, {
          context,
          showNotification: showNotifications,
          ...customOptions,
        });

        if (!result.success) {
          setErrors((prev) => [...prev, result.error]);
          setHasError(true);
        }

        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [context, showNotifications]
  );

  /**
   * 함수를 안전하게 실행 (동기/비동기 모두 지원)
   */
  const executeSafe = useCallback(
    (fn, customOptions = {}) => {
      const safeFn = safeExecute(fn, {
        context,
        showNotification: showNotifications,
        ...customOptions,
      });

      return async (...args) => {
        setIsLoading(true);
        setHasError(false);

        try {
          const result = await safeFn(...args);

          if (!result.success) {
            setErrors((prev) => [...prev, result.error]);
            setHasError(true);
          }

          return result;
        } finally {
          setIsLoading(false);
        }
      };
    },
    [context, showNotifications]
  );

  /**
   * 재시도 로직과 함께 함수 실행
   */
  const executeWithRetry = useCallback(
    async (fn, retryOptions = {}) => {
      setIsLoading(true);
      setHasError(false);

      try {
        const result = await retryExecute(fn, {
          context,
          ...retryOptions,
        });

        if (!result.success) {
          setErrors((prev) => [...prev, result.error]);
          setHasError(true);
        }

        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [context]
  );

  /**
   * 특정 오류 제거
   */
  const removeError = useCallback(
    (errorIndex) => {
      setErrors((prev) => prev.filter((_, index) => index !== errorIndex));
      setHasError(errors.length > 1);
    },
    [errors.length]
  );

  /**
   * 모든 오류 초기화
   */
  const clearErrors = useCallback(() => {
    setErrors([]);
    setHasError(false);
  }, []);

  /**
   * 마지막 오류 정보 가져오기
   */
  const getLastError = useCallback(() => {
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }, [errors]);

  /**
   * 특정 타입의 오류만 필터링
   */
  const getErrorsByType = useCallback(
    (type) => {
      return errors.filter((error) => error.type === type);
    },
    [errors]
  );

  return {
    // 상태
    errors,
    isLoading,
    hasError,

    // 오류 처리 함수들
    handleError,
    executeAsync,
    executeSafe,
    executeWithRetry,

    // 오류 관리 함수들
    removeError,
    clearErrors,
    getLastError,
    getErrorsByType,

    // 편의 함수들
    errorCount: errors.length,
    lastError: getLastError(),
    hasErrorOfType: (type) => getErrorsByType(type).length > 0,
  };
};

/**
 * API 호출 전용 오류 처리 훅
 * @param {Object} options - 설정 옵션
 * @returns {Object} API 호출 관련 함수들과 상태
 */
export const useApiErrorHandler = (options = {}) => {
  const errorHandler = useErrorHandler({
    context: "api_call",
    ...options,
  });

  /**
   * Fetch API 래퍼
   */
  const fetchWithErrorHandling = useCallback(
    async (url, fetchOptions = {}) => {
      return errorHandler.executeAsync(async () => {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const error = new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
          error.response = {
            status: response.status,
            statusText: response.statusText,
          };
          throw error;
        }

        return response.json();
      });
    },
    [errorHandler.executeAsync]
  );

  /**
   * JSON 파일 로드
   */
  const loadJsonFile = useCallback(
    async (file) => {
      return errorHandler.executeAsync(
        async () => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
              try {
                const jsonData = JSON.parse(e.target.result);
                resolve(jsonData);
              } catch (error) {
                reject(new Error("유효하지 않은 JSON 파일입니다."));
              }
            };

            reader.onerror = () => {
              reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
            };

            reader.readAsText(file);
          });
        },
        { context: "file_operation" }
      );
    },
    [errorHandler.executeAsync]
  );

  return {
    ...errorHandler,
    fetchWithErrorHandling,
    loadJsonFile,
  };
};

/**
 * 폼 관련 오류 처리 훅
 * @param {Object} options - 설정 옵션
 * @returns {Object} 폼 관련 함수들과 상태
 */
export const useFormErrorHandler = (options = {}) => {
  const errorHandler = useErrorHandler({
    context: "form_validation",
    showNotifications: false, // 폼 오류는 인라인으로 표시
    ...options,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * 필드별 오류 설정
   */
  const setFieldError = useCallback((fieldName, errorMessage) => {
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: errorMessage,
    }));
  }, []);

  /**
   * 필드 오류 제거
   */
  const clearFieldError = useCallback((fieldName) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * 모든 필드 오류 초기화
   */
  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  /**
   * 폼 제출 처리
   */
  const submitForm = useCallback(
    async (submitFunction, validationRules = {}) => {
      // 먼저 클라이언트 측 유효성 검사
      const validationErrors = {};

      Object.entries(validationRules).forEach(([fieldName, rules]) => {
        if (rules.required && !rules.value) {
          validationErrors[fieldName] =
            rules.message || `${fieldName}은(는) 필수입니다.`;
        }

        if (rules.validate && !rules.validate(rules.value)) {
          validationErrors[fieldName] =
            rules.message || `${fieldName}이(가) 유효하지 않습니다.`;
        }
      });

      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return { success: false, errors: validationErrors };
      }

      // 유효성 검사 통과 시 실제 제출
      clearAllFieldErrors();
      return errorHandler.executeAsync(submitFunction);
    },
    [errorHandler.executeAsync, clearAllFieldErrors]
  );

  return {
    ...errorHandler,
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    submitForm,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
  };
};

export default useErrorHandler;
