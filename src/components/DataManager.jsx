import { useState, useCallback } from "react";
import { useSettings } from "../hooks/useSettings";
import { useDrawHistory } from "../hooks/useDrawHistory";
import {
  validateDataIntegrity,
  repairCorruptedData,
} from "../utils/dataMigration";
import {
  clearAllLocalStorage,
  getLocalStorageUsage,
} from "../utils/localStorage";
import "./DataManager.css";

/**
 * 데이터 관리 및 백업/복원 컴포넌트
 */
function DataManager({ onClose }) {
  const [activeTab, setActiveTab] = useState("backup");
  const [notification, setNotification] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { exportSettings, importSettings, resetAllSettings } = useSettings();
  const { exportHistory, importHistory, clearHistory } = useDrawHistory();

  // 알림 표시
  const showNotification = useCallback((message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // 전체 데이터 백업
  const handleBackupAll = useCallback(() => {
    try {
      const settings = exportSettings();
      const history = exportHistory();

      const fullBackup = {
        settings: JSON.parse(settings),
        history: JSON.parse(history),
        backupDate: new Date().toISOString(),
        version: "1.0.0",
      };

      const dataStr = JSON.stringify(fullBackup, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `rolling-lottery-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification("전체 데이터가 성공적으로 백업되었습니다.", "success");
    } catch (error) {
      console.error("Backup failed:", error);
      showNotification("백업 중 오류가 발생했습니다.", "error");
    }
  }, [exportSettings, exportHistory, showNotification]);

  // 설정만 백업
  const handleBackupSettings = useCallback(() => {
    try {
      const settings = exportSettings();
      const dataBlob = new Blob([settings], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `settings-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification("설정이 성공적으로 백업되었습니다.", "success");
    } catch (error) {
      console.error("Settings backup failed:", error);
      showNotification("설정 백업 중 오류가 발생했습니다.", "error");
    }
  }, [exportSettings, showNotification]);

  // 추첨 기록만 백업
  const handleBackupHistory = useCallback(() => {
    try {
      const history = exportHistory();
      const dataBlob = new Blob([history], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `draw-history-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification("추첨 기록이 성공적으로 백업되었습니다.", "success");
    } catch (error) {
      console.error("History backup failed:", error);
      showNotification("추첨 기록 백업 중 오류가 발생했습니다.", "error");
    }
  }, [exportHistory, showNotification]);

  // 파일에서 데이터 복원
  const handleFileImport = useCallback(
    (event, type = "all") => {
      const file = event.target.files[0];
      if (!file) return;

      setIsProcessing(true);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (type === "all") {
            // 전체 데이터 복원
            if (data.settings) {
              const settingsSuccess = importSettings(
                JSON.stringify(data.settings)
              );
              if (!settingsSuccess) {
                throw new Error("설정 복원 실패");
              }
            }

            if (data.history) {
              const historySuccess = importHistory(
                JSON.stringify(data.history)
              );
              if (!historySuccess) {
                throw new Error("추첨 기록 복원 실패");
              }
            }

            showNotification(
              "전체 데이터가 성공적으로 복원되었습니다.",
              "success"
            );
          } else if (type === "settings") {
            // 설정만 복원
            const success = importSettings(e.target.result);
            if (success) {
              showNotification("설정이 성공적으로 복원되었습니다.", "success");
            } else {
              throw new Error("설정 복원 실패");
            }
          } else if (type === "history") {
            // 추첨 기록만 복원
            const success = importHistory(e.target.result);
            if (success) {
              showNotification(
                "추첨 기록이 성공적으로 복원되었습니다.",
                "success"
              );
            } else {
              throw new Error("추첨 기록 복원 실패");
            }
          }
        } catch (error) {
          console.error("Import failed:", error);
          showNotification(
            "파일 복원 중 오류가 발생했습니다. 파일 형식을 확인해주세요.",
            "error"
          );
        } finally {
          setIsProcessing(false);
          event.target.value = ""; // 파일 입력 초기화
        }
      };

      reader.readAsText(file);
    },
    [importSettings, importHistory, showNotification]
  );

  // 데이터 무결성 검사
  const handleDataValidation = useCallback(async () => {
    setIsProcessing(true);
    try {
      const validation = validateDataIntegrity();

      if (validation.overall.valid) {
        showNotification("모든 데이터가 정상입니다.", "success");
      } else {
        const issues = [
          ...validation.settings.issues.map((issue) => `설정: ${issue}`),
          ...validation.drawHistory.issues.map(
            (issue) => `추첨 기록: ${issue}`
          ),
        ];

        showNotification(
          `데이터에 ${validation.overall.errors}개의 문제가 발견되었습니다:\n${issues.join("\n")}`,
          "warning"
        );
      }
    } catch (error) {
      console.error("Validation failed:", error);
      showNotification("데이터 검사 중 오류가 발생했습니다.", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [showNotification]);

  // 손상된 데이터 복구
  const handleDataRepair = useCallback(async () => {
    if (
      !window.confirm(
        "손상된 데이터를 복구하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      const repairSuccess = repairCorruptedData();

      if (repairSuccess) {
        showNotification("데이터 복구가 완료되었습니다.", "success");
      } else {
        throw new Error("데이터 복구 실패");
      }
    } catch (error) {
      console.error("Repair failed:", error);
      showNotification("데이터 복구 중 오류가 발생했습니다.", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [showNotification]);

  // 모든 데이터 삭제
  const handleClearAll = useCallback(() => {
    if (
      !window.confirm(
        "모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }

    try {
      clearAllLocalStorage();
      resetAllSettings();
      clearHistory();
      showNotification("모든 데이터가 삭제되었습니다.", "success");
    } catch (error) {
      console.error("Clear all failed:", error);
      showNotification("데이터 삭제 중 오류가 발생했습니다.", "error");
    }
  }, [resetAllSettings, clearHistory, showNotification]);

  // 저장소 사용량 정보
  const storageUsage = getLocalStorageUsage();

  return (
    <div className="data-manager-overlay">
      <div className="data-manager">
        <div className="data-manager-header">
          <h2>데이터 관리</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 알림 */}
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}

        {/* 탭 메뉴 */}
        <div className="tab-menu">
          <button
            className={activeTab === "backup" ? "active" : ""}
            onClick={() => setActiveTab("backup")}
          >
            백업/복원
          </button>
          <button
            className={activeTab === "maintenance" ? "active" : ""}
            onClick={() => setActiveTab("maintenance")}
          >
            유지보수
          </button>
          <button
            className={activeTab === "info" ? "active" : ""}
            onClick={() => setActiveTab("info")}
          >
            정보
          </button>
        </div>

        {/* 백업/복원 탭 */}
        {activeTab === "backup" && (
          <div className="tab-content">
            <div className="section">
              <h3>📥 백업</h3>
              <div className="button-group">
                <button onClick={handleBackupAll}>전체 백업</button>
                <button onClick={handleBackupSettings}>설정 백업</button>
                <button onClick={handleBackupHistory}>추첨 기록 백업</button>
              </div>
            </div>

            <div className="section">
              <h3>📤 복원</h3>
              <div className="file-input-group">
                <label>
                  전체 데이터 복원
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileImport(e, "all")}
                    disabled={isProcessing}
                  />
                </label>
                <label>
                  설정만 복원
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileImport(e, "settings")}
                    disabled={isProcessing}
                  />
                </label>
                <label>
                  추첨 기록만 복원
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileImport(e, "history")}
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 유지보수 탭 */}
        {activeTab === "maintenance" && (
          <div className="tab-content">
            <div className="section">
              <h3>🔧 데이터 검사 및 복구</h3>
              <div className="button-group">
                <button onClick={handleDataValidation} disabled={isProcessing}>
                  데이터 무결성 검사
                </button>
                <button onClick={handleDataRepair} disabled={isProcessing}>
                  손상된 데이터 복구
                </button>
              </div>
            </div>

            <div className="section">
              <h3>🗑️ 데이터 삭제</h3>
              <div className="button-group">
                <button onClick={handleClearAll} className="danger">
                  모든 데이터 삭제
                </button>
              </div>
              <p className="warning-text">
                ⚠️ 주의: 이 작업은 되돌릴 수 없습니다. 먼저 백업을 권장합니다.
              </p>
            </div>
          </div>
        )}

        {/* 정보 탭 */}
        {activeTab === "info" && (
          <div className="tab-content">
            <div className="section">
              <h3>💾 저장소 정보</h3>
              <div className="storage-info">
                <div className="storage-item">
                  <span>사용량:</span>
                  <span>{(storageUsage.used / 1024).toFixed(2)} KB</span>
                </div>
                <div className="storage-item">
                  <span>사용률:</span>
                  <span>{storageUsage.percentage}%</span>
                </div>
                <div className="storage-progress">
                  <div
                    className="storage-bar"
                    style={{
                      width: `${Math.min(storageUsage.percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <h3>📋 앱 정보</h3>
              <div className="app-info">
                <div className="info-item">
                  <span>버전:</span>
                  <span>1.0.0</span>
                </div>
                <div className="info-item">
                  <span>개발자:</span>
                  <span>Korean Rolling Lottery</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="processing-overlay">
            <div className="spinner"></div>
            <p>처리 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataManager;
