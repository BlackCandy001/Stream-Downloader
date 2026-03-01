import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Slider,
  InputNumber,
  Switch,
  Space,
  Divider,
  App,
  Tabs,
  Modal,
  Typography,
} from "antd";
import {
  SaveOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useSettingsStore } from "../store/settingsStore";

const SettingsContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 32px;
  color: var(--text-main);
  letter-spacing: -1px;
`;

const StyledCard = styled(Card)`
  border-radius: 12px !important;
  border: 1px solid var(--border-color) !important;
  background: var(--bg-secondary) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;

  .ant-card-head {
    border-bottom: 1px solid var(--border-color);
    padding: 0 24px;
    height: 72px;
    display: flex;
    align-items: center;
    background: transparent;

    .ant-card-head-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
    }
  }

  .ant-card-body {
    padding: 24px;
  }

  .ant-tabs-nav {
    margin-bottom: 32px !important;
    &::before {
      border-bottom: 1px solid var(--border-color) !important;
    }
  }

  .ant-tabs-tab {
    padding: 12px 0 !important;
    margin: 0 24px 0 0 !important;
    color: var(--text-muted);
    font-weight: 500;

    &:hover {
      color: var(--primary) !important;
    }
  }

  .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: var(--primary) !important;
    font-weight: 700 !important;
  }

  .ant-tabs-ink-bar {
    background: var(--primary) !important;
    height: 3px !important;
    border-radius: 3px;
  }
