import React from "react";
import "./ErrorBoundary.css";

/**
 * React Error Boundary 컴포넌트
 * 자식 컴포넌트에서 발생하는 JavaScript 오류를 포착하고 fallback UI를 표시합니다.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // 다음 렌더링에서 fallback UI가 표시되도록 상태를 업데이트합니다.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 오류를 로그에 기록합니다.
    console.error("🚨 Error caught by ErrorBoundary:", error);
    console.error("📍 Error component stack:", errorInfo.componentStack);

    // 상태에 오류 정보를 저장합니다.
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // 전역 persistence 오류 이벤트 발생 (기존 알림 시스템 활용)
    if (window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent("persistenceError", {
          detail: {
            message:
              "애플리케이션에서 예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.",
            type: "error",
          },
        })
      );
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleResetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback UI가 제공된 경우 그것을 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">앗! 문제가 발생했습니다</h2>
            <p className="error-boundary-message">
              애플리케이션에서 예상치 못한 오류가 발생했습니다.
              <br />
              페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            </p>

            <div className="error-boundary-actions">
              <button
                className="error-boundary-btn primary"
                onClick={this.handleRefresh}
              >
                🔄 페이지 새로고침
              </button>
              <button
                className="error-boundary-btn secondary"
                onClick={this.handleResetError}
              >
                ↻ 다시 시도
              </button>
            </div>

            {/* 개발 환경에서만 오류 상세 정보 표시 */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="error-boundary-details">
                <summary>개발자 정보 (클릭하여 펼치기)</summary>
                <div className="error-boundary-debug">
                  <h4>오류 메시지:</h4>
                  <pre>{this.state.error.toString()}</pre>

                  <h4>컴포넌트 스택:</h4>
                  <pre>{this.state.errorInfo.componentStack}</pre>

                  <h4>오류 스택:</h4>
                  <pre>{this.state.error.stack}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
