/**
 * 데이터 마이그레이션 유틸리티
 * 버전 간 데이터 구조 변경을 안전하게 처리합니다.
 */

import {
  saveToLocalStorage,
  loadFromLocalStorage,
  STORAGE_KEYS,
} from "./localStorage";

// 현재 앱 버전
export const CURRENT_VERSION = "1.0.0";

// 버전별 마이그레이션 함수들
const migrations = {
  // 예시: 1.0.0에서 1.1.0으로 마이그레이션
  "1.1.0": (data) => {
    console.log("Migrating to version 1.1.0");
    // 새로운 필드 추가 등의 작업
    if (data.settings && !data.settings.theme) {
      data.settings.theme = "default";
    }
    return data;
  },

  // 예시: 1.1.0에서 1.2.0으로 마이그레이션
  "1.2.0": (data) => {
    console.log("Migrating to version 1.2.0");
    // 데이터 구조 변경 등의 작업
    if (data.drawHistory && Array.isArray(data.drawHistory)) {
      data.drawHistory = data.drawHistory.map((record) => ({
        ...record,
        version: "1.2.0",
      }));
    }
    return data;
  },
};

/**
 * 버전 문자열을 비교 가능한 숫자 배열로 변환
 * @param {string} version - 버전 문자열 (예: "1.2.3")
 * @returns {number[]} - 숫자 배열 (예: [1, 2, 3])
 */
const parseVersion = (version) => {
  return version.split(".").map((num) => parseInt(num, 10));
};

/**
 * 두 버전을 비교합니다
 * @param {string} version1 - 첫 번째 버전
 * @param {string} version2 - 두 번째 버전
 * @returns {number} - -1, 0, 1 (version1 < version2, version1 === version2, version1 > version2)
 */
const compareVersions = (version1, version2) => {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  return 0;
};

/**
 * 데이터를 현재 버전으로 마이그레이션합니다
 * @param {object} data - 마이그레이션할 데이터
 * @param {string} fromVersion - 현재 데이터 버전
 * @returns {object} - 마이그레이션된 데이터
 */
const migrateData = (data, fromVersion) => {
  let currentData = { ...data };
  let currentVersion = fromVersion;

  // 마이그레이션이 필요한 버전들을 순서대로 정렬
  const availableVersions = Object.keys(migrations).sort(compareVersions);

  for (const targetVersion of availableVersions) {
    // 현재 버전보다 높은 버전에 대해서만 마이그레이션 수행
    if (compareVersions(currentVersion, targetVersion) < 0) {
      try {
        console.log(`Migrating from ${currentVersion} to ${targetVersion}`);
        currentData = migrations[targetVersion](currentData);
        currentVersion = targetVersion;
      } catch (error) {
        console.error(`Migration to ${targetVersion} failed:`, error);
        throw new Error(
          `Migration to ${targetVersion} failed: ${error.message}`
        );
      }
    }
  }

  // 최종 버전 정보 업데이트
  currentData.version = CURRENT_VERSION;
  currentData.lastMigrated = new Date().toISOString();

  return currentData;
};

/**
 * 설정 데이터를 마이그레이션합니다
 * @returns {object|null} - 마이그레이션된 설정 데이터 또는 null
 */
export const migrateSettings = () => {
  try {
    const savedSettings = loadFromLocalStorage(STORAGE_KEYS.SETTINGS);

    if (!savedSettings) {
      console.log("No settings found, using defaults");
      return null;
    }

    const dataVersion = savedSettings.version || "1.0.0";

    // 현재 버전과 같거나 높은 경우 마이그레이션 불필요
    if (compareVersions(dataVersion, CURRENT_VERSION) >= 0) {
      console.log("Settings are up to date");
      return savedSettings;
    }

    console.log(
      `Settings migration needed: ${dataVersion} -> ${CURRENT_VERSION}`
    );
    const migratedData = migrateData(savedSettings, dataVersion);

    // 마이그레이션된 데이터 저장
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, migratedData);
    console.log("Settings migration completed");

    return migratedData;
  } catch (error) {
    console.error("Settings migration failed:", error);
    return null;
  }
};

/**
 * 추첨 기록 데이터를 마이그레이션합니다
 * @returns {array} - 마이그레이션된 추첨 기록 배열
 */
export const migrateDrawHistory = () => {
  try {
    const savedHistory = loadFromLocalStorage(STORAGE_KEYS.DRAW_HISTORY, []);

    if (!Array.isArray(savedHistory) || savedHistory.length === 0) {
      console.log("No draw history found");
      return [];
    }

    // 기록 데이터에 버전 정보가 없는 경우 1.0.0으로 간주
    const historyVersion = savedHistory[0]?.version || "1.0.0";

    // 현재 버전과 같거나 높은 경우 마이그레이션 불필요
    if (compareVersions(historyVersion, CURRENT_VERSION) >= 0) {
      console.log("Draw history is up to date");
      return savedHistory;
    }

    console.log(
      `Draw history migration needed: ${historyVersion} -> ${CURRENT_VERSION}`
    );

    // 각 기록 항목에 대해 마이그레이션 수행
    const migratedHistory = savedHistory.map((record) => {
      const recordVersion = record.version || "1.0.0";
      return migrateData(record, recordVersion);
    });

    // 마이그레이션된 데이터 저장
    saveToLocalStorage(STORAGE_KEYS.DRAW_HISTORY, migratedHistory);
    console.log("Draw history migration completed");

    return migratedHistory;
  } catch (error) {
    console.error("Draw history migration failed:", error);
    return [];
  }
};

