import "./Navbar.css";

function Navbar({ currentPage, onPageChange, canStartDraw, onDataManager }) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="nav-title">🎁 롤링 추첨</h1>
        <div className="nav-buttons">
          <button
            className={`nav-btn ${currentPage === "settings" ? "active" : ""}`}
            onClick={() => onPageChange("settings")}
          >
            ⚙️ 설정
          </button>
          <button
            className={`nav-btn primary ${currentPage === "drawing" ? "active" : ""}`}
            onClick={() => onPageChange("drawing")}
            disabled={!canStartDraw}
            title={!canStartDraw ? "상품과 참가자를 먼저 설정해주세요" : ""}
          >
            🎲 추첨 시작
          </button>
          <button
            className="nav-btn"
            onClick={onDataManager}
            title="데이터 백업/복원 및 관리"
          >
            💾 데이터 관리
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
