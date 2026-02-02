import React from "react";
import "./HexLoader.css";

export type HexLoaderProps = {
  size?: number; // px
  label?: string;
  className?: string;
};

export const HexLoader: React.FC<HexLoaderProps> = ({ size = 72, label, className }) => {
  // CSS-driven loader; size controlled via a CSS variable.
  return (
    <div
      className={`hex-loader ${className ?? ""}`.trim()}
      role="status"
      aria-label={label || "Loading"}
      style={{ ["--cube-size" as string]: `${size}px` }}
    >
      <div className="spinner">
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>
      {label && <div className="hex-label">{label}</div>}
    </div>
  );
};
