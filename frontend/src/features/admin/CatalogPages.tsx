'use client';

import {
  App,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { deleteData, getPage, patchData, postData } from '@/lib/request';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { SearchBar } from '@/components/ui/SearchBar';
import type {
  CareerGoal,
  CareerRequiredSkill,
  Skill,
  SkillCategory,
  SkillType,
} from '@/types/domain';

type CatalogKind = 'skill-categories' | 'skills' | 'career-goals';

const titles: Record<CatalogKind, string> = {
  'skill-categories': 'Skill Categories',
  skills: 'Skills',
  'career-goals': 'Career Goals',
};

const skillTypeOptions: Array<{ value: SkillType; label: string }> = [
  { value: 'COMMON', label: 'COMMON' },
  { value: 'CAREER_SPECIFIC', label: 'CAREER_SPECIFIC' },
];

export function CatalogPage({ kind }: { kind: CatalogKind }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedCareerGoal, setSelectedCareerGoal] = useState<CareerGoal | null>(null);
  const [form] = Form.useForm();
  const selectedSkillType = Form.useWatch('type', form);

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
    mutationFn: (values: any) => {
      const payload = buildCatalogPayload(kind, values);
      return editing ? patchData(`/${kind}/${editing.id}`, payload) : postData(`/${kind}`, payload);
    },
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
    form.resetFields();
    form.setFieldsValue(record ?? { status: 'ACTIVE', type: 'CAREER_SPECIFIC' });
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
            ? [
                { title: 'Type', render: (_: unknown, row: Skill) => <SkillTypeTag type={row.type} /> },
                { title: 'Category', render: (_: unknown, row: Skill) => row.category?.name ?? '-' },
                {
                  title: 'Defaults',
                  render: (_: unknown, row: Skill) =>
                    row.type === 'COMMON'
                      ? `${row.defaultRequiredLevel ?? '-'} / ${row.defaultWeight ?? '-'}`
                      : '-',
                },
              ]
            : []),
          ...(kind === 'career-goals'
            ? [
                {
                  title: 'Required Skills',
                  render: (_: unknown, row: CareerGoal) => row._count?.requiredSkills ?? 0,
                },
              ]
            : []),
          { title: 'Status', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> },
          { title: 'Description', dataIndex: 'description', ellipsis: true },
          {
            title: 'Actions',
            render: (_value: unknown, record: any) => (
              <Space>
                {kind === 'career-goals' ? (
                  <Button onClick={() => setSelectedCareerGoal(record)}>Required Skills</Button>
                ) : null}
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
            <>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select options={skillTypeOptions} />
              </Form.Item>
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
              {selectedSkillType === 'COMMON' ? (
                <Space.Compact block>
                  <Form.Item
                    name="defaultRequiredLevel"
                    label="Default Level"
                    preserve={false}
                    rules={[{ required: true }]}
                    style={{ width: '50%' }}
                  >
                    <InputNumber min={1} max={3} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="defaultWeight"
                    label="Default Weight"
                    preserve={false}
                    rules={[{ required: true }]}
                    style={{ width: '50%' }}
                  >
                    <InputNumber min={0.01} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Space.Compact>
              ) : null}
            </>
          ) : null}
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ value: 'ACTIVE' }, { value: 'INACTIVE' }]} />
          </Form.Item>
        </Form>
      </Modal>
      <RequiredSkillsDrawer
        careerGoal={selectedCareerGoal}
        open={Boolean(selectedCareerGoal)}
        onClose={() => setSelectedCareerGoal(null)}
      />
    </QueryState>
  );
}

