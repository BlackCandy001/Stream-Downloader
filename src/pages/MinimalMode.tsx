import React, { useEffect } from "react";
import styled from "styled-components";
import { Progress } from "antd";
import { useDownloadStore } from "../store/downloadStore";

const DropdownContainer = styled.div`
  width: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-radius: 4px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SubtleText = styled.div`
  font-size: 10px;
  color: #a0a0a0;
  user-select: none;
`;

const InfoText = styled.div`
  font-size: 11px;
  color: #434343;
  font-weight: 500;
  user-select: none;
`;

const DetailText = styled.div`
  font-size: 10px;
  color: #8c8c8c;
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background-color: #f0f0f0;
  margin: 10px 0;
`;

const MinimalMode: React.FC = () => {
  const downloads = useDownloadStore((state) => state.downloads);
  
  // Find the most relevant active download
  const activeDownload = downloads.find((d) => d.status === "downloading") || 
                        downloads.find((d) => d.status === "pending");

  // Keep track of any finished downloads to show progress briefly
  const lastFinished = downloads.filter(d => d.status === "completed" || d.status === "failed")
                                .sort((a, b) => (b.id.split('-')[1] as any || 0) - (a.id.split('-')[1] as any || 0))[0];

  useEffect(() => {
    console.log("[MinimalMode] Active:", activeDownload?.id, " lastFinished:", lastFinished?.id, " downloadsCount:", downloads.length);
  }, [activeDownload, lastFinished, downloads]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.appShowContextMenu();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <DropdownContainer onContextMenu={handleContextMenu}>
      {/* 1. Connection URL and Port */}
      <Section>
        <SubtleText>Endpoint</SubtleText>
        <InfoText>http://127.0.0.1:34567</InfoText>
      </Section>

      <Divider />

      {/* 2. Download Progress */}
      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <InfoText style={{ fontWeight: 400 }}>
            {activeDownload ? 'Downloading' : (lastFinished ? (lastFinished.status === 'failed' ? 'Failed' : 'Completed') : 'Ready')}
          </InfoText>
        </div>
        <Progress 
          percent={Math.round(activeDownload ? activeDownload.progress : (lastFinished ? lastFinished.progress : 0))} 
          size="small"
          showInfo={true}
          strokeColor={activeDownload ? "#1890ff" : (lastFinished?.status === 'failed' ? '#ff4d4f' : '#52c41a')}
          trailColor="#f5f5f5"
          strokeWidth={4}
          status={activeDownload ? "active" : (lastFinished?.status === "failed" ? "exception" : "normal")}
          format={(percent) => <span style={{ fontSize: '10px', color: '#8c8c8c', fontWeight: 500 }}>{percent}%</span>}
        />
        {activeDownload && (
          <DetailText>
            <span>{formatBytes(activeDownload.speed)}/s</span>
            <span>{formatBytes(activeDownload.downloadedBytes)} / {activeDownload.totalBytes ? formatBytes(activeDownload.totalBytes) : 'Unknown'}</span>
          </DetailText>
        )}
      </Section>
    </DropdownContainer>
  );
};

export default MinimalMode;
