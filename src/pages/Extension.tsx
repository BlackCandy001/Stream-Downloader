import React, { useEffect, useState } from "react";
import {
  Card,
  Empty,
  Table,
  Tag,
  Button,
  Space,
  App,
  Badge,
  Tooltip,
} from "antd";
import {
  LinkOutlined,
  CopyOutlined,
  DownloadOutlined,
  ClearOutlined,
  SyncOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useDownloader } from "../hooks/useDownloader";

const ExtensionContainer = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const TitleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h1 {
    font-size: 32px;
    font-weight: 800;
    margin: 0;
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -1px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--surface-hover);
    transform: translateY(-2px);
  }

  .value {
    font-size: 32px;
    font-weight: 800;
    color: var(--text-main);
  }

  .label {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
  }
`;

const ConnectionBadge = styled.div<{ $connected: boolean }>`
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${(props) =>
    props.$connected ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)"};
  color: ${(props) => (props.$connected ? "var(--success)" : "var(--error)")};
  border: 1px solid
    ${(props) =>
      props.$connected ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"};

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 10px currentColor;
  }
`;

const StyledCard = styled(Card)`
  border-radius: 24px !important;
  border: 1px solid var(--glass-border) !important;
  background: var(--glass) !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;

  .ant-card-body {
    padding: 24px;
  }
