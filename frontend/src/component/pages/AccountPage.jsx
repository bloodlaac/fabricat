import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AccountPage.css";
import CreateGameCard from "../ui/CreateGameCard";
import JoinGameCard from "../ui/JoinGameCard";
import StatsCard from "../ui/StatsCard";
import Rules from "../auth/Rules";
import { clearAuth, loadAuth } from "../../state/auth";

export default function AccountPage() {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [auth, setAuth] = useState(() => loadAuth());

  useEffect(() => {
    if (!auth) {
      navigate("/");
    }
  }, [auth, navigate]);

  const user = auth?.user;

  const userInitial = useMemo(() => (user?.nickname ? user.nickname[0]?.toUpperCase() : "–"), [user]);

  const handleLogout = () => {
    clearAuth();
    setAuth(null);
    navigate("/");
  };

  const handleStartGame = (sessionCode) => {
    setActiveCard(null);
    navigate("/game", { state: { sessionCode: sessionCode || null } });
  };

  return (
    <div className="account-page">
      <div className="account-header">
        <button className="logout-btn" onClick={handleLogout}>Выйти</button>

        <div
          className="user-info"
          onClick={() => setActiveCard("stats")}
          style={{ cursor: "pointer" }}
        >
          <span className="user-nick">{user?.nickname || "—"}</span>
          <div className="user-avatar">{userInitial}</div>
        </div>
      </div>

      <div className="account-center">
        <button className="account-btn" onClick={() => setActiveCard("create")}>
          Создать
        </button>
        <button className="account-btn" onClick={() => setActiveCard("join")}>
          Присоединиться
        </button>
      </div>

      <div className="rules-link" onClick={() => setShowRules(true)}>
        Справка
      </div>
      {showRules && <Rules onClose={() => setShowRules(false)} />}

      {activeCard === "create" && (
        <CreateGameCard onClose={() => setActiveCard(null)} onStartGame={handleStartGame} />
      )}
      {activeCard === "join" && (
        <JoinGameCard onClose={() => setActiveCard(null)} onStartGame={handleStartGame} />
      )}
      {activeCard === "stats" && (
        <StatsCard onClose={() => setActiveCard(null)} token={auth?.token?.access_token} />
      )}
    </div>
  );
}
