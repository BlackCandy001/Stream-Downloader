import React, { useState, useEffect } from "react";
import {
  Card,
  Input,
  Button,
  Space,
  App,
  Form,
  Slider,
  InputNumber,
  Tooltip,
  Switch,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import StreamSelector from "../components/home/StreamSelector";
import { useDownloader } from "../hooks/useDownloader";
import { useSettingsStore } from "../store/settingsStore";

const { TextArea } = Input;

const HomeContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: 48px;

  h1 {
    font-size: 48px;
    font-weight: 800;
    margin-bottom: 12px;
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -1.5px;
  }

  p {
    color: var(--text-muted);
    font-size: 18px;
  }
`;

const UrlInputContainer = styled.div`
  position: relative;
  background: var(--surface);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;

  &:focus-within {
    border-color: var(--primary);
    box-shadow:
      0 0 0 4px var(--primary-glow),
      0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .url-input {
    flex: 1;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    font-size: 16px;
    padding: 12px 16px;
    color: var(--text-main);

    &::placeholder {
      color: var(--text-muted);
    }
  }
`;

const ConfigCard = styled(Card)`
  margin-top: 32px;
  border-radius: 24px !important;
  border: 1px solid var(--glass-border) !important;
  background: var(--glass) !important;

  .ant-card-head {
    border-bottom: 1px solid var(--glass-border);
    background: transparent;

    .ant-card-head-title {
      font-weight: 700;
      color: var(--text-main);
    }
  }
`;

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [streams, setStreams] = useState<any[]>([]);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const { settings, loadSettings } = useSettingsStore();
  const { parseStream, startDownload } = useDownloader();
  const [form] = Form.useForm();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onExtensionStreamDetected((data) => {
      if (data && data.url) {
        setUrl(data.url);
        message.info(t("home.streamDetected"));
        // Optionally auto-parse
        // handleParse();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [message, t]);

  const handleParse = async () => {
    if (!url.trim()) {
      message.error(t("messages.invalidUrl"));
      return;
    }

    setLoading(true);
    try {
      const result = await parseStream(url);
      if (result.success) {
        setStreams(result.streams || []);
        message.success(t("messages.parseSuccess"));
      } else {
        message.error(result.error || t("messages.parseError"));
        setStreams([]);
      }
    } catch (error: any) {
      message.error(error.message || t("messages.parseError"));
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await window.electronAPI.clipboardReadText();
      setUrl(text);
    } catch (error) {
      message.error(t("messages.clipboardError"));
    }
  };

  const handleDownload = async () => {
    if (selectedStreams.length === 0) {
      message.warning(t("home.selectQuality"));
      return;
    }

    try {
      const values = await form.validateFields();

      // Fix #6: Normalize savePath — empty string should be treated as "not set"
      // so the backend falls back to the Downloads folder correctly
      const savePath =
        values.savePath && values.savePath.trim() !== ""
          ? values.savePath.trim()
          : null;

      const options = {
        url,
        selectedStreamIds: selectedStreams,
        savePath,
        threadCount: values.threadCount,
        maxSpeed: values.maxSpeed,
        autoMerge: values.autoMerge,
      };

      const result = await startDownload(options);
      if (result.success) {
        message.success(t("messages.downloadStarted"));
        setUrl("");
        setStreams([]);
        setSelectedStreams([]);
        setShowConfig(false);
      } else {
        message.error(result.error || t("messages.downloadFailed"));
      }
    } catch (error: any) {
      message.error(error.message || t("messages.downloadFailed"));
    }
  };

  return (
    <HomeContainer className="animate-in">
      <HeroSection>
        <h1>{t("home.title")}</h1>
        <p>Paste your stream link below to begin processing.</p>
      </HeroSection>

      <UrlInputContainer>
        <Input
          className="url-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("home.urlInput")}
          onPressEnter={handleParse}
          disabled={loading}
        />
        <Space size={8} style={{ paddingRight: 8 }}>
          <Tooltip title={t("home.pasteButton")}>
            <Button
              shape="circle"
              icon={<CopyOutlined />}
              onClick={handlePaste}
              disabled={loading}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-main)",
              }}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleParse}
            loading={loading}
            style={{ borderRadius: "12px", padding: "0 24px", height: "44px" }}
          >
            {t("home.parseButton")}
          </Button>
        </Space>
      </UrlInputContainer>

      {streams.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <StreamSelector
            streams={streams}
            onSelectionChange={setSelectedStreams}
          />

          <ConfigCard
            title={
              <Space>
                <SettingOutlined style={{ color: "var(--primary)" }} />
                <span>{t("home.downloadConfig")}</span>
              </Space>
            }
            extra={
              <Button
                type="link"
                onClick={() => setShowConfig(!showConfig)}
                style={{ color: "var(--primary)" }}
              >
                {showConfig ? t("common.close") : t("home.advancedOptions")}
              </Button>
            }
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                savePath: settings.defaultSaveFolder,
                threadCount: settings.defaultThreadCount || 8,
              }}
            >
              <Form.Item
                label={
                  <span style={{ color: "var(--text-muted)" }}>
                    {t("home.saveLocation")}
                  </span>
                }
                name="savePath"
              >
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    placeholder={t("home.saveLocation")}
                    style={{ flex: 1 }}
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={async () => {
                      const path = await window.electronAPI.filePickFolder();
                      if (path) {
                        form.setFieldValue("savePath", path);
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
                  gridTemplateColumns: "2fr 1fr 100px",
                  gap: 32,
                  alignItems: "flex-start",
                }}
              >
                <Form.Item
                  label={
                    <span style={{ color: "var(--text-muted)" }}>
                      {t("home.threadCount")}
                    </span>
                  }
                  name="threadCount"
                  initialValue={8}
                >
                  <Slider
                    min={1}
                    max={32}
                    marks={{ 1: "1", 8: "8", 16: "16", 32: "32" }}
                    tooltip={{ open: false }}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <span style={{ color: "var(--text-muted)" }}>
                      {t("home.speedLimit")}
                    </span>
                  }
                  name="maxSpeed"
                >
                  <InputNumber
                    style={{ width: "100%", borderRadius: "8px" }}
                    placeholder={t("home.unlimited")}
                    addonAfter={
                      <span style={{ color: "var(--text-muted)" }}>MB/s</span>
                    }
                    min={0}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <span style={{ color: "var(--text-muted)" }}>
                      {t("home.autoMerge")}
                    </span>
                  }
                  name="autoMerge"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                </Form.Item>
              </div>
            </Form>

            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              disabled={selectedStreams.length === 0}
              block
              style={{
                height: "56px",
                borderRadius: "16px",
                fontSize: "18px",
                fontWeight: 700,
                marginTop: 16,
              }}
            >
              {t("home.downloadButton")}
            </Button>
          </ConfigCard>
        </div>
      )}
    </HomeContainer>
  );
};

export default Home;
