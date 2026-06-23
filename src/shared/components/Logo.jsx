import React from "react";

export default function Logo({ size = 28 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background:
          "linear-gradient(150deg, var(--accent), var(--accent-press))",
        display: "grid",
        placeItems: "center",
        boxShadow: "var(--sh-sm)",
        flex: "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: size * 0.42,
          height: size * 0.42,
          transform: "rotate(45deg)",
          border: `${Math.max(2, size * 0.07)}px solid #fff`,
          borderRadius: size * 0.05,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: size * 0.13,
          height: size * 0.13,
          background: "#fff",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}