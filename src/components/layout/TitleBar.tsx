import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  MinusOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined, 
  CloseOutlined 
} from '@ant-design/icons';

const TitleBarContainer = styled.div<{ $isMinimal?: boolean }>`
  height: ${props => props.$isMinimal ? '0px' : '32px'};
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 12px;
  user-select: none;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--border-color);
  overflow: hidden;
  transition: height 0.2s ease;
  z-index: 9999;
`;

const AppInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  
  img {
    width: 16px;
    height: 16px;
  }
`;

const WindowControls = styled.div`
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  height: 100%;
`;

const ControlButton = styled.div<{ $hoverColor?: string }>`
  width: 44px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: ${props => props.$hoverColor || 'rgba(255, 255, 255, 0.1)'};
    color: var(--text-main);
  }
`;

const CloseButton = styled(ControlButton)`
  &:hover {
    background: #e81123;
    color: white;
  }
`;

interface TitleBarProps {
  isMinimal?: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ isMinimal }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const result = await window.electronAPI.appIsMaximized();
      setIsMaximized(result);
    };
    
    checkMaximized();
    
    // In a real app we might listen for resize events, 
    // but for now we'll check on clicks.
  }, []);

  const handleMinimize = () => window.electronAPI.appMinimize();
  const handleToggleMaximize = async () => {
    await window.electronAPI.appToggleMaximize();
    const result = await window.electronAPI.appIsMaximized();
    setIsMaximized(result);
  };
  const handleClose = () => window.electronAPI.appCloseWindow();

  if (isMinimal) return null;

  return (
    <TitleBarContainer $isMinimal={isMinimal}>
      <AppInfo>
        <img src="/logo.png" alt="logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <span>Stream Downloader</span>
      </AppInfo>
      <WindowControls>
        <ControlButton onClick={handleMinimize}>
          <MinusOutlined />
        </ControlButton>
        <ControlButton onClick={handleToggleMaximize}>
          {isMaximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        </ControlButton>
        <CloseButton onClick={handleClose}>
          <CloseOutlined />
        </CloseButton>
      </WindowControls>
    </TitleBarContainer>
  );
};

export default TitleBar;
