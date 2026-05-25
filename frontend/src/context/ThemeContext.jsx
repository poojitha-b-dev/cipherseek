import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("cipherseek_theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("cipherseek_theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => {
    setDark((d) => !d);
  };

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div
        className={dark ? "theme-dark" : "theme-light"}
        style={{ overflow: "visible", position: "relative" }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}