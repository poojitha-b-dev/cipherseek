export default function PasswordStrength({ password = "" }) {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let strength;

  if (score <= 2) {
    strength = { label: "Weak",   color: "#e24b4a", width: "25%" };
  } else if (score <= 3) {
    strength = { label: "Fair",   color: "#ef9f27", width: "50%" };
  } else if (score <= 4) {
    strength = { label: "Good",   color: "#639922", width: "75%" };
  } else {
    strength = { label: "Strong", color: "#1d9e75", width: "100%" };
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: strength.width,
            height: "100%",
            background: strength.color,
            transition: "width 0.25s ease",
          }}
        />
      </div>
      <p
        style={{
          marginTop: 6,
          fontSize: 12,
          color: strength.color,
          fontWeight: 600,
        }}
      >
        {strength.label}
      </p>
    </div>
  );
}