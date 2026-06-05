'use client';

import { Button, Input, Space } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';

export function SearchBar({
  onSearch,
  onRefresh,
  extra,
}: {
  onSearch: (value: string) => void;
  onRefresh?: () => void;
  extra?: React.ReactNode;
}) {
  const [value, setValue] = useState('');

  return (
    <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
      <Input.Search
        allowClear
        placeholder="Search"
        style={{ width: 280 }}
        value={value}
        enterButton={<SearchOutlined />}
        onChange={(event) => setValue(event.target.value)}
        onSearch={onSearch}
      />
      <Space>
        {extra}
        {onRefresh ? <Button icon={<ReloadOutlined />} onClick={onRefresh} /> : null}
      </Space>
    </Space>
  );
}
