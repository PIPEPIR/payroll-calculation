"use client";

import React from 'react';
import { Workbook } from '@fortune-sheet/react';
import { Modal, Button, Space, Typography } from 'antd';
import { DownloadOutlined, EditOutlined } from '@ant-design/icons';

interface FortuneSheetEditorProps {
  open: boolean;
  title: string;
  data: any[];
  onOk: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const FortuneSheetEditor: React.FC<FortuneSheetEditorProps> = ({
  open,
  title,
  data,
  onOk,
  onCancel,
  loading = false,
}) => {
  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <Typography.Text strong>{title}</Typography.Text>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      width="95%"
      style={{ top: 20 }}
      bodyStyle={{ 
        padding: 0,
        height: '85vh',
        overflow: 'hidden'
      }}
      confirmLoading={loading}
      footer={
        <div style={{ 
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <Button onClick={onCancel} disabled={loading}>
            ยกเลิก
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={onOk}
            loading={loading}
          >
            ส่งออก Excel
          </Button>
        </div>
      }
    >
      <div style={{ 
        height: '85vh',
        width: '100%',
        overflow: 'hidden'
      }}>
        <Workbook
          data={data}
          cellContextMenu={[
            'copy',
            'paste',
            '|',
            'insert-row',
            'insert-column',
            '|',
            'delete-row',
            'delete-column',
            '|',
            'clear',
          ]}
        />
      </div>
    </Modal>
  );
};
