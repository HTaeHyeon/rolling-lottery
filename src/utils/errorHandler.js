/**
 * 전역 오류 처리 유틸리티
 * API 호출, 네트워크, 기타 비동기 작업에서 발생하는 오류를 처리합니다.
 */

// 전역 오류 알림 이벤트 디스패처 (기존 localStorage.js의 함수와 통합)
const dispatchError = (message, type = "error") => {
  window.dispatchEvent(
    new CustomEvent("persistenceError", {
      detail: { message, type },
    })
  );
};

/**
 * API 오류를 처리하고 사용자 친화적인 메시지를 생성합니다.
 * @param {Error} error - 처리할 오류 객체
 * @param {Object} options - 추가 옵션
 * @param {boolean} options.showNotification - 알림 표시 여부 (기본: true)
 * @param {string} options.context - 오류 발생 컨텍스트 (예: 'prize_loading', 'participant_saving')
 * @returns {Object} 처리된 오류 정보
 */
export const handleApiError = (error, options = {}) => {
  const { showNotification = true, context = "general" } = options;

  console.error("🚨 API Error:", error);

  let userMessage =
    "예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  let errorType = "error";

  // 네트워크 오류 감지
  if (!navigator.onLine) {
    userMessage = "인터넷 연결을 확인하고 다시 시도해주세요.";
    errorType = "warning";
  }
  // Fetch API 오류 처리
  else if (error instanceof TypeError && error.message.includes("fetch")) {
    userMessage = "서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.";
    errorType = "error";
  }
  // Axios 스타일 응답 오류 처리 (만약 사용할 경우)
  else if (error.response) {
    const status = error.response.status;

    if (status === 401 || status === 403) {
      userMessage = "권한이 없습니다. 로그인 상태를 확인해주세요.";
    } else if (status === 404) {
      userMessage = "요청한 리소스를 찾을 수 없습니다.";
    } else if (status === 429) {
      userMessage = "너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.";
      errorType = "warning";
    } else if (status >= 500) {
      userMessage =
        "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }
  }
  // 컨텍스트별 특별한 메시지
  else if (context === "localStorage") {
    userMessage =
      "데이터 저장 중 오류가 발생했습니다. 브라우저 저장 공간을 확인해주세요.";
    errorType = "warning";
  } else if (context === "file_operation") {
    userMessage = "파일 처리 중 오류가 발생했습니다. 파일 형식을 확인해주세요.";
  }

  // 알림 표시
  if (showNotification) {
    dispatchError(userMessage, errorType);
  }

  return {
    error,
    userMessage,
    type: errorType,
    context,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Promise rejection을 처리합니다.
 * @param {Promise} promise - 처리할 Promise
 * @param {Object} options - 오류 처리 옵션
 * @returns {Promise} 오류가 처리된 Promise
 */
export const handlePromise = async (promise, options = {}) => {
  try {
    const result = await promise;
    return { success: true, data: result, error: null };
  } catch (error) {
    const handledError = handleApiError(error, options);
    return { success: false, data: null, error: handledError };
  }
};

/**
 * 함수 실행을 안전하게 래핑합니다.
 * @param {Function} fn - 실행할 함수
 * @param {Object} options - 오류 처리 옵션
 * @returns {Function} 래핑된 함수
 */
export const safeExecute = (fn, options = {}) => {
  return async (...args) => {
    try {
      const result = await fn(...args);
      return { success: true, data: result, error: null };
    } catch (error) {
      const handledError = handleApiError(error, options);
      return { success: false, data: null, error: handledError };
    }
  };
};

/**
 * 재시도 로직이 있는 함수 실행
 * @param {Function} fn - 실행할 함수
 * @param {Object} options - 재시도 옵션
 * @param {number} options.maxRetries - 최대 재시도 횟수 (기본: 3)
 * @param {number} options.delay - 재시도 간격 ms (기본: 1000)
 * @param {Function} options.shouldRetry - 재시도 여부를 결정하는 함수
 * @returns {Promise} 실행 결과
 */
export const retryExecute = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    shouldRetry = (error) =>
      !navigator.onLine || error.message.includes("fetch"),
    context = "retry_operation",
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result, error: null };
    } catch (error) {
      lastError = error;

      // 마지막 시도이거나 재시도 조건에 맞지 않으면 오류 처리
      if (attempt === maxRetries || !shouldRetry(error)) {
        const handledError = handleApiError(error, { context });
        return { success: false, data: null, error: handledError };
      }

      // 재시도 전 대기
      if (attempt < maxRetries) {
        console.warn(
          `🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
};

/**
 * 여러 Promise를 병렬로 실행하고 실패한 것들을 처리합니다.
 * @param {Promise[]} promises - 실행할 Promise 배열
 * @param {Object} options - 오류 처리 옵션
 * @returns {Promise} 실행 결과 배열
 */
export const handleMultiplePromises = async (promises, options = {}) => {
  const { failFast = false, context = "batch_operation" } = options;

  if (failFast) {
    // 하나라도 실패하면 전체 실패
    try {
      const results = await Promise.all(promises);
      return { success: true, data: results, error: null };
    } catch (error) {
      const handledError = handleApiError(error, { context });
      return { success: false, data: null, error: handledError };
    }
  } else {
    // 각각 독립적으로 처리
    const results = await Promise.allSettled(promises);
    const successResults = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successResults.push({ index, data: result.value });
      } else {
        const handledError = handleApiError(result.reason, {
          context: `${context}_item_${index}`,
          showNotification: false, // 개별 알림은 표시하지 않음
        });
        errors.push({ index, error: handledError });
      }
    });

    // 오류가 있으면 전체 요약 알림 표시
    if (errors.length > 0) {
      const errorMessage = `${errors.length}개의 작업에서 오류가 발생했습니다.`;
      dispatchError(errorMessage, "warning");
    }

    return {
      success: errors.length === 0,
      data: successResults,
      errors: errors,
      summary: {
        total: results.length,
        successful: successResults.length,
        failed: errors.length,
      },
    };
  }
};

/**
 * 전역 unhandled promise rejection 핸들러 설정
 */
export const setupGlobalErrorHandlers = () => {
  // Unhandled Promise rejection 처리
  window.addEventListener("unhandledrejection", (event) => {
    console.error("🚨 Unhandled Promise Rejection:", event.reason);

    // 개발 모드에서는 자세한 정보 표시
    if (process.env.NODE_ENV === "development") {
      console.error("Promise:", event.promise);
      console.error("Reason:", event.reason);
    }

    // 사용자에게 일반적인 오류 메시지 표시
    handleApiError(event.reason, {
      context: "unhandled_promise",
      showNotification: true,
    });

    // 기본 처리 방지 (콘솔 에러 방지)
    event.preventDefault();
  });

  // 전역 오류 처리
  window.addEventListener("error", (event) => {
    console.error("🚨 Global Error:", event.error);

    // JavaScript 오류는 ErrorBoundary에서 처리되므로
    // 여기서는 다른 종류의 오류만 처리
    if (event.error && !event.error.stack) {
      handleApiError(event.error, {
        context: "global_error",
        showNotification: true,
      });
    }
  });

  console.log("✅ Global error handlers initialized");
};

/**
 * 네트워크 상태 변화 감지 및 처리
 */
export const setupNetworkMonitoring = () => {
  const handleOnline = () => {
    console.log("🌐 Network connection restored");
    dispatchError("네트워크 연결이 복구되었습니다.", "success");
  };

  const handleOffline = () => {
    console.warn("📡 Network connection lost");
    dispatchError(
      "네트워크 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.",
      "warning"
    );
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // 초기 네트워크 상태 확인
  if (!navigator.onLine) {
    handleOffline();
  }

  console.log("✅ Network monitoring initialized");
};

// 개발 모드에서 오류 처리 유틸리티 테스트 함수들
if (process.env.NODE_ENV === "development") {
  window.testErrorHandling = {
    // 테스트용 오류 발생 함수들
    throwError: () => {
      throw new Error("Test error");
    },
    throwPromiseError: () => Promise.reject(new Error("Test promise error")),
    testNetworkError: () => handleApiError(new TypeError("Failed to fetch")),
    testApiError: (status) => handleApiError({ response: { status } }),
  };
}
