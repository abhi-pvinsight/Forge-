
import React, { useState } from "react";
import Logo from "../../../shared/components/Logo";
import Icon from "../../../shared/components/Icon";

// export default function SignIn({ onSignIn }) {
//   const [loading, setLoading] = useState(false);

//   const go = () => {
//     setLoading(true);

//     setTimeout(() => {
//       onSignIn?.();
//     }, 950);
//   };


// ---- Sign In -----------------------------------------------
export default function SignIn({ onSignIn, theme, onToggleTheme }) {
  const [loading, setLoading] = useState(false);
  const go = () => { setLoading(true); setTimeout(onSignIn, 950); };
  return (
  <div
    style={{
      height: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      background: "var(--surface)",
    }}
  >
    {/* Left: brand panel */}
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "48px 56px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "linear-gradient(155deg, oklch(0.30 0.05 200), oklch(0.22 0.04 220))",
        color: "#fff",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.10) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: "#fff",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          Forge
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div
          className="label-eyebrow"
          style={{ color: "oklch(0.82 0.05 162)" }}
        >
          Engineering Report Builder
        </div>

        <h1
          style={{
            fontSize: 38,
            lineHeight: 1.12,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "14px 0 18px",
            maxWidth: 460,
          }}
        >
          Every design basis report, coded once.
        </h1>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "oklch(0.86 0.01 220)",
            maxWidth: 430,
            margin: 0,
          }}
        >
          Templates, formulae and formatting for Electrical, Civil and
          Structure — embedded. Enter your inputs once, generate a
          standardized, review-ready document.
        </p>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          gap: 28,
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            12
          </div>
          <div
            style={{
              fontSize: 12,
              color: "oklch(0.78 0.01 220)",
              marginTop: 2,
            }}
          >
            Coded report types
          </div>
        </div>

        <div>
          <div
            className="mono"
            style={{
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            3
          </div>
          <div
            style={{
              fontSize: 12,
              color: "oklch(0.78 0.01 220)",
              marginTop: 2,
            }}
          >
            Engineering verticals
          </div>
        </div>

        <div>
          <div
            className="mono"
            style={{
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            100%
          </div>
          <div
            style={{
              fontSize: 12,
              color: "oklch(0.78 0.01 220)",
              marginTop: 2,
            }}
          >
            Standard formatting
          </div>
        </div>
      </div>
    </div>

    {/* Right: sign-in */}
    <div
      style={{
        display: "grid",
        placeItems: "center",
        padding: 40,
        position: "relative",
      }}
    >
      <button
        className="btn btn-ghost btn-sm"
        title="Switch theme"
        style={{
          position: "absolute",
          top: 22,
          right: 22,
          width: 34,
          padding: 0,
        }}
      >
        ☀️
      </button>

      <div
        className="fade-up"
        style={{
          width: 360,
          maxWidth: "100%",
        }}
      >
        <div className="label-eyebrow">PVinsight Inc.</div>

        <h2
          style={{
            fontSize: 25,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            margin: "8px 0 6px",
          }}
        >
          Sign in to Forge
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-2)",
            margin: "0 0 28px",
          }}
        >
          Use your corporate single sign-on to continue.
        </p>

        <button
          className="btn btn-lg"
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border-2)",
            color: "var(--text)",
            boxShadow: "var(--sh-sm)",
            fontWeight: 600,
          }} onClick={go} disabled={loading}
        >
          {loading
         ? "Authenticating..."
         : "Continue with PVinsight SSO"}
        </button>

        {/* <button onClick={go} disabled={loading}>
//       {loading
//         ? "Authenticating..."
//         : "Continue with PVinsight SSO"}
//     </button> */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "22px 0",
            color: "var(--text-4)",
            fontSize: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--border)",
            }}
          />
          <span className="mono">SAML 2.0 · Okta</span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--border)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 14px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
          }}
        >
          <div
            style={{
              width: 15,
              height: 15,
              background: "var(--text-3)",
              marginTop: 1,
            }}
          />

          <div
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              lineHeight: 1.5,
            }}
          >
            Access is governed by your engineering role. Report templates
            available to you depend on your assigned verticals.
          </div>
        </div>

        <p
          style={{
            fontSize: 11.5,
            color: "var(--text-4)",
            marginTop: 26,
            textAlign: "center",
          }}
        >
          Forge v2.4 · © 2026 PVinsight Inc.
        </p>
      </div>
    </div>
  </div>
);
}


// return (
//   <div>
//     <Logo />
//     <h1>Forge</h1>

//     <button onClick={go} disabled={loading}>
//       {loading
//         ? "Authenticating..."
//         : "Continue with PVinsight SSO"}
//     </button>
//   </div>
// );
// }