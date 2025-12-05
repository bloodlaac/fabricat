import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./component/pages/AuthPage";
import AccountPage from "./component/pages/AccountPage";
import GamePage from "./component/pages/GamePage";

import "./index.css";

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage/>}/>
        <Route path="/account" element={<AccountPage/>}/>
        <Route path="/game" element={<GamePage/>}/>
      </Routes>
    </BrowserRouter>
  );
}
