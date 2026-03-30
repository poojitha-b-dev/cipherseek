import { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Search from "./pages/Search";
import About from "./pages/About";
import "./index.css";

function AppRoutes() {
  const { user } = useAuth();
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    if (!user) setPage("login");
    else setPage("dashboard");
  }, [user]);

  if (!user) {
    return page === "register" ? (
      <Register onSwitch={() => setPage("login")} />
    ) : (
      <Login onSwitch={() => setPage("register")} />
    );
  }

  return (
    <div className="app-shell">
      <Navbar page={page} setPage={setPage} />
      <main className="main-content">
        {page === "dashboard" && <Dashboard setPage={setPage} />}
        {page === "upload" && <Upload />}
        {page === "search" && <Search />}
        {page === "about" && <About />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
