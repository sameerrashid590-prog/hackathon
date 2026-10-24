
import Link from "next/link";

const features = [
  {
    icon: "👥",
    title: "Employee Management",
    description:
      "Manage employee records, departments, and workforce information in one place.",
  },
  {
    icon: "🕘",
    title: "Attendance Tracking",
    description:
      "Track daily check-ins, working hours, and attendance records.",
  },
  {
    icon: "📅",
    title: "Leave Management",
    description:
      "Simplify leave requests, approvals, and employee leave tracking.",
  },
  {
    icon: "📊",
    title: "Workforce Insights",
    description:
      "Understand your workforce through real-time reports and HR data.",
  },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      {/* Navigation */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <nav
          style={{
            maxWidth: 1150,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#1677ff",
              textDecoration: "none",
            }}
          >
            HCM Lite
          </Link>

          <Link
            href="/login"
            style={{
              background: "#1677ff",
              color: "#ffffff",
              padding: "10px 22px",
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          padding: "100px 24px 90px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "#e8f2ff",
            color: "#1677ff",
            padding: "8px 18px",
            borderRadius: 30,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          Human Capital Management System
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: "-1.5px",
            maxWidth: 850,
            margin: "0 auto 24px",
          }}
        >
          Smarter HR Management.
          <span
            style={{
              display: "block",
              color: "#1677ff",
            }}
          >
            Simpler Workflows.
          </span>
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.8,
            color: "#64748b",
            maxWidth: 650,
            margin: "0 auto 36px",
          }}
        >
          Manage your people, organize departments, track
          attendance, and streamline daily HR operations
          through one centralized platform.
        </p>

        <Link
          href="/login"
          style={{
            display: "inline-block",
            background: "#1677ff",
            color: "#ffffff",
            padding: "15px 36px",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(22,119,255,0.2)",
          }}
        >
          Access your dashboard →
        </Link>

        <p
          style={{
            marginTop: 18,
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          Secure access for Administrators, HR teams,
          and Employees
        </p>
      </section>

      {/* Features */}
      <section
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          padding: "20px 24px 100px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <h2 style={{ fontSize: 32, marginBottom: 12 }}>
            Everything your HR team needs
          </h2>
          <p style={{ color: "#64748b", fontSize: 16 }}>
            A centralized workspace for managing your workforce.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: 20,
          }}
        >
          {features.map((feature) => (
            <article
              key={feature.title}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                padding: 28,
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  marginBottom: 18,
                }}
              >
                {feature.icon}
              </div>

              <h3
                style={{
                  fontSize: 19,
                  marginBottom: 12,
                }}
              >
                {feature.title}
              </h3>

              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "24px",
          color: "#64748b",
          fontSize: 14,
        }}
      >
        HCM Lite · Human Capital Management Platform
      </footer>
    </main>
  );
}
