import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider, theme, App as AntdApp } from "antd";
import { useEffect, useState } from "react";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Downloads from "./pages/Downloads";
import History from "./pages/History";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Extension from "./pages/Extension";
import { useSettingsStore } from "./store/settingsStore";
import "./i18n/config";

function App() {
  const { settings, loadSettings } = useSettingsStore();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Check theme
    const isDark =
      settings.theme === "dark" ||
      (settings.theme === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDarkMode(isDark);

    // Apply theme class to body
    if (isDark) {
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.add("light-theme");
    }
  }, [settings.theme]);

  const antdTheme = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: "#1890ff",
      borderRadius: 8,
    },
  };

  return (
    <ConfigProvider theme={antdTheme}>
      <AntdApp>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="/extension" element={<Extension />} />
            </Routes>
          </Layout>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
