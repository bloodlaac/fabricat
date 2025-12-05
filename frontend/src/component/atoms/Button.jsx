import React from "react";
import "./Button.css";

export default function Button({ children, className="", ...rest }) {
  return (
    <button className={`btn-base ${className}`} {...rest}>
      {children}
    </button>
  );
}
