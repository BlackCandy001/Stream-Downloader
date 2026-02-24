import React from "react";
import {
  Card,
  Empty,
  Table,
  Tag,
  Button,
  Progress,
  Space,
  Popconfirm,
  Tooltip,
  Checkbox,
} from "antd";
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  FolderOpenOutlined,
  SyncOutlined,
  DeleteOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useDownloadStore } from "../store/downloadStore";
import { useDownloader } from "../hooks/useDownloader";
import { formatBytes, formatSpeed } from "../utils/format";

const DownloadsContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 32px;
  background: var(--gradient-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
`;

const TaskCard = styled.div`
  background: var(--glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: var(--surface-hover);
    border-color: rgba(56, 189, 248, 0.3);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .file-info {
    flex: 1;
    .filename {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
      display: block;
    }
    .url {
      font-size: 13px;
      color: var(--text-muted);
      word-break: break-all;
      opacity: 0.7;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;

  .stat-item {
    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .value {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-main);
    }
  }
`;

const ProgressWrapper = styled.div`
  .ant-progress-bg {
    background: var(--gradient-primary) !important;
    height: 10px !important;
    border-radius: 5px;
  }
  .ant-progress-inner {
    background: rgba(255, 255, 255, 0.05) !important;
    height: 10px !important;
  }
`;

const Downloads: React.FC = () => {
  const { t } = useTranslation();
  const { downloads, updateDownload, clearCompleted } = useDownloadStore();
  const { removeDownload } = useDownloader();
  const [deleteFiles, setDeleteFiles] = React.useState(false);

  const handlePause = async (id: string) => {
    await window.electronAPI.downloadPause(id);
    updateDownload(id, { status: "paused" });
  };

  const handleResume = async (id: string) => {
    await window.electronAPI.downloadResume(id);
    updateDownload(id, { status: "downloading" });
  };

  const handleCancel = async (id: string) => {
    await window.electronAPI.downloadCancel(id);
    updateDownload(id, { status: "cancelled" });
  };

  const handleDelete = async (id: string) => {
    await removeDownload(id, deleteFiles);
  };

  const handleClearAll = async () => {
    const finished = downloads.filter(
      (d) =>
        d.status === "completed" ||
        d.status === "failed" ||
        d.status === "cancelled",
    );
    for (const task of finished) {
      await removeDownload(task.id, false); // Don't delete files on clear all unless requested (policy decision)
    }
  };

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      downloading: { color: "cyan", icon: <SyncOutlined spin /> },
      paused: { color: "orange", icon: <PauseCircleOutlined /> },
      completed: { color: "green", icon: <CheckCircleOutlined /> },
      failed: { color: "red", icon: <CloseCircleOutlined /> },
      cancelled: { color: "default", icon: <CloseCircleOutlined /> },
      pending: { color: "processing", icon: <SyncOutlined /> },
    };
    const config = configs[status] || configs.pending;
    return (
      <Tag
        color={config.color}
        icon={config.icon}
        style={{
          borderRadius: "8px",
          padding: "2px 12px",
          border: "none",
          fontWeight: 600,
        }}
      >
        {t(`downloads.${status}`)}
      </Tag>
    );
  };

  return (
    <DownloadsContainer className="animate-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <Title style={{ marginBottom: 0 }}>{t("downloads.title")}</Title>
        {downloads.some(
          (d) =>
            d.status === "completed" ||
            d.status === "failed" ||
            d.status === "cancelled",
        ) && (
          <Popconfirm
            title={t("messages.confirmClearAll")}
            onConfirm={handleClearAll}
            okText={t("common.yes")}
            cancelText={t("common.no")}
          >
            <Button
              icon={<ClearOutlined />}
              style={{
                borderRadius: "10px",
                background: "var(--surface)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-muted)",
              }}
            >
              {t("downloads.clearAll")}
            </Button>
          </Popconfirm>
        )}
      </div>

      {downloads.length === 0 ? (
        <Card
          style={{
            textAlign: "center",
            padding: "64px 0",
            background: "var(--glass)",
          }}
        >
          <Empty
            description={
              <span style={{ color: "var(--text-muted)" }}>
                {t("downloads.noDownloads")}
              </span>
            }
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {downloads.map((task) => (
            <TaskCard key={task.id}>
              <CardHeader>
                <div className="file-info">
                  <span className="filename">
                    {task.filename || "Task " + task.id.substring(0, 8)}
                  </span>
                  <span className="url">
                    {task.url
                      ? task.url.length > 80
                        ? task.url.substring(0, 80) + "..."
                        : task.url
                      : "N/A"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {getStatusTag(task.status)}
                  <div style={{ display: "flex", gap: 8 }}>
                    {task.status === "downloading" && (
                      <Tooltip title={t("downloads.pause")}>
                        <Button
                          shape="circle"
                          icon={<PauseCircleOutlined />}
                          onClick={() => handlePause(task.id)}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-main)",
                          }}
                        />
                      </Tooltip>
                    )}
                    {task.status === "paused" && (
                      <Tooltip title={t("downloads.resume")}>
                        <Button
                          type="primary"
                          shape="circle"
                          icon={<PlayCircleOutlined />}
                          onClick={() => handleResume(task.id)}
                        />
                      </Tooltip>
                    )}
                    {(task.status === "downloading" ||
                      task.status === "paused") && (
                      <Popconfirm
                        title={t("messages.confirmCancel")}
                        onConfirm={() => handleCancel(task.id)}
                        okText={t("common.yes")}
                        cancelText={t("common.no")}
                      >
                        <Tooltip title={t("downloads.cancel")}>
                          <Button
                            shape="circle"
                            danger
                            icon={<CloseCircleOutlined />}
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                            }}
                          />
                        </Tooltip>
                      </Popconfirm>
                    )}
                    {task.status === "completed" && (
                      <Tooltip title={t("downloads.openFolder")}>
                        <Button
                          shape="circle"
                          icon={<FolderOpenOutlined />}
                          onClick={() => {
                            if (task.outputPath) {
                              window.electronAPI.fileShowInFolder(
                                task.outputPath,
                              );
                            }
                          }}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--primary)",
                          }}
                        />
                      </Tooltip>
                    )}
                    <Popconfirm
                      title={
                        <Space direction="vertical">
                          <span>{t("messages.confirmDelete")}</span>
                          <Checkbox
                            checked={deleteFiles}
                            onChange={(e) => setDeleteFiles(e.target.checked)}
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {t("downloads.deleteFileFromDisk")}
                          </Checkbox>
                        </Space>
                      }
                      onConfirm={() => handleDelete(task.id)}
                      okText={t("common.yes")}
                      cancelText={t("common.no")}
                    >
                      <Tooltip title={t("common.delete")}>
                        <Button
                          shape="circle"
                          icon={<DeleteOutlined />}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-muted)",
                          }}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              </CardHeader>

              <ProgressWrapper>
                <Progress
                  percent={task.progress || 0}
                  showInfo={false}
                  status={task.status === "failed" ? "exception" : "active"}
                />
              </ProgressWrapper>

              {task.status === "failed" && task.errorMessage && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    color: "rgba(239,68,68,0.9)",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  ❌ {task.errorMessage}
                </div>
              )}

              <StatsGrid>
                <div className="stat-item">
                  <div className="label">{t("downloads.progress")}</div>
                  <div className="value">{task.progress?.toFixed(1)}%</div>
                </div>
                <div className="stat-item">
                  <div className="label">{t("downloads.speed")}</div>
                  <div className="value">{formatSpeed(task.speed || 0)}</div>
                </div>
                <div className="stat-item">
                  <div className="label">{t("downloads.downloaded")}</div>
                  <div className="value">
                    {formatBytes(task.downloadedBytes || 0)} /{" "}
                    {formatBytes(task.totalBytes || 1)}
                  </div>
                </div>
                {task.eta !== undefined && task.status === "downloading" && (
                  <div className="stat-item">
                    <div className="label">ETA</div>
                    <div className="value">
                      {Math.floor(task.eta / 60)}m {Math.floor(task.eta % 60)}s
                    </div>
                  </div>
                )}
              </StatsGrid>
            </TaskCard>
          ))}
        </div>
      )}
    </DownloadsContainer>
  );
};

export default Downloads;

console.log("Downloads.tsx explicitly loaded - V3");
