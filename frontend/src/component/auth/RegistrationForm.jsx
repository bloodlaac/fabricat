import React, { useMemo, useState } from "react";
import "./RegistrationForm.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";
import { registerUser } from "../../api/client";
import { saveAuth } from "../../state/auth";

const ICONS = [
  "astronaut",
  "botanist",
  "captain",
  "diver",
  "engineer",
  "geologist",
  "hacker",
  "inventor",
  "pilot",
  "scientist",
];

export default function RegistrationForm({ onBack, onRegistered }) {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(
    () => nickname.trim().length >= 3 && password.length >= 8,
    [nickname, password],
  );

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Никнейм ≥3 символов, пароль ≥8 символов с цифрой и буквой");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await registerUser({
        nickname: nickname.trim(),
        password,
        icon,
      });
      saveAuth(data);
      if (typeof onRegistered === "function") {
        onRegistered();
      } else if (typeof onBack === "function") {
        onBack();
      }
      setSuccess("Готово! Перенаправляем...");
    } catch (err) {
      const message = err?.message || "Не удалось зарегистрироваться";
      setError(message);
      console.error("Register failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-overlay">
      <div className="reg-card">
        <div className="reg-header">
          <div className="avatar-select">👤</div>
          <div className="reg-title">Регистрация</div>
        </div>

        <div className="reg-fields">
          <Input
            placeholder="Никнейм"
            className="reg-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <Input
            placeholder="Пароль"
            type="password"
            className="reg-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="reg-select-row">
            <label className="reg-label">Аватар</label>
            <select
              className="reg-select"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            >
              {ICONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <div className="reg-buttons">
          <Button onClick={onBack} className="reg-back" disabled={loading}>
            ← Назад
          </Button>
          <Button className="reg-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Создаем..." : "Зарегистрироваться"}
          </Button>
        </div>
      </div>
    </div>
  );
}
