import { useState, useEffect, useRef } from "react";
import { useDrawHistory } from "../hooks/useDrawHistory";
import "./DrawingPage.css";

function DrawingPage({
  prizes,
  setPrizes,
  participants,
  setParticipants,
  settings,
  onPageChange,
}) {
  const [isRolling, setIsRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [winner, setWinner] = useState(null);
  const [currentPrize, setCurrentPrize] = useState(null);
  const [rollingItems, setRollingItems] = useState([]);
  const [finalWinnerIndex, setFinalWinnerIndex] = useState(0);
  const rollingListRef = useRef(null);

  // 추첨 기록 관리
  const { addDrawRecord } = useDrawHistory();

  useEffect(() => {
    if (prizes.length > 0) {
      setCurrentPrize(prizes[0]);
    }
  }, [prizes]);

  useEffect(() => {
    if (participants.length > 0) {
      const extendedList = [];
      const repetitions = Math.max(200, participants.length * 25);

      for (let i = 0; i < repetitions; i++) {
        extendedList.push({
          ...participants[i % participants.length],
          uniqueId: `${participants[i % participants.length].id}-${i}`,
        });
      }
      setRollingItems(extendedList);
    }
  }, [participants]);

  const handleBackToSettings = () => {
    onPageChange("settings");
  };

  // 외부 Random API를 사용한 진정한 랜덤 선택
  const getRandomNumber = async (min, max) => {
    try {
      const response = await fetch("https://api.random.org/json-rpc/4/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "generateSignedIntegers",
          params: {
            apiKey: null,
            n: 1,
            min: min,
            max: max,
            replacement: true,
            base: 10,
            userData: null,
          },
          id: Date.now(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.random && data.result.random.data) {
          return data.result.random.data[0];
        }
      }
      throw new Error("Random API failed");
    } catch (error) {
      console.warn("외부 Random API 실패, 로컬 랜덤 사용:", error);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  };

  const startRolling = async () => {
    if (participants.length === 0 || rollingItems.length === 0) return;

    setIsRolling(true);
    setShowResult(false);
    setWinner(null);

    // 전체 롤링 시간 계산: 최소 10초, 최대 15초
    const baseTime = 10000; // 기본 10초
    const additionalTime = Math.min(participants.length * 300, 5000); // 참가자당 0.3초, 최대 5초 추가
    const totalDuration = baseTime + additionalTime;

    console.log(
      `롤링 시작: 총 시간 ${totalDuration / 1000}초, 참가자 ${participants.length}명, 롤링아이템 ${rollingItems.length}개`
    );

    // 1. 먼저 실제 참가자 중에서 당첨자를 랜덤 선택
    const randomWinnerIndex = await getRandomNumber(0, participants.length - 1);
    const selectedWinner = participants[randomWinnerIndex];

    // 2. 애니메이션에서 멈출 위치 계산 (안전한 중간 범위로 축소)
    const safeStart = Math.floor(rollingItems.length * 0.3);
    const safeEnd = Math.floor(rollingItems.length * 0.5); // 50%로 축소하여 안전하게

    console.log(
      `안전 범위: ${safeStart} ~ ${safeEnd} (전체: ${rollingItems.length})`
    );

    // 해당 구간에서 당첨자와 같은 이름을 가진 아이템들 찾기
    const winnerItemsInRange = [];
    for (let i = safeStart; i <= safeEnd; i++) {
      if (rollingItems[i] && rollingItems[i].id === selectedWinner.id) {
        winnerItemsInRange.push(i);
      }
    }

    // 랜덤하게 그 중 하나 선택
    const finalIndex =
      winnerItemsInRange.length > 0
        ? winnerItemsInRange[
            Math.floor(Math.random() * winnerItemsInRange.length)
          ]
        : Math.floor((safeStart + safeEnd) / 2); // 백업: 중간 지점

    setFinalWinnerIndex(finalIndex);
    setWinner(selectedWinner);

    console.log(
      `당첨자: ${selectedWinner.name}, 애니메이션 인덱스: ${finalIndex}, 해당 위치 아이템: ${rollingItems[finalIndex]?.name}`
    );

    // 정확한 위치 계산 - 초기 위치 0에서 시작
    const itemHeight = 80;
    const finalTransform = finalIndex * itemHeight;

    // CSS 애니메이션 시작
    if (rollingListRef.current) {
      rollingListRef.current.style.setProperty(
        "--final-position",
        `-${finalTransform}px`
      );
      rollingListRef.current.style.animationDuration = `${totalDuration}ms`;
      rollingListRef.current.style.animationName = "smoothRolling";
    }

    // 롤링 완료 후 결과 표시
    setTimeout(() => {
      setIsRolling(false);

      // 당첨자 위치 유지
      if (rollingListRef.current) {
        rollingListRef.current.style.animation = "none";
        rollingListRef.current.style.transform = `translateY(-${finalTransform}px)`;
      }

      // 추첨 기록 저장
      addDrawRecord({
        prize: currentPrize.name,
        winner: selectedWinner.name,
        totalParticipants: participants.length,
        participantsList: participants.map((p) => p.name),
        settings: {
          bgColor: settings.bgColor,
          textColor: settings.textColor,
          accentColor: settings.accentColor,
          winMessage: settings.winMessage,
        },
      });

      setTimeout(() => {
        setShowResult(true);
      }, 800);
    }, totalDuration);
  };

  const handleNextDraw = () => {
    if (winner && currentPrize) {
      setParticipants(participants.filter((p) => p.id !== winner.id));

      const newPrizes = prizes.filter((p) => p.id !== currentPrize.id);
      setPrizes(newPrizes);

      if (newPrizes.length > 0) {
        setCurrentPrize(newPrizes[0]);
        setShowResult(false);
        setWinner(null);
        setFinalWinnerIndex(0);

        // 완전한 애니메이션 리셋 - 초기 위치로
        if (rollingListRef.current) {
          rollingListRef.current.style.animation = "none";
          rollingListRef.current.style.transform = "translateY(0)";
          rollingListRef.current.style.setProperty("--final-position", "0px");
        }
      } else {
        alert("🎉 모든 추첨이 완료되었습니다!");
        onPageChange("settings");
      }
    }
  };

  const handleRollAgain = () => {
    setShowResult(false);
    setWinner(null);
    setFinalWinnerIndex(0);

    // 완전한 애니메이션 리셋과 새로운 rollingItems 생성을 위해 강제 리렌더링
    if (rollingListRef.current) {
      rollingListRef.current.style.animation = "none";
      rollingListRef.current.style.transform = "translateY(0)";
      rollingListRef.current.style.setProperty("--final-position", "0px");
    }

    // rollingItems 재생성을 위한 state 업데이트 트리거
    setRollingItems([]);
    setTimeout(() => {
      if (participants.length > 0) {
        const extendedList = [];
        const repetitions = Math.max(200, participants.length * 25);

        for (let i = 0; i < repetitions; i++) {
          extendedList.push({
            ...participants[i % participants.length],
            uniqueId: `${participants[i % participants.length].id}-${i}-${Date.now()}`,
          });
        }
        setRollingItems(extendedList);
      }
    }, 50);
  };

  if (prizes.length === 0 || participants.length === 0) {
    return (
      <div className="drawing-page">
        <div className="container">
          <div className="error-message">
            <h2>⚠️ 설정이 필요합니다</h2>
            <p>추첨을 시작하려면 상품과 참가자를 설정해주세요.</p>
            <button className="back-button" onClick={handleBackToSettings}>
              ← 설정으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="drawing-page"
      style={{
        backgroundColor: settings.bgColor,
        color: settings.textColor,
      }}
    >
      <div className="drawing-container">
        <div className="prize-display">
          <h2 style={{ color: settings.textColor }}>
            {currentPrize?.name || "상품명"}
          </h2>
          <p className="prize-info">
            남은 상품: {prizes.length}개 | 참가자: {participants.length}명
          </p>
        </div>

        <div className="rolling-display">
          <div
            className="rolling-container-inner"
            style={{
              borderColor: settings.accentColor,
            }}
          >
            <div className="rolling-viewport">
              <div
                ref={rollingListRef}
                className={`rolling-list ${isRolling ? "rolling" : ""}`}
                style={{
                  color: settings.textColor,
                  transform: "translateY(0)", // 초기 위치: 첫 번째 아이템이 viewport 상단에
                }}
              >
                {rollingItems.map((participant, index) => (
                  <div key={participant.uniqueId} className="rolling-item">
                    {participant.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="draw-controls">
          {!isRolling && !showResult && (
            <button
              className="draw-button"
              style={{
                backgroundColor: settings.accentColor,
                color: settings.textColor,
              }}
              onClick={startRolling}
            >
              🎲 추첨하기
            </button>
          )}

          {isRolling && (
            <div className="rolling-status">
              <div className="spinner"></div>
              <p>추첨 중... 잠시만 기다려주세요</p>
            </div>
          )}

          <button className="back-button" onClick={handleBackToSettings}>
            ← 설정으로 돌아가기
          </button>
        </div>

        {/* 결과 모달 */}
        {showResult && winner && (
          <div className="result-display">
            <div className="result-content">
              <div className="winner-message" style={{ color: "#333" }}>
                {settings.winMessage}
              </div>
              <div
                className="winner-name"
                style={{ color: settings.accentColor }}
              >
                {winner.name}
              </div>
              <div className="winner-prize" style={{ color: "#666" }}>
                🎁 {currentPrize.name}
              </div>
              <div className="result-buttons">
                <button className="next-draw-btn" onClick={handleNextDraw}>
                  {prizes.length > 1 ? "다음 추첨" : "추첨 완료"}
                </button>
                <button className="roll-again-btn" onClick={handleRollAgain}>
                  다시 추첨
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DrawingPage;
