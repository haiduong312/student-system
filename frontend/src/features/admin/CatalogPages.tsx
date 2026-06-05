'use client';

import { Button, Form, Input, Modal, Select, Space, Table, Tag, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { deleteData, getPage, postData, patchData } from '@/lib/request';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { SearchBar } from '@/components/ui/SearchBar';
import type { CareerGoal, Skill, SkillCategory } from '@/types/domain';

type CatalogKind = 'skill-categories' | 'skills' | 'career-goals';

const titles: Record<CatalogKind, string> = {
  'skill-categories': 'Skill Categories',
  skills: 'Skills',
  'career-goals': 'Career Goals',
};

export function CatalogPage({ kind }: { kind: CatalogKind }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const query = useQuery({
    queryKey: [kind, search],
    queryFn: () => getPage<any>(`/${kind}`, { search, limit: 50 }),
  });
  const categories = useQuery({
    queryKey: ['skill-categories', 'options'],
    queryFn: () => getPage<SkillCategory>('/skill-categories', { limit: 100, status: 'ACTIVE' }),
    enabled: kind === 'skills',
  });

  const save = useMutation({
    mutationFn: (values: any) =>
      editing ? patchData(`/${kind}/${editing.id}`, values) : postData(`/${kind}`, values),
    onSuccess: () => {
      message.success('Saved');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: [kind] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteData(`/${kind}/${id}`),
    onSuccess: () => {
      message.success('Deleted');
      queryClient.invalidateQueries({ queryKey: [kind] });
    },
  });

  const openForm = (record?: any) => {
    setEditing(record ?? null);
    form.setFieldsValue(record ?? { status: 'ACTIVE' });
    setOpen(true);
  };

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title={titles[kind]} />
      <SearchBar
        onSearch={setSearch}
        onRefresh={() => query.refetch()}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Add</Button>}
      />
      <Table
        rowKey="id"
        dataSource={query.data?.data ?? []}
        pagination={{ pageSize: 10, total: query.data?.meta.total }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          ...(kind === 'skills'
            ? [{ title: 'Category', render: (_: unknown, row: Skill) => row.category?.name ?? '-' }]
            : []),
          { title: 'Status', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> },
          { title: 'Description', dataIndex: 'description', ellipsis: true },
          {
            title: 'Actions',
            render: (_value: unknown, record: any) => (
              <Space>
                <Button onClick={() => openForm(record)}>Edit</Button>
                <Button danger onClick={() => remove.mutate(record.id)}>Delete</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? `Edit ${titles[kind]}` : `Add ${titles[kind]}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {kind === 'skills' ? (
            <Form.Item name="categoryId" label="Category">
              <Select
                allowClear
                loading={categories.isLoading}
                options={(categories.data?.data ?? []).map((category) => ({
                  label: category.name,
                  value: category.id,
                }))}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ value: 'ACTIVE' }, { value: 'INACTIVE' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </QueryState>
  );
}

export function CareerGoalsPage() {
  return <CatalogPage kind="career-goals" />;
}

export function SkillsPage() {
  return <CatalogPage kind="skills" />;
}

export function SkillCategoriesPage() {
  return <CatalogPage kind="skill-categories" />;
}
