import React from "react";
import "./ActionInfo.css";

export default function ActionInfo({ text, onCancel, onAgree }) {
  return (
    <div className="action-info-overlay">
      <div className="action-info-container">
        <div className="action-info-header">
          <button className="action-btn" onClick={onCancel}>Отмена</button>
          <div className="action-title">Информация о действии</div>
          <button className="action-btn" onClick={onAgree}>Согласен</button>
        </div>
        <div className="action-info-body">
          {text || "Здесь появится подсказка/описание действия."}
        </div>
      </div>
    </div>
  );
}