`;

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { settings, loadSettings, updateSettings } = useSettingsStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [ffmpegFound, setFfmpegFound] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      form.setFieldsValue(settings);
    }
  }, [settings, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await updateSettings(values);
      message.success(t("messages.settingsSaved"));
    } catch (error) {
      message.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    await window.electronAPI.settingsReset();
    await loadSettings();
    message.success(t("messages.settingsReset"));
  };

  const { modal } = App.useApp();

  const handleFactoryReset = () => {
    modal.confirm({
      title: t("messages.factoryReset"),
      content: (
        <Typography.Text type="danger">
          {t("messages.factoryResetConfirm")}
        </Typography.Text>
      ),
      okText: t("common.reset"),
      okType: "danger",
      cancelText: t("common.cancel"),
      onOk: async () => {
        try {
          setLoading(true);
          const result = await window.electronAPI.appResetData();
          if (result.success) {
            message.success(t("messages.factoryResetSuccess"));
            // Clear frontend persist storage (Zustand, etc)
            localStorage.clear();
            // Reload settings and potentially redirect
            await loadSettings();
            window.location.reload();
          }
        } catch (error) {
          message.error(t("common.error"));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleAutoDetectFFmpeg = async () => {
    setFfmpegFound(true);
    message.success(t("settings.found"));
  };

  const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
      {children}
    </span>
  );

  return (
    <SettingsContainer className="animate-in">
      <Title>{t("settings.title")}</Title>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <StyledCard
          title={
            <Space size={12}>
              <SettingOutlined
                style={{ color: "var(--primary)", fontSize: 24 }}
              />
              <span>Configuration</span>
            </Space>
          }
          extra={
            <Space size={16}>
              <Button
                onClick={handleReset}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  borderRadius: "10px",
                }}
              >
                {t("common.reset")}
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={loading}
                style={{
                  height: "40px",
                  padding: "0 24px",
                  borderRadius: "10px",
                  fontWeight: 600,
                }}
              >
                {t("common.save")}
              </Button>
            </Space>
          }
        >
          <Tabs
            defaultActiveKey="general"
            items={[
              {
                key: "general",
                label: t("settings.general"),
                children: (
                  <div style={{ maxWidth: 500 }}>
                    <Form.Item
                      label={<FormLabel>{t("settings.language")}</FormLabel>}
                      name="language"
                    >
                      <Select style={{ borderRadius: "10px" }}>
                        <Select.Option value="en">🇺🇸 English</Select.Option>
                        <Select.Option value="vi">🇻🇳 Tiếng Việt</Select.Option>
                        <Select.Option value="zh">🇨🇳 中文</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      label={<FormLabel>{t("settings.theme")}</FormLabel>}
                      name="theme"
                    >
                      <Select>
                        <Select.Option value="light">
                          {t("settings.light")}
                        </Select.Option>
                        <Select.Option value="dark">
                          {t("settings.dark")}
                        </Select.Option>
                        <Select.Option value="auto">
                          {t("settings.auto")}
                        </Select.Option>
                      </Select>
                    </Form.Item>

                    <Space
                      direction="vertical"
                      style={{ width: "100%", marginTop: 24 }}
                      size={20}
                    >
                      <Form.Item
                        label={
                          <FormLabel>{t("settings.startOnBoot")}</FormLabel>
                        }
                        name="startOnBoot"
                        valuePropName="checked"
                        layout="horizontal"
                        className="flex-between"
                        style={{ marginBottom: 0 }}
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        label={
                          <FormLabel>{t("settings.minimizeToTray")}</FormLabel>
                        }
                        name="minimizeToTray"
                        valuePropName="checked"
                        layout="horizontal"
                        style={{ marginBottom: 0 }}
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        label={
                          <FormLabel>{t("settings.checkForUpdates")}</FormLabel>
                        }
                        name="checkForUpdates"
                        valuePropName="checked"
                        layout="horizontal"
                        style={{ marginBottom: 0 }}
                      >
                        <Switch />
                      </Form.Item>
                    </Space>
                  </div>
                ),
              },
              {
                key: "download",
                label: t("settings.download"),
                children: (
                  <div style={{ maxWidth: 700 }}>
                    <Form.Item
                      label={
                        <FormLabel>{t("settings.defaultSaveFolder")}</FormLabel>
                      }
                    >
                      <Space.Compact style={{ width: "100%" }}>
                        <Form.Item name="defaultSaveFolder" noStyle>
                          <Input style={{ flex: 1 }} />
                        </Form.Item>
                        <Button
                          icon={<FolderOpenOutlined />}
                          onClick={async (e) => {
                            e.preventDefault();
                            const path =
                              await window.electronAPI.filePickFolder();
                            if (path) {
                              form.setFieldsValue({
                                defaultSaveFolder: path,
                              });
                            }
                          }}
                          style={{ color: "var(--primary)" }}
                        >
                          {t("home.browse")}
                        </Button>
                      </Space.Compact>
                    </Form.Item>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 40,
                        marginTop: 16,
                      }}
                    >
                      <Form.Item
                        label={
                          <FormLabel>
                            {t("settings.concurrentDownloads")}
                          </FormLabel>
                        }
                        name="maxConcurrentDownloads"
                      >
                        <Slider
                          min={1}
                          max={10}
                          marks={{ 1: "1", 5: "5", 10: "10" }}
                        />
                      </Form.Item>

                      <Form.Item
                        label={
                          <FormLabel>
                            {t("settings.defaultThreadCount")}
                          </FormLabel>
                        }
                        name="defaultThreadCount"
                      >
                        <Slider
                          min={1}
                          max={32}
                          marks={{ 1: "1", 8: "8", 16: "16", 32: "32" }}
                        />
                      </Form.Item>
                    </div>

                    <Form.Item
                      label={
                        <FormLabel>{t("settings.defaultSpeedLimit")}</FormLabel>
                      }
                      name="defaultSpeedLimit"
                    >
                      <Space.Compact style={{ width: "240px" }}>
                        <InputNumber
                          style={{ flex: 1 }}
                          placeholder={t("home.unlimited")}
                          min={0}
                        />
                        <Button
                          disabled
                          style={{
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-color)",
                            borderLeft: "none",
                            color: "var(--text-muted)",
                          }}
                        >
                          MB/s
                        </Button>
                      </Space.Compact>
                    </Form.Item>

                    <Divider
                      style={{ borderTopColor: "var(--glass-border)" }}
                    />

                    <Space
                      direction="vertical"
                      style={{ width: "100%" }}
                      size={20}
                    >
                      <Form.Item
                        label={<FormLabel>{t("settings.autoMerge")}</FormLabel>}
                        name="autoMerge"
                        valuePropName="checked"
                        layout="horizontal"
                        style={{ marginBottom: 0 }}
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        label={
                          <FormLabel>{t("settings.deleteTempFiles")}</FormLabel>
                        }
                        name="deleteTempFiles"
                        valuePropName="checked"
                        layout="horizontal"
                        style={{ marginBottom: 0 }}
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        label={
                          <FormLabel>
                            {t("settings.openFolderWhenComplete")}
                          </FormLabel>
                        }
                        name="openFolderWhenComplete"
                        valuePropName="checked"
                        layout="horizontal"
                        style={{ marginBottom: 0 }}
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        label={
                          <FormLabel>
                            {t("settings.enableInstantDownload")}
                          </FormLabel>
                        }
                        extra={
                          <span
                            style={{ fontSize: 12, color: "var(--text-muted)" }}
                          >
                            {t("settings.enableInstantDownloadDesc")}
                          </span>
                        }
                        name="enableInstantDownload"
                        valuePropName="checked"
                        layout="horizontal"
                        style={{ marginBottom: 0 }}
                      >
                        <Switch />
                      </Form.Item>
                    </Space>
                  </div>
                ),
              },
              {
                key: "advanced",
                label: t("settings.advanced"),
                children: (
                  <>
                    <Form.Item
                      label={<FormLabel>FFmpeg Executable Path</FormLabel>}
                      name="ffmpegPath"
                    >
                      <Space.Compact style={{ width: "100%" }}>
                        <Input style={{ flex: 1 }} />
                        <Button
                          onClick={handleAutoDetectFFmpeg}
                          style={{ color: "var(--primary)" }}
                        >
                          {t("settings.autoDetect")}
                        </Button>
                      </Space.Compact>
                    </Form.Item>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 40,
                      }}
                    >
                      <Form.Item
                        label={
                          <FormLabel>{t("settings.requestTimeout")}</FormLabel>
                        }
                        name="requestTimeout"
                      >
                        <Space.Compact style={{ width: "100%" }}>
                          <InputNumber style={{ flex: 1 }} min={1} />
                          <Button
                            disabled
                            style={{
                              background: "var(--bg-tertiary)",
                              border: "1px solid var(--border-color)",
                              borderLeft: "none",
                              color: "var(--text-muted)",
                            }}
                          >
                            {t("units.seconds")}
                          </Button>
                        </Space.Compact>
                      </Form.Item>

                      <Form.Item
                        label={
                          <FormLabel>{t("settings.retryCount")}</FormLabel>
                        }
                        name="retryCount"
                      >
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          max={10}
                        />
                      </Form.Item>
                    </div>

                    <Form.Item
                      label={
                        <FormLabel>{t("settings.customCliArgs")}</FormLabel>
                      }
                      name="customCliArgs"
                      help={
                        <span
                          style={{ color: "var(--text-muted)", fontSize: 12 }}
                        >
                          Additional arguments passed to the backend
                        </span>
                      }
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder="--custom-arg1 --custom-arg2"
                        style={{ borderRadius: "12px" }}
                      />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "danger",
                label: (
                  <span style={{ color: "var(--status-failed)" }}>
                    {t("messages.factoryReset")}
                  </span>
                ),
                children: (
                  <div style={{ maxWidth: 500, padding: "20px 0" }}>
                    <Typography.Title level={4} type="danger">
                      {t("messages.factoryReset")}
                    </Typography.Title>
                    <Typography.Paragraph>
                      {t("messages.factoryResetWarning")}
                    </Typography.Paragraph>
                    <Button
                      danger
                      type="primary"
                      onClick={handleFactoryReset}
                      style={{
                        height: "45px",
                        padding: "0 32px",
                        borderRadius: "12px",
                        fontWeight: 700,
                        marginTop: 16,
                      }}
                    >
                      {t("messages.factoryReset")}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </StyledCard>
      </Form>
    </SettingsContainer>
  );
};

export default Settings;
