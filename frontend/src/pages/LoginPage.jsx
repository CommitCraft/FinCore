import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { saveAuth } from "../auth.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" });
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const { data } = await api.get("/roles");
        const availableRoles = data.filter((item) => item.name !== "ADMIN");
        setRoles(availableRoles);

        if (availableRoles.length > 0) {
          setForm((prev) => (availableRoles.some((item) => item.name === prev.role) ? prev : { ...prev, role: availableRoles[0].name }));
        }
      } catch {
        setRoles([{ name: "EMPLOYEE", displayName: "Employee" }]);
      }
    };

    loadRoles();
  }, []);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        const registerPayload = { name: form.name, email: form.email, password: form.password, role: form.role };
        const { data } = await api.post("/auth/register", registerPayload);
        setMessage(data?.message || "Registration submitted. Please wait for admin approval.");
        setMode("login");
        setForm((prev) => ({ ...prev, password: "" }));
        return;
      }

      const { data } = await api.post("/auth/login", { email: form.email, password: form.password });
      saveAuth(data);

      navigate(
        data.user.role === "ADMIN"
          ? "/admin"
          : data.user.status === "pending"
            ? "/employee?tab=profile"
            : "/employee?tab=history"
      );
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <main className="container">
      <section className="card auth-card">
        <h1>Finance Management</h1>
        <p>Secure expense and salary advance workflow</p>

        <div className="switch-row">
          <button className={mode === "login" ? "btn active" : "btn"} onClick={() => setMode("login")} type="button">
            Login
          </button>
          <button className={mode === "register" ? "btn active" : "btn"} onClick={() => setMode("register")} type="button">
            Register
          </button>
        </div>

        <form onSubmit={onSubmit} className="form-grid">
          {mode === "register" && (
            <>
              <input name="name" placeholder="Full name" value={form.name} onChange={onChange} required />
              <select name="role" value={form.role} onChange={onChange}>
                {roles.map((role) => (
                  <option key={role.name} value={role.name}>
                    {role.displayName || role.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={onChange} required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={onChange} required />
          {error ? <p className="error">{error}</p> : null}
          {message ? <p className="success">{message}</p> : null}
          <button className="btn solid" type="submit">
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
