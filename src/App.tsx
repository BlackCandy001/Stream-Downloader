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
import MinimalMode from "./pages/MinimalMode";
import { useSettingsStore } from "./store/settingsStore";
import i18n from "./i18n/config";
import en_US from "antd/locale/en_US";
import vi_VN from "antd/locale/vi_VN";
import zh_CN from "antd/locale/zh_CN";

function App() {
  const { settings, loadSettings } = useSettingsStore();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Sync i18next language with settings
  useEffect(() => {
    if (settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language]);

  const getAntdLocale = () => {
    switch (settings.language) {
      case "vi":
        return vi_VN;
      case "zh":
        return zh_CN;
      default:
        return en_US;
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const isDark =
        settings.theme === "dark" ||
        (settings.theme === "auto" && mediaQuery.matches);
      
      setIsDarkMode(isDark);

      if (isDark) {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
      } else {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
      }
    };

    updateTheme();

    const listener = () => updateTheme();
    mediaQuery.addEventListener("change", listener);

    return () => mediaQuery.removeEventListener("change", listener);
  }, [settings.theme]);

  const antdTheme = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: isDarkMode ? "#ffffff" : "#000000",
      colorBgContainer: isDarkMode ? "#121212" : "#ffffff",
      colorBgElevated: isDarkMode ? "#1f1f1f" : "#f0f0f0",
      colorBorder: isDarkMode ? "#444444" : "#cccccc",
      colorText: isDarkMode ? "#ffffff" : "#111111",
      colorTextSecondary: isDarkMode ? "#aaaaaa" : "#666666",
      borderRadius: 6,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
  };

  return (
    <ConfigProvider theme={antdTheme} locale={getAntdLocale()}>
      <AntdApp>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="/extension" element={<Extension />} />
              <Route path="/minimal" element={<MinimalMode />} />
            </Routes>
          </Layout>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
