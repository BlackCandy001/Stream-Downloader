import React, { useEffect, useState } from "react";
import {
  Card,
  Empty,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Popconfirm,
  App,
  Tooltip,
} from "antd";
import {
  DownloadOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ExportOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { formatBytes, formatDate } from "../utils/format";

const HistoryContainer = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const TitleArrangement = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h1 {
    font-size: 32px;
    font-weight: 800;
    margin: 0;
    color: var(--text-main);
  }
`;

const StyledCard = styled(Card)`
  border-radius: 12px !important;
  border: 1px solid var(--border-color) !important;
  background: var(--bg-secondary) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;

  .ant-card-body {
    padding: 24px;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;

  .search-input {
    flex: 1;
    max-width: 400px;
  }
`;

const History: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.historyGet();
      setHistory(data);
    } catch (error) {
      message.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await window.electronAPI.historyDelete(id);
    loadHistory();
    message.success(t("common.success"));
  };

  const handleClear = async () => {
    await window.electronAPI.historyClear();
    setHistory([]);
    message.success(t("common.success"));
  };

  const handleExport = async (format: "csv" | "json") => {
    const path = await window.electronAPI.filePickFolder();
    if (path) {
      const exportPath = `${path}/history.${format}`;
      await window.electronAPI.historyExport(format, exportPath);
      message.success(t("common.success"));
    }
  };

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string }> = {
      completed: { color: "green" },
      failed: { color: "red" },
      cancelled: { color: "orange" },
    };
    const config = configs[status] || { color: "default" };
    return (
      <Tag
        color={config.color}
        style={{
          borderRadius: "6px",
          border: "none",
          fontWeight: 600,
          padding: "0 10px",
        }}
      >
        {status.toUpperCase()}
      </Tag>
    );
  };

  const columns = [
    {
      title: t("history.filename"),
      dataIndex: "filename",
      key: "filename",
      render: (filename: string) => (
        <span
          style={{
            fontWeight: 600,
            color: "var(--text-main)",
            fontSize: "15px",
          }}
        >
          {filename}
        </span>
      ),
    },
    {
      title: t("history.date"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (
        <span style={{ color: "var(--text-muted)" }}>{formatDate(date)}</span>
      ),
    },
    {
      title: t("history.size"),
      dataIndex: "fileSize",
      key: "fileSize",
      render: (size: number) => (
        <span style={{ fontWeight: 500 }}>{formatBytes(size)}</span>
      ),
    },
    {
      title: t("history.status"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t("common.actions"),
      key: "actions",
      render: (_: any, record: any) => (
        <Space size={12}>
          <Tooltip title={t("history.openFile")}>
            <Button
              shape="circle"
              icon={<FolderOpenOutlined />}
              onClick={() => {
                if (record.savePath) {
                  window.electronAPI.fileShowInFolder(record.savePath);
                }
              }}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                color: "var(--primary)",
              }}
            />
          </Tooltip>
          <Popconfirm
            title={t("messages.confirmDelete")}
            onConfirm={() => handleDelete(record.id)}
            okText={t("common.yes")}
            cancelText={t("common.no")}
          >
            <Tooltip title={t("common.delete")}>
              <Button
                shape="circle"
                danger
                icon={<DeleteOutlined />}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const statusOptions = [
    { label: t("downloads.completed"), value: "completed" },
    { label: t("downloads.failed"), value: "failed" },
    { label: t("downloads.cancelled"), value: "cancelled" },
  ];

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.filename?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.url?.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus =
      statusFilter.length === 0 || statusFilter.includes(item.status);
    return matchesSearch && matchesStatus;
  });

  return (
    <HistoryContainer className="animate-in">
      <TitleArrangement>
        <h1>{t("history.title")}</h1>
        <Space size={12}>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={() => handleExport("csv")}
            disabled={history.length === 0}
            style={{ borderRadius: "10px", height: "40px" }}
          >
            {t("history.exportCSV")}
          </Button>
          <Popconfirm
            title={t("history.confirmClear")}
            onConfirm={handleClear}
            okText={t("common.yes")}
            cancelText={t("common.no")}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={history.length === 0}
              style={{
                borderRadius: "10px",
                height: "40px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {t("history.clearHistory")}
            </Button>
          </Popconfirm>
        </Space>
      </TitleArrangement>

      <StyledCard>
        <FilterRow>
          <Input
            className="search-input"
            prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
            placeholder={t("history.searchByName")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            mode="multiple"
            placeholder={t("history.filterByStatus")}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 240 }}
            options={statusOptions}
            maxTagCount="responsive"
          />
        </FilterRow>

        {filteredHistory.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: "var(--text-muted)" }}>
                {t("history.noHistory")}
              </span>
            }
            style={{ padding: "64px 0" }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredHistory}
            rowKey="id"
            pagination={{ pageSize: 12, position: ["bottomCenter"] }}
            loading={loading}
            scroll={{ x: 800 }}
            className="premium-table"
          />
        )}
      </StyledCard>
    </HistoryContainer>
  );
};

export default History;
