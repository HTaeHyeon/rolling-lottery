import { useState, useEffect } from "react";
import "./ScreenSizeGuard.css";

function ScreenSizeGuard({ children }) {
  const [isValidSize, setIsValidSize] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 모바일 감지 (너비 768px 이하 또는 터치 디바이스)
      const mobileCheck = width <= 768 || "ontouchstart" in window;
      setIsMobile(mobileCheck);

      // 최소 요구 사항: 1024px 이상의 너비
      const validSize = width >= 1024 && height >= 600;
      setIsValidSize(validSize);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  if (!isValidSize) {
    return (
      <div className="screen-size-guard">
        <div className="guard-content">
          <div className="guard-icon">{isMobile ? "📱" : "💻"}</div>
          <h2>화면 크기 안내</h2>
          {isMobile ? (
            <div className="guard-message">
              <p>모바일 환경에서는 최적의 경험을 제공하기 어렵습니다.</p>
              <p>
                <strong>PC 또는 태블릿</strong>에서 이용해 주세요.
              </p>
              <div className="requirements">
                <h3>권장 환경</h3>
                <ul>
                  <li>PC 또는 태블릿</li>
                  <li>화면 너비: 1024px 이상</li>
                  <li>화면 높이: 600px 이상</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="guard-message">
              <p>
                더 나은 추첨 경험을 위해 <strong>브라우저 창을 더 크게</strong>{" "}
                조정해 주세요.
              </p>
              <div className="requirements">
                <h3>최소 요구사항</h3>
                <ul>
                  <li>화면 너비: 1024px 이상</li>
                  <li>화면 높이: 600px 이상</li>
                </ul>
                <p className="current-size">
                  현재 화면: {window.innerWidth} × {window.innerHeight}px
                </p>
              </div>
            </div>
          )}
          <div className="guard-footer">
            <p>화면을 조정한 후 자동으로 진행됩니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default ScreenSizeGuard;
