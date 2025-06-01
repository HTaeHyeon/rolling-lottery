/**
 * 환경별 로깅 시스템
 * 개발/프로덕션 환경에 따라 다른 로그 레벨을 지원합니다.
 */

// 로그 레벨 정의
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// 현재 환경 확인
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

// 환경별 기본 로그 레벨 설정
const DEFAULT_LOG_LEVEL = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

class Logger {
  constructor(options = {}) {
    this.level = options.level ?? DEFAULT_LOG_LEVEL;
    this.context = options.context || "App";
    this.enableColors = options.enableColors ?? isDevelopment;
    this.enableTimestamp = options.enableTimestamp ?? true;
    this.enableStack = options.enableStack ?? isDevelopment;
  }

  /**
   * 로그 레벨 변경
   */
  setLevel(level) {
    this.level = level;
  }

  /**
   * 컨텍스트 변경
   */
  setContext(context) {
    this.context = context;
  }

  /**
   * 로그 메시지 포맷팅
   */
  formatMessage(level, message, data = null) {
    const parts = [];

    // 타임스탬프 추가
    if (this.enableTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }

    // 로그 레벨 추가
    const levelName = Object.keys(LOG_LEVELS)[level];
    parts.push(`[${levelName}]`);

    // 컨텍스트 추가
    if (this.context) {
      parts.push(`[${this.context}]`);
    }

    // 메시지 추가
    parts.push(message);

    return parts.join(" ");
  }

  /**
   * 색상 적용 (개발 환경용)
   */
  applyColor(level, message) {
    if (!this.enableColors || !isDevelopment) {
      return message;
    }

    const colors = {
      [LOG_LEVELS.DEBUG]: "\x1b[36m", // Cyan
      [LOG_LEVELS.INFO]: "\x1b[34m", // Blue
      [LOG_LEVELS.WARN]: "\x1b[33m", // Yellow
      [LOG_LEVELS.ERROR]: "\x1b[31m", // Red
    };

    const reset = "\x1b[0m";
    const color = colors[level] || "";

    return `${color}${message}${reset}`;
  }

  /**
   * 로그 출력
   */
  log(level, message, data = null, error = null) {
    // 로그 레벨 확인
    if (level < this.level) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, data);
    const coloredMessage = this.applyColor(level, formattedMessage);

    // 콘솔 메서드 선택
    const consoleMethods = {
      [LOG_LEVELS.DEBUG]: console.debug,
      [LOG_LEVELS.INFO]: console.info,
      [LOG_LEVELS.WARN]: console.warn,
      [LOG_LEVELS.ERROR]: console.error,
    };

    const consoleMethod = consoleMethods[level] || console.log;

    // 기본 메시지 출력
    consoleMethod(coloredMessage);

    // 추가 데이터 출력
    if (data !== null && data !== undefined) {
      console.log("📊 Data:", data);
    }

    // 오류 스택 출력
    if (error && this.enableStack && error.stack) {
      console.log("📚 Stack:", error.stack);
    }

    // 프로덕션에서는 중요한 오류를 외부 서비스로 전송 (예: Sentry)
    if (isProduction && level >= LOG_LEVELS.ERROR) {
      this.sendToExternalService(level, message, data, error);
    }
  }

  /**
   * 외부 로깅 서비스로 전송 (프로덕션용)
   */
  sendToExternalService(level, message, data, error) {
    // 실제 구현에서는 Sentry, LogRocket 등의 서비스를 사용
    // 여기서는 로컬 스토리지에 저장하는 간단한 구현
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: Object.keys(LOG_LEVELS)[level],
        context: this.context,
        message,
        data,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : null,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // 로컬 스토리지에 오류 로그 저장 (최대 100개)
      const existingLogs = JSON.parse(
        localStorage.getItem("app_error_logs") || "[]"
      );
      existingLogs.push(logEntry);

      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }

      localStorage.setItem("app_error_logs", JSON.stringify(existingLogs));
    } catch (e) {
      console.error("Failed to log to external service:", e);
    }
  }

  /**
   * DEBUG 레벨 로그
   */
  debug(message, data = null) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  /**
   * INFO 레벨 로그
   */
  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  /**
   * WARN 레벨 로그
   */
  warn(message, data = null, error = null) {
    this.log(LOG_LEVELS.WARN, message, data, error);
  }

  /**
   * ERROR 레벨 로그
   */
  error(message, data = null, error = null) {
    this.log(LOG_LEVELS.ERROR, message, data, error);
  }

  /**
   * 성능 측정 시작
   */
  time(label) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.time(`⏱️ ${this.context} - ${label}`);
    }
  }

  /**
   * 성능 측정 종료
   */
  timeEnd(label) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.timeEnd(`⏱️ ${this.context} - ${label}`);
    }
  }

  /**
   * 그룹 로그 시작
   */
  group(title) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.group(`📁 ${this.context} - ${title}`);
    }
  }

  /**
   * 그룹 로그 종료
   */
  groupEnd() {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.groupEnd();
    }
  }

  /**
   * 저장된 오류 로그 조회
   */
  getStoredErrorLogs() {
    try {
      return JSON.parse(localStorage.getItem("app_error_logs") || "[]");
    } catch (e) {
      console.error("Failed to retrieve stored error logs:", e);
      return [];
    }
  }

  /**
   * 저장된 오류 로그 삭제
   */
  clearStoredErrorLogs() {
    try {
      localStorage.removeItem("app_error_logs");
      this.info("Stored error logs cleared");
    } catch (e) {
      console.error("Failed to clear stored error logs:", e);
    }
  }
}

// 기본 로거 인스턴스 생성
const defaultLogger = new Logger();

// 컨텍스트별 로거 생성 함수
export const createLogger = (context, options = {}) => {
  return new Logger({ context, ...options });
};

// 기본 로거 메서드들을 직접 export
export const debug = (message, data) => defaultLogger.debug(message, data);
export const info = (message, data) => defaultLogger.info(message, data);
export const warn = (message, data, error) =>
  defaultLogger.warn(message, data, error);
export const error = (message, data, errorObj) =>
  defaultLogger.error(message, data, errorObj);
export const time = (label) => defaultLogger.time(label);
export const timeEnd = (label) => defaultLogger.timeEnd(label);
export const group = (title) => defaultLogger.group(title);
export const groupEnd = () => defaultLogger.groupEnd();

// 로그 레벨 상수 export
export { LOG_LEVELS };

// 로거 클래스 export
export { Logger };

// 기본 로거 인스턴스 export
export default defaultLogger;

// 개발 모드에서 전역 접근 가능하도록 설정
if (isDevelopment) {
  window.logger = defaultLogger;
  window.createLogger = createLogger;
}
