import { useState } from "react";
import "./SettingsPage.css";

function SettingsPage({
  prizes,
  setPrizes,
  participants,
  setParticipants,
  settings,
  setSettings,
  addPrize,
  removePrize,
  addParticipant,
  removeParticipant,
}) {
  const [prizeInput, setPrizeInput] = useState("");
  const [participantInput, setParticipantInput] = useState("");

  const handleAddPrize = () => {
    if (prizeInput.trim()) {
      const success = addPrize(prizeInput.trim());
      if (success) {
        setPrizeInput("");
      } else {
        alert(
          `"${prizeInput.trim()}" 상품이 이미 존재합니다.\n다른 이름을 입력해 주세요.`
        );
      }
    }
  };

  const handleRemovePrize = (id) => {
    removePrize(id);
  };

  const handleAddParticipant = () => {
    if (participantInput.trim()) {
      const success = addParticipant(participantInput.trim());
      if (success) {
        setParticipantInput("");
      } else {
        alert(
          `"${participantInput.trim()}" 참가자가 이미 존재합니다.\n다른 이름을 입력해 주세요.`
        );
      }
    }
  };

  const handleRemoveParticipant = (id) => {
    removeParticipant(id);
  };

  const handleSettingChange = (key, value) => {
    setSettings({ [key]: value });
  };

  const handleKeyPress = (e, action) => {
    if (e.key === "Enter") {
      action();
    }
  };

  return (
    <div className="settings-page">
      <div className="container">
        <h2>추첨 설정</h2>

        {/* 상품 설정 */}
        <div className="settings-section">
          <h3>🎁 상품 설정</h3>
          <div className="input-group">
            <input
              type="text"
              value={prizeInput}
              onChange={(e) => setPrizeInput(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleAddPrize)}
              placeholder="상품명을 입력하세요"
              maxLength={100}
            />
            <button onClick={handleAddPrize} disabled={!prizeInput.trim()}>
              추가
            </button>
          </div>
          <ul className="item-list">
            {prizes.map((prize) => (
              <li key={prize.id} className="item">
                <span>{prize.name}</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemovePrize(prize.id)}
                  aria-label="상품 삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {prizes.length === 0 && (
            <p className="empty-message">추가된 상품이 없습니다.</p>
          )}
        </div>

        {/* 참가자 설정 */}
        <div className="settings-section">
          <h3>👥 참가자 설정</h3>
          <div className="input-group">
            <input
              type="text"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleAddParticipant)}
              placeholder="참가자명을 입력하세요"
              maxLength={50}
            />
            <button
              onClick={handleAddParticipant}
              disabled={!participantInput.trim()}
            >
              추가
            </button>
          </div>
          <ul className="item-list">
            {participants.map((participant) => (
              <li key={participant.id} className="item">
                <span>{participant.name}</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveParticipant(participant.id)}
                  aria-label="참가자 삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {participants.length === 0 && (
            <p className="empty-message">추가된 참가자가 없습니다.</p>
          )}
        </div>

        {/* 외관 설정 */}
        <div className="settings-section">
          <h3>🎨 외관 설정</h3>
          <div className="appearance-settings">
            <div className="setting-item">
              <label htmlFor="bgColor">배경 색상:</label>
              <input
                type="color"
                id="bgColor"
                value={settings.bgColor}
                onChange={(e) => handleSettingChange("bgColor", e.target.value)}
              />
            </div>
            <div className="setting-item">
              <label htmlFor="textColor">글자 색상:</label>
              <input
                type="color"
                id="textColor"
                value={settings.textColor}
                onChange={(e) =>
                  handleSettingChange("textColor", e.target.value)
                }
              />
            </div>
            <div className="setting-item">
              <label htmlFor="accentColor">강조 색상:</label>
              <input
                type="color"
                id="accentColor"
                value={settings.accentColor}
                onChange={(e) =>
                  handleSettingChange("accentColor", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* 메시지 설정 */}
        <div className="settings-section">
          <h3>💬 메시지 설정</h3>
          <div className="setting-item">
            <label htmlFor="winMessage">당첨 메시지:</label>
            <input
              type="text"
              id="winMessage"
              value={settings.winMessage}
              onChange={(e) =>
                handleSettingChange("winMessage", e.target.value)
              }
              maxLength={100}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