function RequiredSkillsDrawer({
  careerGoal,
  open,
  onClose,
}: {
  careerGoal: CareerGoal | null;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CareerRequiredSkill | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const endpoint = careerGoal ? `/career-goals/${careerGoal.id}/required-skills` : '';

  const requiredSkills = useQuery({
    queryKey: ['career-required-skills', careerGoal?.id],
    queryFn: () => getPage<CareerRequiredSkill>(endpoint, { limit: 100 }),
    enabled: Boolean(careerGoal?.id),
  });
  const careerSpecificSkills = useQuery({
    queryKey: ['skills', 'career-specific-options'],
    queryFn: () =>
      getPage<Skill>('/skills', { limit: 200, status: 'ACTIVE', type: 'CAREER_SPECIFIC' }),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        weight: Number(values.weight),
        learningOrder: values.learningOrder ?? 0,
      };
      return editing
        ? patchData(`${endpoint}/${editing.id}`, payload)
        : postData(endpoint, { ...payload, isRequired: true });
    },
    onSuccess: () => {
      message.success('Saved');
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['career-required-skills', careerGoal?.id] });
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteData(`${endpoint}/${id}`),
    onSuccess: () => {
      message.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['career-required-skills', careerGoal?.id] });
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
    },
  });

  const openRequiredSkillForm = (record?: CareerRequiredSkill) => {
    setEditing(record ?? null);
    form.resetFields();
    form.setFieldsValue(
      record
        ? {
            skillId: record.skillId,
            requiredLevel: record.requiredLevel,
            weight: Number(record.weight),
            learningOrder: record.learningOrder,
          }
        : {
            requiredLevel: 1,
            weight: 1,
            learningOrder: (requiredSkills.data?.data.length ?? 0) + 1,
          },
    );
    setModalOpen(true);
  };

  return (
    <Drawer title={careerGoal?.name} open={open} onClose={onClose} width={860}>
      <QueryState loading={requiredSkills.isLoading} error={requiredSkills.error}>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openRequiredSkillForm()}>
            Add Skill
          </Button>
          <Button onClick={() => requiredSkills.refetch()}>Refresh</Button>
        </Space>
        <Table
          rowKey="id"
          dataSource={requiredSkills.data?.data ?? []}
          pagination={false}
          columns={[
            { title: 'Skill', render: (_: unknown, row) => row.skill?.name ?? row.skillId },
            { title: 'Type', render: (_: unknown, row) => <SkillTypeTag type={row.skill?.type} /> },
            { title: 'Level', dataIndex: 'requiredLevel' },
            { title: 'Weight', render: (_: unknown, row) => Number(row.weight) },
            { title: 'Order', dataIndex: 'learningOrder' },
            {
              title: 'Actions',
              render: (_: unknown, row) => (
                <Space>
                  <Button onClick={() => openRequiredSkillForm(row)}>Edit</Button>
                  <Button danger onClick={() => remove.mutate(row.id)}>Delete</Button>
                </Space>
              ),
            },
          ]}
        />
      </QueryState>
      <Modal
        title={editing ? 'Edit Required Skill' : 'Add Required Skill'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
          <Form.Item name="skillId" label="Skill" rules={[{ required: true }]}>
            <Select
              disabled={Boolean(editing)}
              loading={careerSpecificSkills.isLoading}
              showSearch
              optionFilterProp="label"
              options={(careerSpecificSkills.data?.data ?? []).map((skill) => ({
                label: skill.name,
                value: skill.id,
              }))}
            />
          </Form.Item>
          <Space.Compact block>
            <Form.Item
              name="requiredLevel"
              label="Required Level"
              rules={[{ required: true }]}
              style={{ width: '50%' }}
            >
              <InputNumber min={1} max={3} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="weight"
              label="Weight"
              rules={[{ required: true }]}
              style={{ width: '50%' }}
            >
              <InputNumber min={0.01} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="learningOrder" label="Learning Order">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}

function SkillTypeTag({ type }: { type?: SkillType }) {
  return <Tag color={type === 'COMMON' ? 'blue' : 'green'}>{type ?? '-'}</Tag>;
}

function buildCatalogPayload(kind: CatalogKind, values: any) {
  if (kind !== 'skills') {
    return values;
  }

  const payload = { ...values };
  if (payload.type !== 'COMMON') {
    delete payload.defaultRequiredLevel;
    delete payload.defaultWeight;
  }

  return payload;
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
