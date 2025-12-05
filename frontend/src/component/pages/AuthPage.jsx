import React, { useState } from "react";
import "./AuthPage.css";
import Rules from "../auth/Rules";
import AuthForm from "../auth/AuthForm";

export default function AuthPage() {
  const [showRules, setShowRules] = useState(false);

  const handleShowRules = () => {
    setShowRules(true);
  };

  const handleCloseRules = () => {
    setShowRules(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-root-scale">
        <div className="auth-container">
          <button className="auth-close">✖</button>

          <h1 className="auth-title">Игра менеджмент</h1>

          <AuthForm />

          <div className="rules-link" onClick={handleShowRules}>
            <span className="rules-icon">📖</span>
            <span>Справка</span>
          </div>

          {showRules && <Rules onClose={handleCloseRules} />}
        </div>
      </div>
    </div>
  );
}
