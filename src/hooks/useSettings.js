import { useState, useEffect, useCallback } from "react";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  STORAGE_KEYS,
} from "../utils/localStorage";
import {
  migrateAllData,
  validateDataIntegrity,
  repairCorruptedData,
} from "../utils/dataMigration";

/**
 * 설정 데이터를 관리하고 localStorage에 자동으로 저장하는 커스텀 훅
 */
export const useSettings = () => {
  // 기본 설정값
  const defaultSettings = {
    prizes: [],
    participants: [],
    appearance: {
      bgColor: "#1a1a2e",
      textColor: "#ffffff",
      accentColor: "#0f3460",
      winMessage: "🎉 축하합니다! 🎉",
    },
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
  };

  // 설정 상태
  const [prizes, setPrizes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [appearance, setAppearance] = useState(defaultSettings.appearance);
  const [isLoaded, setIsLoaded] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);

  // localStorage에서 설정 로드 (마이그레이션 포함)
  const loadSettings = useCallback(() => {
    try {
      console.log("Starting settings load with migration check...");

      // 1. 데이터 무결성 검사
      const integrityCheck = validateDataIntegrity();
      console.log("Data integrity check:", integrityCheck);

      // 2. 손상된 데이터가 있으면 복구 시도
      if (!integrityCheck.overall.valid) {
        console.log("Data corruption detected, attempting repair...");
        const repairSuccess = repairCorruptedData();
        if (repairSuccess) {
          console.log("Data repair completed successfully");
        } else {
          console.error("Data repair failed, using defaults");
          setMigrationStatus("repair_failed");
        }
      }

      // 3. 데이터 마이그레이션 수행
      const migrationResult = migrateAllData();
      console.log("Migration result:", migrationResult);

      if (migrationResult.errors.length > 0) {
        console.warn(
          "Migration completed with errors:",
          migrationResult.errors
        );
        setMigrationStatus("migration_errors");
      } else {
        setMigrationStatus("success");
      }

      // 4. 마이그레이션된 설정 로드
      const savedSettings = loadFromLocalStorage(
        STORAGE_KEYS.SETTINGS,
        defaultSettings
      );

      // 로드된 데이터가 유효한지 확인
      if (savedSettings && typeof savedSettings === "object") {
        setPrizes(
          Array.isArray(savedSettings.prizes) ? savedSettings.prizes : []
        );
        setParticipants(
          Array.isArray(savedSettings.participants)
            ? savedSettings.participants
            : []
        );
        setAppearance({
          ...defaultSettings.appearance,
          ...(savedSettings.appearance || {}),
        });
      }

      setIsLoaded(true);
      console.log(
        "Settings loaded successfully after migration:",
        savedSettings
      );
    } catch (error) {
      console.error("Failed to load settings with migration:", error);
      setMigrationStatus("load_failed");
      // 오류 발생 시 기본값 사용
      setPrizes([]);
      setParticipants([]);
      setAppearance(defaultSettings.appearance);
      setIsLoaded(true);
    }
  }, []);

  // localStorage에 설정 저장
  const saveSettings = useCallback(
    (newPrizes, newParticipants, newAppearance) => {
      try {
        const settingsToSave = {
          prizes: newPrizes || prizes,
          participants: newParticipants || participants,
          appearance: newAppearance || appearance,
          version: defaultSettings.version,
          lastUpdated: new Date().toISOString(),
        };

        const success = saveToLocalStorage(
          STORAGE_KEYS.SETTINGS,
          settingsToSave
        );
        if (success) {
          console.log("Settings saved to localStorage:", settingsToSave);
        } else {
          console.error("Failed to save settings to localStorage");
        }
        return success;
      } catch (error) {
        console.error("Error saving settings:", error);
        return false;
      }
    },
    [prizes, participants, appearance]
  );

  // 컴포넌트 마운트 시 설정 로드 (마이그레이션 포함)
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 설정이 변경될 때마다 자동 저장
  useEffect(() => {
    if (isLoaded) {
      saveSettings();
    }
  }, [prizes, participants, appearance, isLoaded, saveSettings]);

  // 상품 관련 함수들
  const addPrize = useCallback(
    (prizeName) => {
      if (!prizeName.trim()) return false;

      // 중복 체크
      const normalizedName = prizeName.trim().toLowerCase();
      const isDuplicate = prizes.some(
        (prize) => prize.name.toLowerCase() === normalizedName
      );

      if (isDuplicate) {
        console.warn(`Prize "${prizeName}" already exists`);
        return false;
      }

      const newPrize = {
        id: Date.now(),
        name: prizeName.trim(),
        addedAt: new Date().toISOString(),
      };

      const newPrizes = [...prizes, newPrize];
      setPrizes(newPrizes);
      return true;
    },
    [prizes]
  );

  const removePrize = useCallback(
    (prizeId) => {
      const newPrizes = prizes.filter((prize) => prize.id !== prizeId);
      setPrizes(newPrizes);
    },
    [prizes]
  );

  const clearPrizes = useCallback(() => {
    setPrizes([]);
  }, []);

  // 참가자 관련 함수들
  const addParticipant = useCallback(
    (participantName) => {
      if (!participantName.trim()) return false;

      // 중복 체크
      const normalizedName = participantName.trim().toLowerCase();
      const isDuplicate = participants.some(
        (participant) => participant.name.toLowerCase() === normalizedName
      );

      if (isDuplicate) {
        console.warn(`Participant "${participantName}" already exists`);
        return false;
      }

      const newParticipant = {
        id: Date.now(),
        name: participantName.trim(),
        addedAt: new Date().toISOString(),
      };

      const newParticipants = [...participants, newParticipant];
      setParticipants(newParticipants);
      return true;
    },
    [participants]
  );

  const removeParticipant = useCallback(
    (participantId) => {
      const newParticipants = participants.filter(
        (participant) => participant.id !== participantId
      );
      setParticipants(newParticipants);
    },
    [participants]
  );

  const clearParticipants = useCallback(() => {
    setParticipants([]);
  }, []);

  // 외관 설정 관련 함수들
  const updateAppearance = useCallback((newAppearance) => {
    setAppearance((prevAppearance) => ({
      ...prevAppearance,
      ...newAppearance,
    }));
  }, []);

  const resetAppearance = useCallback(() => {
    setAppearance(defaultSettings.appearance);
  }, []);

  // 모든 설정 초기화
  const resetAllSettings = useCallback(() => {
    setPrizes([]);
    setParticipants([]);
    setAppearance(defaultSettings.appearance);
  }, []);

  // 설정 내보내기 (JSON 형태)
  const exportSettings = useCallback(() => {
    const exportData = {
      prizes,
      participants,
      appearance,
      version: defaultSettings.version,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(exportData, null, 2);
  }, [prizes, participants, appearance]);

  // 설정 가져오기 (JSON 문자열로부터)
  const importSettings = useCallback((jsonString) => {
    try {
      const importedData = JSON.parse(jsonString);

      if (importedData && typeof importedData === "object") {
        if (Array.isArray(importedData.prizes)) {
          setPrizes(importedData.prizes);
        }
        if (Array.isArray(importedData.participants)) {
          setParticipants(importedData.participants);
        }
        if (
          importedData.appearance &&
          typeof importedData.appearance === "object"
        ) {
          setAppearance({
            ...defaultSettings.appearance,
            ...importedData.appearance,
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to import settings:", error);
      return false;
    }
  }, []);

  return {
    // 상태
    prizes,
    participants,
    appearance,
    isLoaded,
    migrationStatus,

    // 상품 관련 함수
    addPrize,
    removePrize,
    clearPrizes,
    setPrizes,

    // 참가자 관련 함수
    addParticipant,
    removeParticipant,
    clearParticipants,
    setParticipants,

    // 외관 설정 관련 함수
    updateAppearance,
    resetAppearance,
    setAppearance,

    // 전체 설정 관련 함수
    resetAllSettings,
    exportSettings,
    importSettings,
    loadSettings,
    saveSettings,
  };
};
