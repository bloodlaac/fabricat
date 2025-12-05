import React from "react";
import "./RegistrationForm.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";

export default function RegistrationForm({ onBack }) {
  return (
    <div className="reg-overlay">
      <div className="reg-card">
        <div className="reg-header">
          <div className="avatar-select">👤</div>
          <div className="reg-title">Регистрация</div>
        </div>

        <div className="reg-fields">
          <Input placeholder="Имя" className="reg-input" />
          <Input placeholder="Email" className="reg-input" />
          <Input placeholder="Пароль" type="password" className="reg-input" />
          <Input placeholder="Никнейм" className="reg-input" />
        </div>

        <div className="reg-buttons">
          <Button onClick={onBack} className="reg-back">
            ← Назад
          </Button>
          <Button className="reg-submit">
            Зарегистрироваться
          </Button>
        </div>
      </div>
    </div>
  );
}
