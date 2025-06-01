import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import SettingsPage from "./components/SettingsPage";
import DrawingPage from "./components/DrawingPage";
import ScreenSizeGuard from "./components/ScreenSizeGuard";
import DataManager from "./components/DataManager";
import ErrorBoundary from "./components/ErrorBoundary";
import { useSettings } from "./hooks/useSettings";
import {
  setupGlobalErrorHandlers,
  setupNetworkMonitoring,
} from "./utils/errorHandler";
import { createLogger } from "./utils/logger";
import "./App.css";

// 앱 전용 로거 생성
const appLogger = createLogger("App");

function App() {
  const [currentPage, setCurrentPage] = useState("settings");
  const [showDataManager, setShowDataManager] = useState(false);
  const [globalNotification, setGlobalNotification] = useState(null);

  // 전역 오류 핸들러와 네트워크 모니터링 초기화
  useEffect(() => {
    appLogger.info("🚀 Initializing application");

    // 전역 오류 핸들러 설정
    setupGlobalErrorHandlers();

    // 네트워크 모니터링 설정
    setupNetworkMonitoring();

    appLogger.info(
      "✅ Global error handlers and network monitoring initialized"
    );

    return () => {
      appLogger.info("🔄 App component unmounting");
    };
  }, []);

  // useSettings 훅을 사용하여 설정 관리 (자동 저장/복원)
  const {
    prizes,
    participants,
    appearance,
    isLoaded,
    migrationStatus,
    addPrize,
    removePrize,
    setPrizes,
    addParticipant,
    removeParticipant,
    setParticipants,
    updateAppearance,
  } = useSettings();

  // 설정 로딩 완료 로그
  useEffect(() => {
    if (isLoaded) {
      appLogger.info("📋 Settings loaded successfully", {
        prizesCount: prizes.length,
        participantsCount: participants.length,
        migrationStatus,
      });
    }
  }, [isLoaded, prizes.length, participants.length, migrationStatus]);

  // 마이그레이션 상태에 따른 알림 표시
  useEffect(() => {
    if (migrationStatus && isLoaded) {
      let message = "";
      let type = "info";

      switch (migrationStatus) {
        case "repair_failed":
          message =
            "⚠️ 데이터 복구에 실패했습니다. 기본 설정을 사용합니다. 데이터 관리에서 백업을 확인해주세요.";
          type = "error";
          appLogger.error("Data repair failed", { migrationStatus });
          break;
        case "migration_errors":
          message =
            "⚠️ 데이터 마이그레이션 중 일부 오류가 발생했습니다. 데이터 관리에서 확인해주세요.";
          type = "warning";
          appLogger.warn("Migration errors detected", { migrationStatus });
          break;
        case "load_failed":
          message =
            "⚠️ 저장된 설정을 불러오는데 실패했습니다. 기본 설정을 사용합니다.";
          type = "error";
          appLogger.error("Settings load failed", { migrationStatus });
          break;
        default:
          // 성공 시에는 알림을 표시하지 않음
          appLogger.info("Migration completed successfully", {
            migrationStatus,
          });
          return;
      }

      setGlobalNotification({ message, type });
      setTimeout(() => setGlobalNotification(null), 8000);
    }
  }, [migrationStatus, isLoaded]);

  // 전역 persistence 오류 이벤트 리스너
  useEffect(() => {
    const handlePersistenceError = (event) => {
      const { message, type } = event.detail;
      appLogger.warn("Persistence error received", { message, type });
      setGlobalNotification({ message, type });
      setTimeout(() => setGlobalNotification(null), 8000);
    };

    window.addEventListener("persistenceError", handlePersistenceError);

    return () => {
      window.removeEventListener("persistenceError", handlePersistenceError);
    };
  }, []);

  const handlePageChange = (page) => {
    appLogger.debug("Page changed", { from: currentPage, to: page });
    setCurrentPage(page);
  };

  const handleDataManagerToggle = (show) => {
    appLogger.debug("Data manager toggled", { show });
    setShowDataManager(show);
  };

  const canStartDraw = prizes.length > 0 && participants.length > 0;

  // 설정이 로드되기 전에는 로딩 화면 표시
  if (!isLoaded) {
    appLogger.debug("Showing loading screen");

    return (
      <ErrorBoundary>
        <ScreenSizeGuard>
          <div
            className="app"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                className="spinner"
                style={{
                  width: "50px",
                  height: "50px",
                  border: "4px solid rgba(255, 255, 255, 0.3)",
                  borderTop: "4px solid rgba(255, 255, 255, 0.8)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 20px",
                }}
              ></div>
              <p>설정을 불러오는 중...</p>
            </div>
          </div>
        </ScreenSizeGuard>
      </ErrorBoundary>
    );
  }

  appLogger.debug("Rendering main app", {
    currentPage,
    canStartDraw,
    showDataManager,
    hasGlobalNotification: !!globalNotification,
  });

  return (
    <ErrorBoundary>
      <ScreenSizeGuard>
        <div className="app">
          {/* 전역 알림 */}
          {globalNotification && (
            <div className={`global-notification ${globalNotification.type}`}>
              <span>{globalNotification.message}</span>
              <button
                onClick={() => {
                  appLogger.debug("Global notification dismissed");
                  setGlobalNotification(null);
                }}
                className="notification-close"
              >
                ✕
              </button>
            </div>
          )}

          <Navbar
            currentPage={currentPage}
            onPageChange={handlePageChange}
            canStartDraw={canStartDraw}
            onDataManager={() => handleDataManagerToggle(true)}
          />

          <main className="main">
            {currentPage === "settings" && (
              <ErrorBoundary
                fallback={
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    <p>⚠️ 설정 페이지에서 오류가 발생했습니다.</p>
                    <button
                      onClick={() => {
                        appLogger.info(
                          "Page refresh triggered from settings error fallback"
                        );
                        window.location.reload();
                      }}
                    >
                      페이지 새로고침
                    </button>
                  </div>
                }
              >
                <SettingsPage
                  prizes={prizes}
                  setPrizes={setPrizes}
                  participants={participants}
                  setParticipants={setParticipants}
                  settings={appearance}
                  setSettings={updateAppearance}
                  addPrize={addPrize}
                  removePrize={removePrize}
                  addParticipant={addParticipant}
                  removeParticipant={removeParticipant}
                />
              </ErrorBoundary>
            )}

            {currentPage === "drawing" && (
              <ErrorBoundary
                fallback={
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    <p>⚠️ 추첨 페이지에서 오류가 발생했습니다.</p>
                    <button
                      onClick={() => {
                        appLogger.info(
                          "Navigating back to settings from drawing error fallback"
                        );
                        handlePageChange("settings");
                      }}
                    >
                      설정 페이지로 돌아가기
                    </button>
                  </div>
                }
              >
                <DrawingPage
                  prizes={prizes}
                  setPrizes={setPrizes}
                  participants={participants}
                  setParticipants={setParticipants}
                  settings={appearance}
                  onPageChange={handlePageChange}
                />
              </ErrorBoundary>
            )}
          </main>

          {/* 데이터 관리자 모달 */}
          {showDataManager && (
            <ErrorBoundary
              fallback={
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                  }}
                >
                  <div
                    style={{
                      background: "white",
                      padding: "20px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <p>⚠️ 데이터 관리자에서 오류가 발생했습니다.</p>
                    <button
                      onClick={() => {
                        appLogger.info(
                          "Data manager closed from error fallback"
                        );
                        handleDataManagerToggle(false);
                      }}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              }
            >
              <DataManager onClose={() => handleDataManagerToggle(false)} />
            </ErrorBoundary>
          )}
        </div>
      </ScreenSizeGuard>
    </ErrorBoundary>
  );
}

export default App;
