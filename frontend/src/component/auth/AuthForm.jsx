import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthForm.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";
import RegistrationForm from "./RegistrationForm";
import { loginUser } from "../../api/client";
import { saveAuth } from "../../state/auth";

export default function AuthForm() {
  const navigate = useNavigate();
  const [showRegistration, setShowRegistration] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => nickname.trim().length > 0 && password.trim().length > 0 && !loading,
    [nickname, password, loading],
  );

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const data = await loginUser({ nickname: nickname.trim(), password });
      saveAuth(data);
      navigate("/account");
    } catch (err) {
      const message = err?.message || "Не удалось войти";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowRegistration = () => {
    setShowRegistration(true);
  };

  const handleBackToLogin = () => {
    setShowRegistration(false);
    setError("");
  };

  if (showRegistration) {
    return (
      <RegistrationForm
        onBack={handleBackToLogin}
        onRegistered={() => navigate("/account")}
      />
    );
  }

  return (
    <div className="auth-form">
      <div className="auth-user-icon">👤</div>

      <Input
        placeholder="Никнейм"
        className="auth-input"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <Input
        placeholder="Пароль"
        type="password"
        className="auth-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="auth-error">{error}</div>}

      <div className="auth-buttons">
        <Button className="auth-btn" onClick={handleLogin} disabled={!canSubmit}>
          {loading ? "Входим..." : "Вход"}
        </Button>
        <Button className="auth-btn" onClick={handleShowRegistration} disabled={loading}>
          Регистрация
        </Button>
      </div>
    </div>
  );
}
