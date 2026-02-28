import React from "react";
import { Form, Input, InputNumber, Slider, Switch, Button, Space } from "antd";
import { FolderOpenOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

interface DownloadConfigProps {
  form: any;
}

const DownloadConfig: React.FC<DownloadConfigProps> = ({ form }) => {
  const { t } = useTranslation();

  return (
    <Form form={form} layout="vertical">
      <Form.Item
        label={t("home.saveLocation")}
        name="savePath"
        rules={[{ required: true, message: t("home.saveLocation") }]}
      >
        <Space.Compact style={{ width: "100%" }}>
          <Input style={{ flex: 1 }} />
          <Button
            icon={<FolderOpenOutlined />}
            onClick={async () => {
              const path = await window.electronAPI.filePickFolder();
              if (path) {
                form.setFieldValue("savePath", path);
              }
            }}
          >
            {t("home.browse")}
          </Button>
        </Space.Compact>
      </Form.Item>

      <Form.Item label={t("home.threadCount")} name="threadCount">
        <Slider
          min={1}
          max={32}
          marks={{ 1: "1", 8: "8", 16: "16", 32: "32" }}
        />
      </Form.Item>

      <Form.Item label={t("home.speedLimit")} name="maxSpeed">
        <Space.Compact style={{ width: "100%" }}>
          <InputNumber
            style={{ flex: 1 }}
            placeholder={t("home.unlimited")}
            min={0}
          />
          <Button disabled>MB/s</Button>
        </Space.Compact>
      </Form.Item>

      <Form.Item
        label={t("home.autoMerge")}
        name="autoMerge"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label={t("settings.deleteTempFiles")}
        name="deleteTempFiles"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>
    </Form>
  );
};

export default DownloadConfig;
