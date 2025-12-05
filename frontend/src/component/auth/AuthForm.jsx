import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthForm.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";
import RegistrationForm from "./RegistrationForm"; // импортируем форму регистрации

export default function AuthForm() {
  const navigate = useNavigate();
  const [showRegistration, setShowRegistration] = useState(false);

  const handleLogin = () => {
    // проверка логина/пароля при необходимости
    navigate("/account");
  };

  const handleShowRegistration = () => {
    setShowRegistration(true); // переключаемся на форму регистрации
  };

  const handleBackToLogin = () => {
    setShowRegistration(false); // возвращаемся на форму логина
  };

  if (showRegistration) {
    return <RegistrationForm onBack={handleBackToLogin} />; // показываем форму регистрации
  }

  return (
    <div className="auth-form">
      <div className="auth-user-icon">👤</div>

      <Input placeholder="Логин" className="auth-input" />
      <Input placeholder="Пароль" type="password" className="auth-input" />

      <div className="auth-buttons">
        <Button className="auth-btn" onClick={handleLogin}>
          Вход
        </Button>
        <Button className="auth-btn" onClick={handleShowRegistration}>
          Регистрация
        </Button>
      </div>
    </div>
  );
}