`;

const Extension: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [streams, setStreams] = useState<any[]>([]);
  const [appConnected, setAppConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { startDownload } = useDownloader();

  useEffect(() => {
    checkConnection();
    loadStreams();

    const unsubscribe = window.electronAPI.onExtensionStreamDetected(
      (stream) => {
        loadStreams();
      },
    );

    return () => unsubscribe();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch("http://localhost:34567/api/health");
      setAppConnected(response.ok);
    } catch {
      setAppConnected(false);
    }
  };

  const loadStreams = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:34567/api/streams");
      const result = await response.json();
      if (result.success) {
        setStreams(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load streams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    message.success(
      t("messages.clipboardSuccess") || "URL copied to clipboard",
    );
  };

  const handleDownload = async (stream: any) => {
    try {
      const result = await startDownload({
        url: stream.url,
        selectedStreamIds: ["default"],
        savePath: "",
        threadCount: 16,
        title: stream.title,
        type: stream.type,
      });
      if (result.success) message.success(t("messages.downloadStarted"));
    } catch (error: any) {
      message.error(error.message || t("messages.downloadFailed"));
    }
  };

  const handleDownloadAll = async () => {
    if (streams.length === 0) return;

    let successCount = 0;
    for (const stream of streams) {
      try {
        const result = await startDownload({
          url: stream.url,
          selectedStreamIds: ["default"],
          savePath: "",
          threadCount: 16,
          title: stream.title,
          type: stream.type,
        });
        if (result.success) successCount++;
      } catch (e) {
        console.error("Failed to start batch download for:", stream.url, e);
      }
    }

    if (successCount > 0) {
      message.success(
        `${t("messages.downloadStarted")} (${successCount}/${streams.length})`,
      );
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch("http://localhost:34567/api/streams/clear", {
        method: "POST",
      });
      setStreams([]);
    } catch (error) {
      message.error(t("messages.clearError") || "Failed to clear streams");
    }
  };

  const getTypeTag = (type: string) => {
    const colors: Record<string, string> = {
      HLS: "orange",
      DASH: "blue",
      M3U: "green",
    };
    return (
      <Tag
        color={colors[type] || "default"}
        style={{
          borderRadius: "6px",
          border: "none",
          fontWeight: 700,
          padding: "0 8px",
        }}
      >
        {type}
      </Tag>
    );
  };

  const columns = [
    {
      title: "TYPE",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type: string) => getTypeTag(type),
    },
    {
      title: "TITLE",
      dataIndex: "title",
      key: "title",
      render: (title: string, record: any) => (
        <div style={{ wordBreak: "break-word", fontWeight: 600 }}>
          {title || "Unknown Stream"}
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 400,
              marginTop: 4,
            }}
          >
            {record.url.substring(0, 100)}...
          </div>
        </div>
      ),
    },
    {
      title: "DETECTED",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 180,
      render: (timestamp: number) => (
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      ),
    },
    {
      title: "ACTIONS",
      key: "actions",
      width: 220,
      render: (_: any, record: any) => (
        <Space size={12}>
          <Tooltip title="Copy URL">
            <Button
              shape="circle"
              icon={<CopyOutlined />}
              onClick={() => handleCopyUrl(record.url)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-main)",
              }}
            />
          </Tooltip>
          <Button
            icon={<ExportOutlined />}
            onClick={() => window.open(record.url, "_blank")}
            style={{
              borderRadius: "10px",
              height: "36px",
              background: "var(--surface)",
              border: "1px solid var(--glass-border)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {t("common.open")}
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
            style={{ borderRadius: "10px", height: "36px" }}
          >
            {t("home.downloadButton")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <ExtensionContainer className="animate-in">
      <TitleHeader>
        <h1>
          <LinkOutlined style={{ color: "var(--primary)" }} />
          {t("extension.title")}
        </h1>
        <ConnectionBadge $connected={appConnected}>
          {appConnected
            ? t("extension.connected")
            : t("extension.disconnected")}
        </ConnectionBadge>
      </TitleHeader>

      <StatsGrid>
        <StatCard>
          <div className="value">{streams.length}</div>
          <div className="label">{t("extension.totalDetected")}</div>
        </StatCard>
        <StatCard>
          <div className="value">
            {streams.filter((s) => s.type === "HLS").length}
          </div>
          <div className="label">{t("extension.hlsStreams")}</div>
        </StatCard>
        <StatCard>
          <div className="value">
            {streams.filter((s) => s.type === "DASH").length}
          </div>
          <div className="label">{t("extension.dashStreams")}</div>
        </StatCard>
      </StatsGrid>

      <StyledCard
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SyncOutlined spin={loading} style={{ color: "var(--primary)" }} />
            <span>{t("extension.realtimeDetections")}</span>
          </div>
        }
        extra={
          <Space size={12}>
            <Button
              icon={<SyncOutlined />}
              onClick={checkConnection}
              style={{
                background: "transparent",
                border: "1px solid var(--glass-border)",
                color: "var(--text-muted)",
                borderRadius: "10px",
              }}
            >
              {t("extension.refresh")}
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadAll}
              disabled={streams.length === 0}
              style={{
                borderRadius: "10px",
                height: "32px",
                background: "var(--gradient-primary)",
                border: "none",
              }}
            >
              {t("extension.downloadAll")}
            </Button>
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={handleClearAll}
              disabled={streams.length === 0}
              style={{ borderRadius: "10px", height: "32px" }}
            >
              {t("extension.clear")}
            </Button>
          </Space>
        }
      >
        {streams.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: "var(--text-muted)" }}>
                No streams detected from the browser extension yet
              </span>
            }
            style={{ padding: "48px 0" }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={streams}
            rowKey={(record) => record.url}
            pagination={{ pageSize: 8 }}
            className="premium-table"
          />
        )}
      </StyledCard>

      <StyledCard style={{ marginTop: 24, padding: 0 }}>
        <div style={{ padding: "24px 32px" }}>
          <h3
            style={{
              borderLeft: "4px solid var(--primary)",
              paddingLeft: 16,
              marginBottom: 16,
            }}
          >
            {t("extension.howToUse")}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 24,
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              <span
                style={{
                  color: "var(--primary)",
                  fontWeight: 800,
                  marginRight: 8,
                }}
              >
                01
              </span>
              {t("extension.step1")}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              <span
                style={{
                  color: "var(--primary)",
                  fontWeight: 800,
                  marginRight: 8,
                }}
              >
                02
              </span>
              {t("extension.step2")}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              <span
                style={{
                  color: "var(--primary)",
                  fontWeight: 800,
                  marginRight: 8,
                }}
              >
                03
              </span>
              {t("extension.step3")}
            </div>
          </div>
        </div>
      </StyledCard>
    </ExtensionContainer>
  );
};

export default Extension;
