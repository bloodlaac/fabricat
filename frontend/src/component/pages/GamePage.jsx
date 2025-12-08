import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./GamePage.css";
import { buildWsUrl, refreshToken } from "../../api/client";
import { loadAuth, saveAuth } from "../../state/auth";
import bankImg from "../../assets/bank.png";
import basicFactoryImg from "../../assets/basic_fabric.png";
import autoFactoryImg from "../../assets/auto_fabric.png";
import astronautImg from "../../assets/astronaut.png";
import botanistImg from "../../assets/botanist.png";
import captainImg from "../../assets/captain.png";
import diverImg from "../../assets/diver.png";
import engineerImg from "../../assets/engineer.png";
import geologistImg from "../../assets/geologist.png";
import hackerImg from "../../assets/hacker.png";
import inventorImg from "../../assets/inventor.png";
import pilotImg from "../../assets/pilot.png";
import scientistImg from "../../assets/scientist.png";

const ACTIONS_BY_PHASE = {
  buy: ["submit_buy_bid", "skip"],
  production: ["production_plan", "skip"],
  sell: ["submit_sell_bid", "skip"],
  loans: ["loan_decision", "skip"],
  construction: ["construction_request", "skip"],
};

const PHASE_LABELS = {
  expenses: "Расходы",
  market: "Рынок",
  buy: "Покупка",
  production: "Производство",
  sell: "Продажа",
  loans: "Кредиты",
  construction: "Стройка",
  end_month: "Завершение месяца",
};

const PLAYER_COLORS = ["#FF8BA7", "#7DD3FC", "#A7F3D0", "#FBCFE8"];
const AVATAR_MAP = {
  astronaut: astronautImg,
  botanist: botanistImg,
  captain: captainImg,
  diver: diverImg,
  engineer: engineerImg,
  geologist: geologistImg,
  hacker: hackerImg,
  inventor: inventorImg,
  pilot: pilotImg,
  scientist: scientistImg,
};
const AVATAR_POOL = Object.values(AVATAR_MAP);

const formatNumber = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value.toLocaleString("ru-RU");
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed.toLocaleString("ru-RU");
};

const avatarByKey = (key, fallbackIdx = 0) => {
  if (!AVATAR_POOL.length) return null;
  const str = key === undefined || key === null ? "" : String(key);
  if (!str) return AVATAR_POOL[fallbackIdx % AVATAR_POOL.length];

  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_POOL.length;
  return AVATAR_POOL[idx];
};

const resolveAvatar = (iconKey, hashKey, fallbackIdx = 0) => {
  if (iconKey && AVATAR_MAP[iconKey]) return AVATAR_MAP[iconKey];
  return avatarByKey(hashKey || iconKey || "", fallbackIdx);
};

const formatPlace = (place) => {
  if (!place) return "— место";
  const suffix = place === 1 ? "место 🏆" : "место";
  return `${place} ${suffix}`;
};

const normalizeFactories = (player) => {
  const counts = { basic: 0, auto: 0 };
  if (!player) return counts;

  const add = (type, amount = 1) => {
    const normalizedAmount = Math.max(0, Number(amount) || 0);
    if (!normalizedAmount) return;
    if (["auto", "builds_auto", "upgrades"].includes(type)) {
      counts.auto += normalizedAmount;
      return;
    }
    counts.basic += normalizedAmount;
  };

  if (player.factories_by_type && typeof player.factories_by_type === "object") {
    Object.entries(player.factories_by_type).forEach(([type, amount]) => add(type, amount));
    return counts;
  }

  if (Array.isArray(player.factory_types)) {
    player.factory_types.forEach((type) => add(type, 1));
    return counts;
  }

  if (typeof player.factories_basic === "number") add("basic", player.factories_basic);
  if (typeof player.factories_auto === "number") add("auto", player.factories_auto);

  if (!counts.basic && !counts.auto && typeof player.factories === "number") {
    add("basic", player.factories);
  }

  return counts;
};

