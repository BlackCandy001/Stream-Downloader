import React from "react";
import { Progress, Button, Tooltip } from "antd";
import { FullscreenExitOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useDownloadStore } from "../store/downloadStore";
import { useTranslation } from "react-i18next";

const MinimalContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--bg-secondary);
  -webkit-app-region: drag;
  overflow: hidden;
  box-sizing: border-box;
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
`;

const InfoText = styled.div`
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
`;

const MinimalMode: React.FC = () => {
  const { t } = useTranslation();
  const downloads = useDownloadStore((state) => state.downloads);
  
  // Get the most active download (first downloading one)
  const activeDownload = downloads.find((d) => d.status === "downloading") || 
                        downloads.find((d) => d.status === "pending") ||
                        downloads[0];

  const handleExitMinimal = () => {
    window.electronAPI.appSetMinimalMode(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.appShowContextMenu();
  };

  if (!activeDownload) {
    return (
      <MinimalContainer onContextMenu={handleContextMenu}>
        <ContentWrapper>
          <InfoText>{t("downloads.noDownloads")}</InfoText>
          <div style={{ flex: 1 }} />
          <Tooltip title="Exit Minimal Mode">
            <Button 
              type="text" 
              icon={<FullscreenExitOutlined />} 
              onClick={handleExitMinimal}
              size="small"
            />
          </Tooltip>
        </ContentWrapper>
      </MinimalContainer>
    );
  }

  return (
    <MinimalContainer onContextMenu={handleContextMenu}>
      <ContentWrapper>
        <Tooltip title={activeDownload.filename}>
          <InfoText>{activeDownload.filename}</InfoText>
        </Tooltip>
        
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Progress 
            percent={Math.round(activeDownload.progress)} 
            size="small" 
            status={activeDownload.status === "failed" ? "exception" : "active"}
            showInfo={false}
            strokeColor="var(--primary)"
          />
          <span style={{ fontSize: '10px', marginLeft: '4px', fontWeight: 600, color: 'var(--text-main)' }}>
            {Math.round(activeDownload.progress)}%
          </span>
        </div>

        <Tooltip title="Exit Minimal Mode">
          <Button 
            type="text" 
            icon={<FullscreenExitOutlined />} 
            onClick={handleExitMinimal}
            size="small"
          />
        </Tooltip>
      </ContentWrapper>
    </MinimalContainer>
  );
};

export default MinimalMode;
