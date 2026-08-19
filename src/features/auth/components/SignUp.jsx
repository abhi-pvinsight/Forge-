import { useState } from "react";
import Icon from "../../../shared/components/Icon";

export default function SignUp({
  loading,
  error,
  onSubmit,
  onGoToSignIn,
  theme = "light",
  onToggleTheme,
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [vertical, setVertical] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (!fullName.trim() || !email.trim() || !department.trim() || !password || !confirmPassword) {
      setLocalError("Please complete all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password should be at least 8 characters long.");
      return;
    }

    await onSubmit?.({
      fullName: fullName.trim(),
      email: email.trim(),
      department: department.trim(),
      vertical: vertical.trim(),
      password,
    });
  };

  const message = error || localError;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.05fr 0.95fr",
        background: "var(--surface)",
      }}
    >
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

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "#fff", borderRadius: "50%" }} />
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Forge</div>
        </div>

        <div style={{ position: "relative" }}>
          <div className="label-eyebrow" style={{ color: "oklch(0.82 0.05 162)" }}>
            Engineering Report Builder
          </div>
          <h1 style={{ fontSize: 38, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.02em", margin: "14px 0 18px", maxWidth: 460 }}>
            Build your workspace with the right discipline from day one.
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "oklch(0.86 0.01 220)", maxWidth: 430, margin: 0 }}>
            New engineers and teams can create an account, choose a discipline, and start generating reports in a consistent workflow.
          </p>
        </div>

        <div style={{ position: "relative", display: "flex", gap: 28 }}>
          <Stat value="1" label="Account per engineer" />
          <Stat value="1" label="Fixed workspace" />
          <Stat value="0" label="Manual setup" />
        </div>
      </div>

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
          onClick={onToggleTheme}
          style={{
            position: "absolute",
            top: 22,
            right: 22,
            width: 34,
            padding: 0,
          }}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
        </button>

        <div className="fade-up" style={{ width: 380, maxWidth: "100%" }}>
          <div className="label-eyebrow">Create account</div>
          <h2 style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-0.01em", margin: "8px 0 6px" }}>
            Sign up for Forge
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 28px" }}>
            Add your details once, then log in with your email and password.
          </p>

          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <Field label="Full name" id="signup-name" value={fullName} onChange={setFullName} placeholder="Aman Sharma" autoComplete="name" />
            <Field label="Email" id="signup-email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" />
            <SelectField
              label="Department"
              id="signup-department"
              value={department}
              onChange={setDepartment}
              options={["Electrical", "Civil", "Structural"]}
            />
            <SelectField
              label="Vertical"
              id="signup-vertical"
              value={vertical}
              onChange={setVertical}
              options={
                department === "Electrical"
                  ? ["PV", "BESS", "HV & Substation", "TL Lines", "PSS"]
                  : department === "Civil"
                  ? ["PV", "BESS", "HV & Substation", "PSS", "TL Lines"]
                  : department === "Structural"
                  ? ["PV", "BESS", "HV & Substation", "PSS", "TL Lines"]
                  : ["PV", "BESS", "HV & Substation", "TL Lines", "PSS"]
              }
            />
            <Field label="Password" id="signup-password" type="password" value={password} onChange={setPassword} placeholder="Create a password" autoComplete="new-password" />
            <Field label="Confirm password" id="signup-confirm" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" autoComplete="new-password" />

            {message ? (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--r-md)",
                  background: "var(--red-soft)",
                  color: "var(--red-text)",
                  border: "1px solid color-mix(in oklab, var(--red-text), transparent 82%)",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {message}
              </div>
            ) : null}

            <button className="btn btn-lg btn-primary" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Sign up"}
            </button>

            <button type="button" className="btn btn-ghost btn-sm" onClick={onGoToSignIn} style={{ justifySelf: "center" }}>
              Back to sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, id, value, onChange, placeholder, type = "text", autoComplete }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function SelectField({ label, id, value, onChange, options }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 600 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "oklch(0.78 0.01 220)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
