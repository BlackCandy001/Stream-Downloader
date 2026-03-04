import React, { useEffect, useState } from "react";
import { Card, Descriptions, Button, Space, Tag } from "antd";
import {
  GithubOutlined,
  HomeOutlined,
  AppleOutlined,
  WindowsOutlined,
  LinuxOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const AboutContainer = styled.div`
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 150px);
`;

const StyledCard = styled(Card)`
  max-width: 640px;
  width: 100%;
  border-radius: 32px !important;
  border: 1px solid var(--glass-border) !important;
  background: var(--glass) !important;
  backdrop-filter: blur(24px) !important;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4) !important;
  text-align: center;
  padding: 40px 20px;

  .ant-card-body {
    padding: 0;
  }
`;

const LogoGlow = styled.div`
  font-size: 80px;
  margin-bottom: 24px;
  filter: drop-shadow(0 0 20px var(--primary-glow));
  animation: float 3s ease-in-out infinite;

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`;

const AppTitle = styled.h1`
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 8px;
  background: var(--gradient-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1.5px;
`;

const VersionBadge = styled.div`
  display: inline-block;
  padding: 4px 16px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 20px;
  color: var(--primary);
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 32px;
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  text-align: left;
  margin: 32px 0;

  .detail-item {
    background: rgba(255, 255, 255, 0.03);
    padding: 16px;
    border-radius: 16px;
    border: 1px solid var(--glass-border);

    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .value {
      font-size: 15px;
      color: var(--text-main);
      font-weight: 500;
    }
  }
`;

const About: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");

  useEffect(() => {
    window.electronAPI.appGetVersion().then(setVersion);
  }, []);

  return (
    <AboutContainer className="animate-in">
      <StyledCard>
        <LogoGlow>📥</LogoGlow>
        <AppTitle>{t("app.title")}</AppTitle>
        <VersionBadge>v{version || "1.1.0"}</VersionBadge>

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "16px",
            lineHeight: "1.6",
            margin: "0 40px",
          }}
        >
          {t("about.description") ||
            "A powerful, premium-styled stream downloader for HLS, DASH, and MSS protocols."}
        </p>

        <DetailsGrid>
          <div className="detail-item">
            <div className="label">{t("about.developer") || "Developer"}</div>
            <div className="value">Black Candy</div>
          </div>
          <div className="detail-item">
            <div className="label">{t("about.license") || "License"}</div>
            <div className="value">MIT Open Source</div>
          </div>
          <div className="detail-item">
            <div className="label">Platforms</div>
            <div className="value">
              <Space size={8}>
                <AppleOutlined />
                <WindowsOutlined />
                <LinuxOutlined />
              </Space>
            </div>
          </div>
        </DetailsGrid>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Button
            size="large"
            type="primary"
            icon={<GithubOutlined />}
            onClick={() => {
              window.electronAPI.appOpenExternal("https://github.com/BlackCandy001/Stream-Downloader");
            }}
            style={{
              borderRadius: "12px",
              height: "48px",
              padding: "0 24px",
              fontWeight: 600,
            }}
          >
            GitHub Repo
          </Button>
        </div>

        <div
          style={{
            marginTop: 40,
            color: "var(--text-muted)",
            fontSize: "12px",
            opacity: 0.5,
          }}
        >
          Built with React, Electron, and Passion.
        </div>
      </StyledCard>
    </AboutContainer>
  );
};

export default About;
