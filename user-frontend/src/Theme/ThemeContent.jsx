import { createContext, useState, useEffect } from "react";
import './ThemeContent.css';


const ThemeProvider = () => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button onClick={() => toggleTheme()} className="theme-toggle-button"></button>
  );
};

export default ThemeProvider;