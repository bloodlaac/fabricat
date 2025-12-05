import React from "react";
import "./ErrorMessage.css";

export default function ErrorMessage({text}){
  if(!text) return null;
  return <div className="error-box">{text}</div>;
}
