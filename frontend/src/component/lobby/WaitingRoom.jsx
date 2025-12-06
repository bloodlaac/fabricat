import React from "react";
import "./WaitingRoom.css";
import Button from "../atoms/Button";

export default function WaitingRoom({ onClose, onSettings }) {
  return (
    <div className="wr-page">
      <div className="wr-header">
        <button className="wr-icon" onClick={onClose}>←</button>

        <div className="wr-title">Ожидание игроков</div>

        <button className="wr-icon" onClick={onSettings}>⚙</button>
      </div>

      <div className="wr-card">
        <div className="wr-card-title">Игроки</div>
        <div className="wr-player">login2005@mail.ru</div>
        <div className="wr-player">login2005@mail.ru</div>
        <div className="wr-player">login2005@mail.ru</div>
      </div>
    </div>
  );
}
