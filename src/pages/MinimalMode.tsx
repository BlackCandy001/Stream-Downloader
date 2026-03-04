import React, { useEffect, useState } from "react";
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

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background-color: #f0f0f0;
  margin: 10px 0;
`;

const ProgressSection = styled.div<{ $show: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.3s ease;
  opacity: ${props => props.$show ? 1 : 0};
  max-height: ${props => props.$show ? '100px' : '0'};
  overflow: hidden;
  margin-top: ${props => props.$show ? '6px' : '0'};
`;

const MinimalMode: React.FC = () => {
  const [streamCount, setStreamCount] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const downloads = useDownloadStore((state) => state.downloads);
  
  // Find the most relevant active download
  const activeDownload = downloads.find((d) => d.status === "downloading") || 
                        downloads.find((d) => d.status === "pending");

  // Keep track of any finished downloads to show progress briefly
  const lastFinished = downloads.filter(d => d.status === "completed" || d.status === "failed")
                                .sort((a, b) => (b.id.split('-')[1] as any || 0) - (a.id.split('-')[1] as any || 0))[0];

  useEffect(() => {
    // Poll stream count
    const updateCount = async () => {
      const count = await window.electronAPI.appGetStreamCount();
      setStreamCount(count);
    };
    
    updateCount();
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    console.log("[MinimalMode] Active:", activeDownload?.id, " lastFinished:", lastFinished?.id, " downloadsCount:", downloads.length);
  }, [activeDownload, lastFinished, downloads]);

  useEffect(() => {
    if (activeDownload) {
      setShowProgress(true);
    } else if (lastFinished) {
      const finishTime = parseInt(lastFinished.id.split("-")[1] || "0");
      const age = Date.now() - finishTime;
      
      // Show for 60 seconds after finish if it's recent
      if (age < 60000) {
        setShowProgress(true);
        const remaining = 60000 - age;
        const timer = setTimeout(() => setShowProgress(false), remaining);
        return () => clearTimeout(timer);
      } else {
        setShowProgress(false);
      }
    } else {
      setShowProgress(false);
    }
  }, [activeDownload, lastFinished]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.appShowContextMenu();
  };

  return (
    <DropdownContainer onContextMenu={handleContextMenu}>
      {/* 1. Connection URL and Port */}
      <Section>
        <SubtleText>Endpoint</SubtleText>
        <InfoText>http://127.0.0.1:34567</InfoText>
      </Section>

      <Divider />

      {/* 2. active Connections */}
      <Section>
        <InfoText style={{ fontWeight: 400 }}>
          Connections: <span style={{ fontWeight: 600, color: '#1890ff' }}>{streamCount}</span>
        </InfoText>
      </Section>

      {/* 3. Download Progress */}
      <ProgressSection $show={showProgress}>
        <Divider />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <InfoText style={{ fontSize: '10px' }}>
            {activeDownload ? 'Downloading...' : (lastFinished?.status === 'failed' ? 'Failed' : 'Completed')}
          </InfoText>
          <InfoText style={{ fontSize: '10px', color: (activeDownload || lastFinished?.status === 'completed') ? '#8c8c8c' : '#ff4d4f' }}>
            {activeDownload ? `${Math.round(activeDownload.progress)}%` : (lastFinished?.status === 'failed' ? 'Error' : '100%')}
          </InfoText>
        </div>
        <Progress 
          percent={activeDownload ? activeDownload.progress : (lastFinished ? lastFinished.progress : 0)} 
          size="small"
          showInfo={false}
          strokeColor={activeDownload ? "#1890ff" : (lastFinished?.status === 'failed' ? '#ff4d4f' : '#52c41a')}
          trailColor="#f5f5f5"
          strokeWidth={2}
          status={activeDownload ? "active" : (lastFinished?.status === "failed" ? "exception" : "normal")}
        />
      </ProgressSection>
    </DropdownContainer>
  );
};

export default MinimalMode;