const initialActionState = {
  buyQty: 0,
  buyPrice: 0,
  sellQty: 0,
  sellPrice: 0,
  prodBasic: 0,
  prodAuto: 0,
  loanSlot: 0,
  loanDecision: "skip",
  construction: "idle",
};

const initialActionLocks = {
  buy: false,
  sell: false,
  production: false,
  loan: false,
  construction: false,
};

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedSessionCode = location.state?.sessionCode ?? null;
  const [auth, setAuth] = useState(() => loadAuth());
  const token = auth?.token?.access_token;
  const user = auth?.user;

  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [sessionCode, setSessionCode] = useState(requestedSessionCode || "");
  const [phase, setPhase] = useState(null);
  const [month, setMonth] = useState(null);
  const [tick, setTick] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [lastError, setLastError] = useState("");
  const [actionState, setActionState] = useState(initialActionState);
  const [actionLocks, setActionLocks] = useState(initialActionLocks);
  const [isBankrupt, setIsBankrupt] = useState(false);
  const [finalResults, setFinalResults] = useState(null);
  const [playerCount, setPlayerCount] = useState(1);
  const [settings, setSettings] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const socketRef = useRef(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const ws = new WebSocket(buildWsUrl(token));
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      const joinPayload = {
        type: "join",
        session_code: requestedSessionCode || null,
      };
      ws.send(JSON.stringify(joinPayload));
    };

    ws.onclose = async (event) => {
      if (event.code === 1008 || event.code === 403 || event.code === 4401) {
        await attemptRefresh();
        return;
      }
      setConnectionStatus("closed");
    };

    ws.onerror = () => {
      setConnectionStatus("error");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch {
        setLastError("Не удалось прочитать сообщение от сервера");
      }
    };

    return () => {
      ws.close();
    };
  }, [navigate, requestedSessionCode, token]);

  const attemptRefresh = async () => {
    if (isRefreshingRef.current || !token) return;
    isRefreshingRef.current = true;
    try {
      const newToken = await refreshToken({ token });
      const updatedAuth = { ...auth, token: newToken };
      saveAuth(updatedAuth);
      setAuth(updatedAuth);
    } catch (err) {
      navigate("/");
    } finally {
      isRefreshingRef.current = false;
    }
  };

  const allowedActions = useMemo(
    () => ACTIONS_BY_PHASE[phase] || [],
    [phase],
  );

  const derivedStatus =
    connectionStatus === "ready" && playerCount < 2
      ? "waiting"
      : connectionStatus;

  const statusLabel = {
    connecting: "Подключаемся",
    connected: "Готово к входу",
    ready: "Готов",
    running: "Идет игра",
    waiting: "Ждем игроков",
    closed: "Закрыто",
    error: "Ошибка",
  }[derivedStatus] || derivedStatus;

  const userAvatarSrc = resolveAvatar(
    user?.icon,
    user?.nickname || user?.id_ || user?.id || "you",
  );

  const playersForBoard = useMemo(() => {
    const list = Array.isArray(analytics?.players) ? analytics.players.slice(0, 4) : [];
    const totalPlayers = list.length;
    const inferredSelfId = totalPlayers === 1 ? list[0]?.player_id : null;

    return list.map((player, idx) => {
      const isSelf = inferredSelfId !== null && player?.player_id === inferredSelfId;
      const label =
        player?.nickname ||
        player?.name ||
        player?.user_nickname ||
        (isSelf ? user?.nickname : null) ||
        (totalPlayers === 1 ? user?.nickname : null) ||
        "Игрок";

      const avatar = resolveAvatar(
        player?.icon || (isSelf ? user?.icon : null) || (totalPlayers === 1 ? user?.icon : null),
        player?.player_id ?? idx,
        idx,
      );

      return {
        id: player?.player_id ?? idx + 1,
        label,
        avatar,
        money: player?.money,
        raw_materials: player?.raw_materials,
        finished_goods: player?.finished_goods,
        factories: normalizeFactories(player),
        bankrupt: Boolean(player?.bankrupt),
        color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      };
    });
  }, [analytics, user]);

  const myFinalResult = useMemo(() => {
    if (!finalResults || !finalResults.length) return null;
    const byNickname = finalResults.find((r) => r.nickname && r.nickname === user?.nickname);
    if (byNickname) return byNickname;
    const byTop = finalResults.find((r) => r.is_top1);
    return byTop || finalResults[0];
  }, [finalResults, user]);

  useEffect(() => {
    if (phase === "end_month") {
      setActionLocks(initialActionLocks);
    }
  }, [phase]);

  useEffect(() => {
    if (!analytics || !user?.nickname) return;
    const me = analytics.players?.find(
      (p) => p.nickname === user.nickname || p.name === user.nickname,
    );
    setIsBankrupt(Boolean(me?.bankrupt));
  }, [analytics, user]);

  const updateSettings = () => {
    if (!settingsDraft) return;
    const payload = { ...settingsDraft };

    const normalizeRange = (value) => {
      if (Array.isArray(value)) return value.map((v) => Number(v) || 0);
      return [0, 0];
    };

    payload.bank_raw_material_sell_volume_range = normalizeRange(
      payload.bank_raw_material_sell_volume_range,
    );
    payload.bank_finished_good_buy_volume_range = normalizeRange(
      payload.bank_finished_good_buy_volume_range,
    );
    payload.bank_raw_material_sell_min_price_range = normalizeRange(
      payload.bank_raw_material_sell_min_price_range,
    );
    payload.bank_finished_good_buy_max_price_range = normalizeRange(
      payload.bank_finished_good_buy_max_price_range,
    );

  const normalizeList = (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((v) => Number(v.trim()))
            .filter((v) => !Number.isNaN(v))
        : value || [];

    payload.available_loans = normalizeList(payload.available_loans);
    payload.loan_terms_in_months = normalizeList(payload.loan_terms_in_months);

    sendMessage({
      type: "session_control",
      command: "update_settings",
      settings: payload,
    });
    setShowSettings(false);
  };

  const handleMessage = (data) => {
    switch (data.type) {
      case "welcome":
        setSessionCode(data.session_code);
        setPhase(data.phase);
        setMonth(data.month);
        setAnalytics(data.analytics);
        setFinalResults(null);
        setIsBankrupt(false);
        setPlayerCount(data.analytics?.players?.length || 1);
        setSettings(data.settings);
        setSettingsDraft(data.settings);
        setConnectionStatus("ready");
        setLastError("");
        break;
      case "phase_tick":
        setTick(data.tick);
        setPhase(data.tick.phase);
        break;
      case "phase_report":
        setLastReport(data.report);
        setMonth(data.report.month);
        setPhase(data.report.phase);
        setAnalytics(data.report.analytics);
        setConnectionStatus("running");
        break;
      case "game_finished":
        setFinalResults(data.results || []);
        setIsBankrupt(false);
        setConnectionStatus("closed");
        break;
      case "phase_status":
        setPhase(data.phase);
        setMonth(data.month);
        setAnalytics(data.analytics);
        setTick((prev) => ({ ...prev, remaining_seconds: data.remaining_seconds }));
        setPlayerCount(data.analytics?.players?.length || playerCount);
        if (data.settings) {
          setSettings(data.settings);
          setSettingsDraft((prev) => prev || data.settings);
        }
        setConnectionStatus(
          data.remaining_seconds === undefined || data.remaining_seconds === null
            ? "ready"
            : "running",
        );
        break;
      case "action_ack":
        setLastError("");
        break;
      case "session_control_ack":
        setConnectionStatus(data.started ? "running" : "ready");
        break;
      case "error":
        setLastError(data.message || "Ошибка");
        if (data.message === "Invalid token") {
          attemptRefresh();
        }
        break;
      default:
        break;
    }
  };

  const sendMessage = (payload) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLastError("Соединение с сервером не готово");
      attemptRefresh();
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  const lockAction = (key) =>
    setActionLocks((prev) => ({ ...prev, [key]: true }));

  const startSession = () => sendMessage({ type: "session_control", command: "start" });

  const sendBuy = () => {
    if (!phase || !allowedActions.includes("submit_buy_bid")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "submit_buy_bid",
        quantity: Number(actionState.buyQty) || 0,
        price: Number(actionState.buyPrice) || 0,
      },
    });
    lockAction("buy");
  };

  const sendSell = () => {
    if (!phase || !allowedActions.includes("submit_sell_bid")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "submit_sell_bid",
        quantity: Number(actionState.sellQty) || 0,
        price: Number(actionState.sellPrice) || 0,
      },
    });
    lockAction("sell");
  };

  const sendProductionPlan = () => {
    if (!phase || !allowedActions.includes("production_plan")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "production_plan",
        basic: Number(actionState.prodBasic) || 0,
        auto: Number(actionState.prodAuto) || 0,
      },
    });
    lockAction("production");
  };

  const sendLoanDecision = () => {
    if (!phase || !allowedActions.includes("loan_decision")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "loan_decision",
        slot: Number(actionState.loanSlot) || 0,
        decision: actionState.loanDecision,
      },
    });
    lockAction("loan");
  };

  const triggerLoanDecision = (slot, decision) => {
    if (!phase || !allowedActions.includes("loan_decision")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: { kind: "loan_decision", slot, decision },
    });
    lockAction("loan");
  };

  const sendConstructionRequest = () => {
    if (!phase || !allowedActions.includes("construction_request")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "construction_request",
        project: actionState.construction,
      },
    });
    lockAction("construction");
  };

  const handleLeave = () => {
    navigate("/account");
  };

  return (
    <div className="game-page">
      {finalResults && finalResults.length > 0 && (
        <div className="endgame-overlay">
          <div className="endgame-card">
            <div className="endgame-title">Игра завершена</div>
            {myFinalResult && (
              <div className="endgame-highlight">
                <div className="endgame-place">{formatPlace(myFinalResult.place)}</div>
                <div className="endgame-capital">
                  Капитал: {formatNumber(myFinalResult.capital, "—")} ₽
                </div>
              </div>
            )}
            <div className="endgame-list">
              {finalResults.map((res) => (
                <div key={res.player_id} className="endgame-row">
                  <div className="endgame-name">
                    {res.nickname || `Игрок ${res.player_id}`}
                    {res.is_top1 && <span className="endgame-badge">🏆</span>}
                    {res.is_bankrupt && <span className="endgame-badge bankrupt">банкрот</span>}
                  </div>
                  <div className="endgame-meta">
                    <span>{formatPlace(res.place)}</span>
                    <span>Капитал: {formatNumber(res.capital, "—")} ₽</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bankrupt-actions">
              <button className="control-btn" onClick={handleLeave}>Выйти</button>
            </div>
          </div>
        </div>
      )}

      {isBankrupt && (
        <div className="bankrupt-overlay">
          <div className="bankrupt-card">
            <div className="bankrupt-title">Вы банкрот 😔</div>
            <div className="bankrupt-text">
              Игра окончена для вашего игрока. Вы можете наблюдать за ходом игры или выйти в аккаунт.
            </div>
            <div className="bankrupt-actions">
              <button className="control-btn" onClick={handleLeave}>Выйти</button>
            </div>
          </div>
        </div>
      )}

      <div className="div1">
        <div className="board-surface">
          <div className="board-track" />
          <div className="bank-node">
            <div className="bank-illustration">
              <img src={bankImg} alt="Банк" />
            </div>
            <div className="bank-stats">
              <div className="bank-title">Банк</div>
              <div className="bank-flow">
                <span className="arrow arrow-sell" title="Банк продает сырье">↗</span>
                <div className="flow-text">
                  <div className="flow-label">Продает сырье</div>
                  <div className="flow-value">
                    {formatNumber(analytics?.bank_raw_material_volume, "—")} ед. по{" "}
                    {formatNumber(analytics?.bank_raw_material_min_price, "—")}
                  </div>
                </div>
              </div>
              <div className="bank-flow">
                <span className="arrow arrow-buy" title="Банк покупает товары">↙</span>
                <div className="flow-text">
                  <div className="flow-label">Покупает товары</div>
                  <div className="flow-value">
                    {formatNumber(analytics?.bank_finished_good_volume, "—")} ед. до{" "}
                    {formatNumber(analytics?.bank_finished_good_max_price, "—")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {playersForBoard.map((player, idx) => (
            <div
              key={player.id ?? idx}
              className={`player-slot slot-${idx}${player.bankrupt ? " bankrupt" : ""}`}
            >
              <div
                className="player-avatar"
                style={{
                  borderColor: player.color,
                  boxShadow: `0 6px 14px ${player.color}44, 0 0 0 4px ${player.color}22`,
                }}
              >
                {player.avatar ? (
                  <img src={player.avatar} alt={player.label} />
                ) : (
                  <span>{String(player.label).slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="player-card">
                <div className="player-name">
                  {player.label}
                  {player.bankrupt && <span className="player-status">банкрот</span>}
                </div>
                <div className="player-resources">
                  <span>💰 {formatNumber(player.money, "—")}</span>
                  <span>🧱 {formatNumber(player.raw_materials, "—")}</span>
                  <span>📦 {formatNumber(player.finished_goods, "—")}</span>
                </div>
                <div className="factory-strip">
                  {Array.from({ length: player.factories.basic || 0 }).map((_, factoryIdx) => (
                    <img
                      key={`basic-${factoryIdx}`}
                      className="factory-icon"
                      src={basicFactoryImg}
                      alt="Базовая фабрика"
                    />
                  ))}
                  {Array.from({ length: player.factories.auto || 0 }).map((_, factoryIdx) => (
                    <img
                      key={`auto-${factoryIdx}`}
                      className="factory-icon"
                      src={autoFactoryImg}
                      alt="Автоматическая фабрика"
                    />
                  ))}
                  {!player.factories.basic && !player.factories.auto && (
                    <span className="factory-empty">нет фабрик</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="div2">
        <div className="top-row">
          <div className="user-info">
            <div className="nickname">{user?.nickname || "Игрок"}</div>
            <div className="avatar" title={user?.icon || user?.nickname || ""}>
              {userAvatarSrc ? (
                <img src={userAvatarSrc} alt="Аватар" />
              ) : (
                <span>{user?.icon?.[0]?.toUpperCase() || "?"}</span>
              )}
            </div>
          </div>
          <div className="session-info">
            <div className="session-code">Код: {sessionCode || "—"}</div>
            <div className="session-status">
              Статус: {statusLabel}
            </div>
          </div>
        </div>

        <div className="phase-block">
          <div>Месяц: {month ?? "—"}</div>
          <div>Фаза: {PHASE_LABELS[phase] || phase || "—"}</div>
          <div>Осталось: {tick?.remaining_seconds ?? "—"} сек</div>
        </div>

        <div className="action-forms">
          <div className={`action-card${actionLocks.buy ? " locked" : ""}`}>
            <div className="action-title">Покупка</div>
            <div className="action-row">
              <label>Кол-во</label>
              <input
                type="number"
                value={actionState.buyQty}
                onChange={(e) => setActionState({ ...actionState, buyQty: e.target.value })}
              />
              <label>Цена</label>
              <input
                type="number"
                value={actionState.buyPrice}
                onChange={(e) => setActionState({ ...actionState, buyPrice: e.target.value })}
              />
              <button onClick={sendBuy} disabled={!allowedActions.includes("submit_buy_bid")}>
                Отправить
              </button>
            </div>
          </div>

          <div className={`action-card${actionLocks.production ? " locked" : ""}`}>
            <div className="action-title">Производство</div>
            <div className="action-row">
              <label>Базовые</label>
              <input
                type="number"
                value={actionState.prodBasic}
                onChange={(e) => setActionState({ ...actionState, prodBasic: e.target.value })}
              />
              <label>Авто</label>
              <input
                type="number"
                value={actionState.prodAuto}
                onChange={(e) => setActionState({ ...actionState, prodAuto: e.target.value })}
              />
              <button
                onClick={sendProductionPlan}
                disabled={actionLocks.production || !allowedActions.includes("production_plan")}
              >
                Отправить
              </button>
            </div>
          </div>

          <div className={`action-card${actionLocks.sell ? " locked" : ""}`}>
            <div className="action-title">Продажа</div>
            <div className="action-row">
              <label>Кол-во</label>
              <input
                type="number"
                value={actionState.sellQty}
                onChange={(e) => setActionState({ ...actionState, sellQty: e.target.value })}
              />
              <label>Цена</label>
              <input
                type="number"
                value={actionState.sellPrice}
                onChange={(e) => setActionState({ ...actionState, sellPrice: e.target.value })}
              />
              <button
                onClick={sendSell}
                disabled={actionLocks.sell || !allowedActions.includes("submit_sell_bid")}
              >
                Отправить
              </button>
            </div>
          </div>

          <div className={`action-card${actionLocks.loan ? " locked" : ""}`}>
            <div className="action-title">Кредиты</div>
            <div className="loan-buttons">
              {analytics?.bank_loan_nominals?.map((amount, idx) => (
                <button
                  key={`loan-${idx}`}
                  className="loan-btn"
                  onClick={() => triggerLoanDecision(idx, "call")}
                  disabled={
                    actionLocks.loan ||
                    !allowedActions.includes("loan_decision") ||
                    (analytics?.bank_available_loans?.[idx] ?? 0) <= 0
                  }
                  title={`Срок: ${analytics?.bank_loan_terms?.[idx] ?? "?"} мес.`}
                >
                  Взять ссуду {amount} ({analytics?.bank_available_loans?.[idx] ?? 0} доступно)
                </button>
              ))}
              <button
                className="loan-btn secondary"
                onClick={() => triggerLoanDecision(0, "skip")}
                disabled={actionLocks.loan || !allowedActions.includes("loan_decision")}
              >
                Пропустить
              </button>
            </div>
          </div>

          <div className={`action-card${actionLocks.construction ? " locked" : ""}`}>
            <div className="action-title">Стройка</div>
            <div className="construction-row">
              {[
                { value: "build_basic", label: "Строить базовые" },
                { value: "build_auto", label: "Строить автоматические" },
                { value: "upgrade", label: "Улучшить" },
              ].map((opt) => (
                <label key={opt.value} className="radio-option">
                  <input
                    type="radio"
                    name="construction"
                    value={opt.value}
                    checked={actionState.construction === opt.value}
                    onChange={(e) =>
                      setActionState({ ...actionState, construction: e.target.value })
                    }
                    disabled={actionLocks.construction || !allowedActions.includes("construction_request")}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
              <button
                className="loan-btn"
                onClick={sendConstructionRequest}
                disabled={actionLocks.construction || !allowedActions.includes("construction_request")}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>

        {lastError && <div className="error-banner">{lastError}</div>}

        <div className="footer-controls">
          <button
            className="control-btn"
            onClick={() => setShowSettings(true)}
            disabled={connectionStatus !== "ready" || playerCount < 2}
            style={{
              visibility:
                connectionStatus === "ready" && playerCount >= 2 ? "visible" : "hidden",
            }}
          >
            Настройки
          </button>
          <button
            className="control-btn"
            onClick={startSession}
            disabled={connectionStatus !== "ready" || playerCount < 2}
            style={{
              visibility:
                connectionStatus === "ready" && playerCount >= 2 ? "visible" : "hidden",
            }}
          >
            Старт
          </button>
          <button className="leave-btn" onClick={handleLeave}>Покинуть игру</button>
        </div>

        {showSettings && settingsDraft && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Настройки лобби</div>
                <button className="card-close" onClick={() => setShowSettings(false)}>✖</button>
              </div>
              <div className="settings-grid">
                <label className="setting-field">
                  <span>Фабрик на старте</span>
                  <input
                    type="number"
                    value={settingsDraft.start_factory_count ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, start_factory_count: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Макс. месяцев</span>
                  <input
                    type="number"
                    value={settingsDraft.max_months ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, max_months: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Макс. фабрик</span>
                  <input
                    type="number"
                    value={settingsDraft.max_factories ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, max_factories: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Деньги банка на старте</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_start_money ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, bank_start_money: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Ссуды (через запятую)</span>
                  <input
                    type="text"
                    value={
                      Array.isArray(settingsDraft.available_loans)
                        ? settingsDraft.available_loans.join(", ")
                        : settingsDraft.available_loans ?? ""
                    }
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, available_loans: e.target.value })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Сроки ссуд (мес, через запятую)</span>
                  <input
                    type="text"
                    value={
                      Array.isArray(settingsDraft.loan_terms_in_months)
                        ? settingsDraft.loan_terms_in_months.join(", ")
                        : settingsDraft.loan_terms_in_months ?? ""
                    }
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, loan_terms_in_months: e.target.value })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Объем продажи сырья (min)</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_raw_material_sell_volume_range?.[0] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_raw_material_sell_volume_range: [
                          Number(e.target.value),
                          settingsDraft.bank_raw_material_sell_volume_range?.[1] ?? 0,
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Объем продажи сырья (max)</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_raw_material_sell_volume_range?.[1] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_raw_material_sell_volume_range: [
                          settingsDraft.bank_raw_material_sell_volume_range?.[0] ?? 0,
                          Number(e.target.value),
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Объем покупки товаров (min)</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_finished_good_buy_volume_range?.[0] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_finished_good_buy_volume_range: [
                          Number(e.target.value),
                          settingsDraft.bank_finished_good_buy_volume_range?.[1] ?? 0,
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Объем покупки товаров (max)</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_finished_good_buy_volume_range?.[1] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_finished_good_buy_volume_range: [
                          settingsDraft.bank_finished_good_buy_volume_range?.[0] ?? 0,
                          Number(e.target.value),
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Мин. цена сырья</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_raw_material_sell_min_price_range?.[0] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_raw_material_sell_min_price_range: [
                          Number(e.target.value),
                          settingsDraft.bank_raw_material_sell_min_price_range?.[1] ?? 0,
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Макс. цена сырья</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_raw_material_sell_min_price_range?.[1] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_raw_material_sell_min_price_range: [
                          settingsDraft.bank_raw_material_sell_min_price_range?.[0] ?? 0,
                          Number(e.target.value),
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Мин. цена покупки товара</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_finished_good_buy_max_price_range?.[0] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_finished_good_buy_max_price_range: [
                          Number(e.target.value),
                          settingsDraft.bank_finished_good_buy_max_price_range?.[1] ?? 0,
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Макс. цена покупки товара</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_finished_good_buy_max_price_range?.[1] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_finished_good_buy_max_price_range: [
                          settingsDraft.bank_finished_good_buy_max_price_range?.[0] ?? 0,
                          Number(e.target.value),
                        ],
                      })
                    }
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button className="leave-btn" onClick={() => setShowSettings(false)}>Отмена</button>
                <button className="control-btn" onClick={updateSettings}>Сохранить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
