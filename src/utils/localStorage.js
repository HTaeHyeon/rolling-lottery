/**
 * localStorage 유틸리티 함수들
 * 안전한 데이터 저장, 로드, 삭제 기능을 제공합니다.
 */

import { createLogger } from "./logger";

// localStorage 전용 로거 생성
const storageLogger = createLogger("Storage");

// 전역 오류 알림 이벤트 디스패처
const dispatchPersistenceError = (message, type = "error") => {
  window.dispatchEvent(
    new CustomEvent("persistenceError", {
      detail: { message, type },
    })
  );
};

/**
 * 데이터를 localStorage에 저장합니다.
 * @param {string} key - 저장할 키
 * @param {any} data - 저장할 데이터 (JSON 직렬화 가능한 객체)
 * @returns {boolean} - 저장 성공 여부
 */
export const saveToLocalStorage = (key, data) => {
  storageLogger.debug("Attempting to save data", {
    key,
    dataType: typeof data,
  });

  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);

    storageLogger.info("Data saved successfully", {
      key,
      size: serializedData.length + " bytes",
    });

    return true;
  } catch (error) {
    storageLogger.error("Failed to save data to localStorage", { key }, error);

    // localStorage 할당량 초과 오류 처리
    if (error.name === "QuotaExceededError") {
      storageLogger.warn("localStorage quota exceeded", { key });
      dispatchPersistenceError(
        "저장 공간이 부족합니다. 데이터 관리에서 불필요한 데이터를 정리해주세요.",
        "warning"
      );
    } else if (error.name === "SecurityError") {
      storageLogger.error("Security error while saving", { key }, error);
      dispatchPersistenceError(
        "브라우저 보안 설정으로 인해 데이터를 저장할 수 없습니다.",
        "error"
      );
    } else {
      storageLogger.error("Unknown error while saving", { key }, error);
      dispatchPersistenceError(
        "데이터 저장 중 오류가 발생했습니다. 브라우저를 새로고침해주세요.",
        "error"
      );
    }

    return false;
  }
};

/**
 * localStorage에서 데이터를 로드합니다.
 * @param {string} key - 로드할 키
 * @param {any} defaultValue - 데이터가 없을 때 반환할 기본값
 * @returns {any} - 로드된 데이터 또는 기본값
 */
export const loadFromLocalStorage = (key, defaultValue = null) => {
  storageLogger.debug("Attempting to load data", { key });

  try {
    const serializedData = localStorage.getItem(key);

    if (serializedData === null) {
      storageLogger.debug("No data found for key, returning default", { key });
      return defaultValue;
    }

    const data = JSON.parse(serializedData);
    storageLogger.info("Data loaded successfully", {
      key,
      dataType: typeof data,
      size: serializedData.length + " bytes",
    });

    return data;
  } catch (error) {
    storageLogger.error(
      "Failed to load data from localStorage",
      { key },
      error
    );

    if (error instanceof SyntaxError) {
      storageLogger.warn("Corrupted data detected", { key });
      dispatchPersistenceError(
        `저장된 데이터가 손상되었습니다 (${key}). 기본값을 사용합니다.`,
        "warning"
      );
    } else {
      storageLogger.error("Unknown error while loading", { key }, error);
      dispatchPersistenceError(
        "저장된 데이터를 불러오는 중 오류가 발생했습니다.",
        "error"
      );
    }

    return defaultValue;
  }
};

/**
 * localStorage에서 특정 키의 데이터를 삭제합니다.
 * @param {string} key - 삭제할 키
 * @returns {boolean} - 삭제 성공 여부
 */
export const clearLocalStorage = (key) => {
  storageLogger.debug("Attempting to clear data", { key });

  try {
    localStorage.removeItem(key);
    storageLogger.info("Data cleared successfully", { key });
    return true;
  } catch (error) {
    storageLogger.error("Failed to clear localStorage key", { key }, error);
    dispatchPersistenceError("데이터 삭제 중 오류가 발생했습니다.", "error");
    return false;
  }
};

/**
 * localStorage에 특정 키가 존재하는지 확인합니다.
 * @param {string} key - 확인할 키
 * @returns {boolean} - 키 존재 여부
 */
export const hasKeyInLocalStorage = (key) => {
  try {
    const exists = localStorage.getItem(key) !== null;
    storageLogger.debug("Key existence check", { key, exists });
    return exists;
  } catch (error) {
    storageLogger.error("Failed to check localStorage key", { key }, error);
    return false;
  }
};

/**
 * localStorage의 모든 데이터를 삭제합니다.
 * @returns {boolean} - 삭제 성공 여부
 */
export const clearAllLocalStorage = () => {
  storageLogger.warn("Attempting to clear all localStorage data");

  try {
    localStorage.clear();
    storageLogger.info("All localStorage data cleared successfully");
    return true;
  } catch (error) {
    storageLogger.error("Failed to clear all localStorage data", {}, error);
    dispatchPersistenceError(
      "모든 데이터 삭제 중 오류가 발생했습니다.",
      "error"
    );
    return false;
  }
};

/**
 * localStorage 사용 가능 여부를 확인합니다.
 * @returns {boolean} - localStorage 사용 가능 여부
 */
export const isLocalStorageAvailable = () => {
  try {
    const testKey = "__test__";
    const testValue = "test";
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    const isAvailable = retrieved === testValue;
    storageLogger.info("localStorage availability check", { isAvailable });

    return isAvailable;
  } catch (error) {
    storageLogger.warn("localStorage is not available", {}, error);
    dispatchPersistenceError(
      "브라우저에서 로컬 저장소를 사용할 수 없습니다. 설정이 저장되지 않을 수 있습니다.",
      "warning"
    );
    return false;
  }
};

/**
 * localStorage의 사용량 정보를 가져옵니다.
 * @returns {object} - 사용량 정보 객체
 */
export const getLocalStorageUsage = () => {
  if (!isLocalStorageAvailable()) {
    return { used: 0, available: 0, percentage: 0 };
  }

  try {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage.getItem(key).length + key.length;
      }
    }

    // 대략적인 localStorage 한계 (보통 5-10MB)
    const estimated_limit = 5 * 1024 * 1024; // 5MB
    const percentage = (used / estimated_limit) * 100;

    const usage = {
      used: used,
      available: estimated_limit - used,
      percentage: Math.round(percentage * 100) / 100,
    };

    storageLogger.debug("localStorage usage calculated", usage);

    return usage;
  } catch (error) {
    storageLogger.error("Failed to calculate localStorage usage", {}, error);
    return { used: 0, available: 0, percentage: 0 };
  }
};

// 앱에서 사용할 저장소 키 상수들
export const STORAGE_KEYS = {
  SETTINGS: "rolling_lottery_settings",
  DRAW_HISTORY: "rolling_lottery_history",
  APP_VERSION: "rolling_lottery_version",
};

// 초기화 로그
storageLogger.info("localStorage utilities initialized", {
  isAvailable: isLocalStorageAvailable(),
  usage: getLocalStorageUsage(),
});
