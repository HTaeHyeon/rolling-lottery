import { useState, useEffect, useCallback } from "react";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  STORAGE_KEYS,
} from "../utils/localStorage";

/**
 * 추첨 기록을 관리하고 localStorage에 자동으로 저장하는 커스텀 훅
 */
export const useDrawHistory = () => {
  const [drawHistory, setDrawHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // localStorage에서 추첨 기록 로드
  const loadHistory = useCallback(() => {
    try {
      const savedHistory = loadFromLocalStorage(STORAGE_KEYS.DRAW_HISTORY, []);

      if (Array.isArray(savedHistory)) {
        setDrawHistory(savedHistory);
      } else {
        setDrawHistory([]);
      }

      setIsLoaded(true);
      console.log("Draw history loaded from localStorage:", savedHistory);
    } catch (error) {
      console.error("Failed to load draw history:", error);
      setDrawHistory([]);
      setIsLoaded(true);
    }
  }, []);

  // localStorage에 추첨 기록 저장
  const saveHistory = useCallback(
    (newHistory) => {
      try {
        const historyToSave = newHistory || drawHistory;
        const success = saveToLocalStorage(
          STORAGE_KEYS.DRAW_HISTORY,
          historyToSave
        );

        if (success) {
          console.log("Draw history saved to localStorage:", historyToSave);
        } else {
          console.error("Failed to save draw history to localStorage");
        }

        return success;
      } catch (error) {
        console.error("Error saving draw history:", error);
        return false;
      }
    },
    [drawHistory]
  );

  // 컴포넌트 마운트 시 기록 로드
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 기록이 변경될 때마다 자동 저장
  useEffect(() => {
    if (isLoaded && drawHistory.length >= 0) {
      saveHistory();
    }
  }, [drawHistory, isLoaded, saveHistory]);

  // 새로운 추첨 기록 추가
  const addDrawRecord = useCallback(
    (drawData) => {
      const newRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString("ko-KR"),
        time: new Date().toLocaleTimeString("ko-KR"),
        ...drawData,
      };

      const newHistory = [newRecord, ...drawHistory];
      setDrawHistory(newHistory);

      return newRecord.id;
    },
    [drawHistory]
  );

  // 추첨 기록 삭제
  const removeDrawRecord = useCallback(
    (recordId) => {
      const newHistory = drawHistory.filter((record) => record.id !== recordId);
      setDrawHistory(newHistory);
    },
    [drawHistory]
  );

  // 모든 추첨 기록 삭제
  const clearHistory = useCallback(() => {
    setDrawHistory([]);
  }, []);

  // 특정 날짜의 추첨 기록 가져오기
  const getDrawsByDate = useCallback(
    (date) => {
      return drawHistory.filter((record) => record.date === date);
    },
    [drawHistory]
  );

  // 특정 상품의 추첨 기록 가져오기
  const getDrawsByPrize = useCallback(
    (prizeName) => {
      return drawHistory.filter((record) => record.prize === prizeName);
    },
    [drawHistory]
  );

  // 특정 당첨자의 추첨 기록 가져오기
  const getDrawsByWinner = useCallback(
    (winnerName) => {
      return drawHistory.filter((record) => record.winner === winnerName);
    },
    [drawHistory]
  );

  // 추첨 통계 계산
  const getStatistics = useCallback(() => {
    if (drawHistory.length === 0) {
      return {
        totalDraws: 0,
        uniquePrizes: 0,
        uniqueWinners: 0,
        mostFrequentWinner: null,
        recentDraws: [],
      };
    }

    const uniquePrizes = new Set(drawHistory.map((record) => record.prize))
      .size;
    const uniqueWinners = new Set(drawHistory.map((record) => record.winner))
      .size;

    // 가장 많이 당첨된 사람 찾기
    const winnerCounts = {};
    drawHistory.forEach((record) => {
      winnerCounts[record.winner] = (winnerCounts[record.winner] || 0) + 1;
    });

    const mostFrequentWinner = Object.entries(winnerCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    // 최근 5개 추첨
    const recentDraws = drawHistory.slice(0, 5);

    return {
      totalDraws: drawHistory.length,
      uniquePrizes,
      uniqueWinners,
      mostFrequentWinner: mostFrequentWinner
        ? {
            name: mostFrequentWinner[0],
            count: mostFrequentWinner[1],
          }
        : null,
      recentDraws,
    };
  }, [drawHistory]);

  // 추첨 기록 내보내기 (JSON 형태)
  const exportHistory = useCallback(() => {
    const exportData = {
      drawHistory,
      exportedAt: new Date().toISOString(),
      totalRecords: drawHistory.length,
    };
    return JSON.stringify(exportData, null, 2);
  }, [drawHistory]);

  // 추첨 기록 가져오기 (JSON 문자열로부터)
  const importHistory = useCallback(
    (jsonString, replaceExisting = false) => {
      try {
        const importedData = JSON.parse(jsonString);

        if (importedData && Array.isArray(importedData.drawHistory)) {
          if (replaceExisting) {
            setDrawHistory(importedData.drawHistory);
          } else {
            // 기존 기록과 합치기 (중복 제거)
            const existingIds = new Set(drawHistory.map((record) => record.id));
            const newRecords = importedData.drawHistory.filter(
              (record) => !existingIds.has(record.id)
            );
            setDrawHistory([...drawHistory, ...newRecords]);
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to import draw history:", error);
        return false;
      }
    },
    [drawHistory]
  );

  return {
    // 상태
    drawHistory,
    isLoaded,

    // 기록 관리 함수
    addDrawRecord,
    removeDrawRecord,
    clearHistory,

    // 조회 함수
    getDrawsByDate,
    getDrawsByPrize,
    getDrawsByWinner,
    getStatistics,

    // 가져오기/내보내기 함수
    exportHistory,
    importHistory,

    // 저장/로드 함수
    loadHistory,
    saveHistory,
  };
};
