import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout as AntLayout, Menu, Button, Tooltip } from "antd";
import {
  HomeOutlined,
  DownloadOutlined,
  HistoryOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const StyledLayout = styled(AntLayout)`
  height: 100vh;
  overflow: hidden;
  background: var(--bg-dark);
`;

const StyledSider = styled(Sider)`
  background: var(--bg-darker) !important;
  border-right: 1px solid var(--glass-border);
  box-shadow: 10px 0 30px rgba(0, 0, 0, 0.3);

  .ant-menu {
    background: transparent !important;
    border: none !important;
    margin-top: 16px;
  }

  .ant-menu-item {
    margin: 8px 12px !important;
    border-radius: 12px !important;
    width: calc(100% - 24px) !important;
    color: var(--text-muted) !important;
    transition: all 0.3s ease !important;

    &:hover {
      color: var(--text-main) !important;
      background: var(--surface) !important;
    }
  }

  .ant-menu-item-selected {
    background: var(--gradient-primary) !important;
    color: white !important;
    box-shadow: 0 4px 12px var(--primary-glow);

    .anticon {
      color: white !important;
    }
  }
`;

const StyledHeader = styled(Header)`
  background: var(--glass) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--glass-border);
  height: 64px;
`;

const StyledContent = styled(Content)`
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  background: transparent;
`;

const Logo = styled.div<{ $collapsed: boolean }>`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$collapsed ? "center" : "flex-start")};
  padding: 0 24px;
  gap: 12px;
  border-bottom: 1px solid var(--glass-border);

  .logo-icon {
    font-size: 24px;
    filter: drop-shadow(0 0 8px var(--primary));
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
    white-space: nowrap;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);

  .icon {
    font-size: 20px;
    opacity: 0.9;
  }
`;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState("home");

  useEffect(() => {
    const path = location.pathname.split("/")[1] || "home";
    setSelectedKey(path);
  }, [location]);

  const menuItems = [
    {
      key: "home",
      icon: <HomeOutlined />,
      label: t("nav.home"),
    },
    {
      key: "downloads",
      icon: <DownloadOutlined />,
      label: t("nav.downloads"),
    },
    {
      key: "extension",
      icon: <LinkOutlined />,
      label: "Extension",
    },
    {
      key: "history",
      icon: <HistoryOutlined />,
      label: t("nav.history"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: t("nav.settings"),
    },
    {
      key: "about",
      icon: <InfoCircleOutlined />,
      label: t("nav.about"),
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key === "home" ? "/" : `/${key}`);
  };

  return (
    <StyledLayout>
      <StyledSider trigger={null} collapsible collapsed={collapsed} width={240}>
        <Logo $collapsed={collapsed}>
          <span className="logo-icon">📥</span>
          {!collapsed && <span className="logo-text">Stream DL</span>}
        </Logo>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </StyledSider>
      <AntLayout>
        <StyledHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18, color: "var(--text-main)" }}
            />
            <HeaderTitle>
              <span className="icon">🎬</span>
              <span>{t("app.title")}</span>
            </HeaderTitle>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Tooltip title={t("common.minimize")}>
              <Button
                type="text"
                shape="circle"
                onClick={() => window.electronAPI.appMinimize()}
                style={{ color: "var(--text-muted)" }}
              >
                –
              </Button>
            </Tooltip>
            <Tooltip title={t("common.maximize")}>
              <Button
                type="text"
                shape="circle"
                onClick={() => window.electronAPI.appMaximize()}
                style={{ color: "var(--text-muted)" }}
              >
                □
              </Button>
            </Tooltip>
            <Tooltip title={t("common.close")}>
              <Button
                type="text"
                shape="circle"
                danger
                onClick={() => window.electronAPI.appQuit()}
              >
                ×
              </Button>
            </Tooltip>
          </div>
        </StyledHeader>
        <StyledContent>{children}</StyledContent>
      </AntLayout>
    </StyledLayout>
  );
};

export default Layout;
