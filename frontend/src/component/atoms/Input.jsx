import React from "react";
import "./Input.css";

export default function Input({ placeholder, type = "text", className="", ...rest }) {
  return (
    <input 
      className={`input-base ${className}`} 
      placeholder={placeholder} 
      type={type} 
      {...rest} 
    />
  );
}