/**
 * 모든 저장된 데이터를 마이그레이션합니다
 * @returns {object} - 마이그레이션 결과
 */
export const migrateAllData = () => {
  console.log("Starting data migration process");

  const results = {
    settings: null,
    drawHistory: [],
    errors: [],
  };

  try {
    results.settings = migrateSettings();
  } catch (error) {
    console.error("Settings migration error:", error);
    results.errors.push(`Settings: ${error.message}`);
  }

  try {
    results.drawHistory = migrateDrawHistory();
  } catch (error) {
    console.error("Draw history migration error:", error);
    results.errors.push(`Draw History: ${error.message}`);
  }

  // 버전 정보 저장
  saveToLocalStorage(STORAGE_KEYS.APP_VERSION, {
    version: CURRENT_VERSION,
    migrationDate: new Date().toISOString(),
    migrationErrors: results.errors,
  });

  console.log("Data migration process completed");
  return results;
};

/**
 * 데이터 무결성을 검사합니다
 * @returns {object} - 검사 결과
 */
export const validateDataIntegrity = () => {
  const results = {
    settings: { valid: false, issues: [] },
    drawHistory: { valid: false, issues: [] },
    overall: { valid: false, errors: 0 },
  };

  try {
    // 설정 데이터 검사
    const settings = loadFromLocalStorage(STORAGE_KEYS.SETTINGS);
    if (settings) {
      if (!settings.version) {
        results.settings.issues.push("Missing version information");
      }
      if (!settings.appearance || typeof settings.appearance !== "object") {
        results.settings.issues.push("Invalid appearance settings");
      }
      if (!Array.isArray(settings.prizes)) {
        results.settings.issues.push("Invalid prizes array");
      }
      if (!Array.isArray(settings.participants)) {
        results.settings.issues.push("Invalid participants array");
      }

      results.settings.valid = results.settings.issues.length === 0;
    }

    // 추첨 기록 검사
    const drawHistory = loadFromLocalStorage(STORAGE_KEYS.DRAW_HISTORY, []);
    if (Array.isArray(drawHistory)) {
      drawHistory.forEach((record, index) => {
        if (!record.id) {
          results.drawHistory.issues.push(`Record ${index}: Missing ID`);
        }
        if (!record.timestamp) {
          results.drawHistory.issues.push(`Record ${index}: Missing timestamp`);
        }
        if (!record.winner) {
          results.drawHistory.issues.push(`Record ${index}: Missing winner`);
        }
        if (!record.prize) {
          results.drawHistory.issues.push(`Record ${index}: Missing prize`);
        }
      });

      results.drawHistory.valid = results.drawHistory.issues.length === 0;
    }

    // 전체 검사 결과
    results.overall.errors =
      results.settings.issues.length + results.drawHistory.issues.length;
    results.overall.valid = results.overall.errors === 0;
  } catch (error) {
    results.overall.errors++;
    results.overall.valid = false;
    console.error("Data integrity validation failed:", error);
  }

  return results;
};

/**
 * 손상된 데이터를 복구합니다
 * @returns {boolean} - 복구 성공 여부
 */
export const repairCorruptedData = () => {
  try {
    const validation = validateDataIntegrity();

    if (validation.overall.valid) {
      console.log("No data corruption detected");
      return true;
    }

    console.log("Attempting to repair corrupted data");

    // 설정 데이터 복구
    if (!validation.settings.valid) {
      const defaultSettings = {
        prizes: [],
        participants: [],
        appearance: {
          bgColor: "#1a1a2e",
          textColor: "#ffffff",
          accentColor: "#0f3460",
          winMessage: "🎉 축하합니다! 🎉",
        },
        version: CURRENT_VERSION,
        lastUpdated: new Date().toISOString(),
      };

      saveToLocalStorage(STORAGE_KEYS.SETTINGS, defaultSettings);
      console.log("Settings data repaired with defaults");
    }

    // 추첨 기록 복구 (손상된 기록 제거)
    if (!validation.drawHistory.valid) {
      const drawHistory = loadFromLocalStorage(STORAGE_KEYS.DRAW_HISTORY, []);
      const cleanHistory = drawHistory.filter(
        (record) =>
          record.id && record.timestamp && record.winner && record.prize
      );

      saveToLocalStorage(STORAGE_KEYS.DRAW_HISTORY, cleanHistory);
      console.log(
        `Draw history repaired: ${drawHistory.length - cleanHistory.length} corrupted records removed`
      );
    }

    return true;
  } catch (error) {
    console.error("Data repair failed:", error);
    return false;
  }
};
