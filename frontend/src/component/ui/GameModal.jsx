import React from "react";
import CreateGameCard from "./CreateGameCard";
import JoinGameCard from "./JoinGameCard";

export default function GameModal({ type, onClose }) {
  // type = "create" | "join"
  return (
    <>
      {type === "create" && <CreateGameCard onClose={onClose} />}
      {type === "join" && <JoinGameCard onClose={onClose} />}
    </>
  );
}
