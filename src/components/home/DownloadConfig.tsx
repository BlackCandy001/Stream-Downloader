import React from 'react'
import { Form, Input, InputNumber, Slider, Switch, Button } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

interface DownloadConfigProps {
  form: any
}

const DownloadConfig: React.FC<DownloadConfigProps> = ({ form }) => {
  const { t } = useTranslation()

  return (
    <Form form={form} layout="vertical">
      <Form.Item
        label={t('home.saveLocation')}
        name="savePath"
        rules={[{ required: true, message: t('home.saveLocation') }]}
      >
        <Input
          addonAfter={
            <Button
              icon={<FolderOpenOutlined />}
              onClick={async () => {
                const path = await window.electronAPI.filePickFolder()
                if (path) {
                  form.setFieldValue('savePath', path)
                }
              }}
            >
              {t('home.browse')}
            </Button>
          }
        />
      </Form.Item>

      <Form.Item
        label={t('home.threadCount')}
        name="threadCount"
        initialValue={8}
      >
        <Slider min={1} max={32} marks={{ 1: '1', 8: '8', 16: '16', 32: '32' }} />
      </Form.Item>

      <Form.Item
        label={t('home.speedLimit')}
        name="maxSpeed"
        initialValue={0}
      >
        <InputNumber
          style={{ width: '100%' }}
          placeholder={t('home.unlimited')}
          addonAfter="MB/s"
          min={0}
        />
      </Form.Item>

      <Form.Item
        label={t('home.autoMerge')}
        name="autoMerge"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label={t('settings.deleteTempFiles')}
        name="deleteTempFiles"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>
    </Form>
  )
}

export default DownloadConfig
