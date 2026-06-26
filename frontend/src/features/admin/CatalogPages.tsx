'use client';

import {
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { SearchBar } from '@/components/ui/SearchBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { invalidateStudentCurrentContextQueries } from '@/features/student/profile-context';
import type {
  CareerGoal,
  CareerRequiredSkill,
  CatalogStatus,
  RoadmapPhase,
  Skill,
  SkillCategory,
  SkillType,
  Specialization,
} from '@/types/domain';
import {
  adminCatalogService,
  type CatalogKind,
  type CatalogPayload,
  type CatalogRecord,
  type RequiredSkillPayload,
  type SpecializationPayload,
} from './catalog.service';

const titles: Record<CatalogKind, string> = {
  'skill-categories': 'Skill Categories',
  skills: 'Skills',
  'career-goals': 'Career Goals',
};

const skillTypeOptions: Array<{ value: SkillType; label: string }> = [
  { value: 'COMMON', label: 'COMMON' },
  { value: 'CAREER_SPECIFIC', label: 'CAREER_SPECIFIC' },
];
const roadmapPhaseOptions: Array<{ value: RoadmapPhase; label: string }> = [
  { value: 'CORE_FOUNDATION', label: 'Core Foundation' },
  { value: 'CAREER_TRACK', label: 'Career Track' },
  { value: 'SPECIALIZATION', label: 'Specialization' },
  { value: 'PRACTICE_PROJECT', label: 'Practice Project' },
  { value: 'PORTFOLIO_PREPARATION', label: 'Portfolio Preparation' },
];

interface CatalogFormValues {
  name: string;
  description?: string | null;
  status?: CatalogStatus;
  categoryId?: string | null;
  type?: SkillType;
  defaultRequiredLevel?: number;
  defaultWeight?: number;
  roadmapPhase?: RoadmapPhase | null;
}

interface RequiredSkillFormValues {
  skillId: string;
  requiredLevel: number;
  weight: number;
  learningOrder?: number;
  roadmapPhase?: RoadmapPhase;
}

interface SpecializationFormValues {
  name: string;
  description?: string | null;
  isActive: boolean;
}

export function CatalogPage({ kind }: { kind: CatalogKind }) {
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CatalogRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedCareerGoal, setSelectedCareerGoal] =
    useState<CareerGoal | null>(null);
  const [form] = Form.useForm<CatalogFormValues>();
  const selectedSkillType = Form.useWatch('type', form);

  const query = useQuery({
    queryKey: [kind, search],
    queryFn: () => adminCatalogService.listCatalog<CatalogRecord>(kind, { search }),
  });
  const categories = useQuery({
    queryKey: ['skill-categories', 'options'],
    queryFn: () => adminCatalogService.listSkillCategories(),
    enabled: kind === 'skills',
  });

  const save = useMutation({
    mutationFn: (values: CatalogFormValues) => {
      const payload = buildCatalogPayload(kind, values);
      return adminCatalogService.saveCatalog(kind, payload, editing?.id);
    },
    onSuccess: (result) => {
      message.success('Saved');
      notifyCatalogInvalidation(notification, result);
      setOpen(false);
      setEditing(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: [kind] });
      invalidateCatalogImpactQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminCatalogService.deleteCatalog(kind, id),
    onSuccess: (result) => {
      message.success('Deleted');
      notifyCatalogInvalidation(notification, result);
      queryClient.invalidateQueries({ queryKey: [kind] });
      invalidateCatalogImpactQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const openForm = (record?: CatalogRecord) => {
    setEditing(record ?? null);
    form.resetFields();
    form.setFieldsValue(
      record ? toCatalogFormValues(record) : { status: 'ACTIVE', type: 'CAREER_SPECIFIC' },
    );
    setOpen(true);
  };

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title={titles[kind]} />
      <SearchBar
        onSearch={setSearch}
        onRefresh={() => query.refetch()}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openForm()}
          >
            Add
          </Button>
        }
      />
      <Table<CatalogRecord>
        rowKey="id"
        dataSource={query.data?.data ?? []}
        pagination={{ pageSize: 10, total: query.data?.meta.total }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          ...(kind === 'skills'
            ? [
                {
                  title: 'Type',
                  render: (_: unknown, row: CatalogRecord) => (
                    <SkillTypeTag type={(row as Skill).type} />
                  ),
                },
                {
                  title: 'Default Level',
                  render: (_: unknown, row: CatalogRecord) =>
                    (row as Skill).type === 'COMMON'
                      ? ((row as Skill).defaultRequiredLevel ?? '-')
                      : '-',
                },
                {
                  title: 'Default Weight',
                  render: (_: unknown, row: CatalogRecord) =>
                    (row as Skill).type === 'COMMON' ? ((row as Skill).defaultWeight ?? '-') : '-',
                },
                {
                  title: 'Questions',
                  render: (_: unknown, row: CatalogRecord) =>
                    (row as Skill)._count?.assessmentQuestions ?? 0,
                },
              ]
            : []),
          ...(kind === 'career-goals'
            ? [
                {
                  title: 'Required Skills',
                  render: (_: unknown, row: CatalogRecord) =>
                    (row as CareerGoal)._count?.requiredSkills ?? 0,
                },
                {
                  title: 'Specializations',
                  render: (_: unknown, row: CatalogRecord) =>
                    (row as CareerGoal)._count?.specializations ?? '-',
                },
              ]
            : []),
          {
            title: 'Status',
            dataIndex: 'status',
            render: (status: CatalogStatus) => <StatusTag status={status} />,
          },
          { title: 'Description', dataIndex: 'description', ellipsis: true },
          {
            title: 'Actions',
            render: (_value: unknown, record: CatalogRecord) => (
              <Space>
                {kind === 'career-goals' ? (
                  <Button onClick={() => setSelectedCareerGoal(record as CareerGoal)}>
                    Manage
                  </Button>
                ) : null}
                <Button onClick={() => openForm(record)}>Edit</Button>
                <Button danger onClick={() => remove.mutate(record.id)}>
                  Delete
                </Button>
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
        <Form<CatalogFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
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
                    <InputNumber
                      min={0.01}
                      step={0.5}
                      style={{ width: '100%' }}
                    />
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
      <CareerGoalDetailDrawer
        careerGoal={selectedCareerGoal}
        open={Boolean(selectedCareerGoal)}
        onClose={() => setSelectedCareerGoal(null)}
      />
    </QueryState>
  );
}

function CareerGoalDetailDrawer({
  careerGoal,
  open,
  onClose,
}: {
  careerGoal: CareerGoal | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer title={careerGoal?.name} open={open} onClose={onClose} width={1080}>
      <Tabs
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: <CareerGoalOverview careerGoal={careerGoal} />,
          },
          {
            key: 'required-skills',
            label: 'Required Skills',
            children: (
              <RequiredSkillsManager
                enabled={open && Boolean(careerGoal?.id)}
                endpoint={
                  careerGoal
                    ? `/career-goals/${careerGoal.id}/required-skills`
                    : ''
                }
                queryKey={[
                  'career-required-skills',
                  'career-goal',
                  careerGoal?.id,
                ]}
                invalidateKeys={[
                  ['career-required-skills', 'career-goal', careerGoal?.id],
                  ['career-goals'],
                ]}
                defaultRoadmapPhase="CAREER_TRACK"
              />
            ),
          },
          {
            key: 'specializations',
            label: 'Specializations',
            children: (
              <SpecializationsTab careerGoal={careerGoal} open={open} />
            ),
          },
        ]}
      />
    </Drawer>
  );
}

function CareerGoalOverview({ careerGoal }: { careerGoal: CareerGoal | null }) {
  if (!careerGoal) {
    return null;
  }

  return (
    <Descriptions bordered column={1} size="small">
      <Descriptions.Item label="Name">{careerGoal.name}</Descriptions.Item>
      <Descriptions.Item label="Status">
        <StatusTag status={careerGoal.status} />
      </Descriptions.Item>
      <Descriptions.Item label="Description">
        {careerGoal.description || '-'}
      </Descriptions.Item>
      <Descriptions.Item label="Required Skills">
        {careerGoal._count?.requiredSkills ?? 0}
      </Descriptions.Item>
      <Descriptions.Item label="Student Profiles">
        {careerGoal._count?.studentProfiles ?? 0}
      </Descriptions.Item>
      <Descriptions.Item label="Updated">
        {formatDate(careerGoal.updatedAt)}
      </Descriptions.Item>
    </Descriptions>
  );
}

function RequiredSkillsManager({
  enabled,
  endpoint,
  queryKey,
  invalidateKeys,
  defaultRoadmapPhase,
  scope = 'career-goal',
  careerGoal,
  specialization,
  careerLevelSkillIds,
  careerLevelLoading = false,
}: {
  enabled: boolean;
  endpoint: string;
  queryKey: unknown[];
  invalidateKeys: unknown[][];
  defaultRoadmapPhase: RoadmapPhase;
  scope?: 'career-goal' | 'specialization';
  careerGoal?: CareerGoal | null;
  specialization?: Specialization | null;
  careerLevelSkillIds?: Set<string>;
  careerLevelLoading?: boolean;
}) {
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CareerRequiredSkill | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<RequiredSkillFormValues>();
  const isSpecializationScope = scope === 'specialization';

  const requiredSkills = useQuery({
    queryKey,
    queryFn: () => adminCatalogService.listRequiredSkills(endpoint, 100),
    enabled,
  });
  const careerSpecificSkills = useQuery({
    queryKey: ['skills', 'career-specific-options'],
    queryFn: () =>
      adminCatalogService.listSkills({
        limit: 200,
        status: 'ACTIVE',
        type: 'CAREER_SPECIFIC',
      }),
    enabled,
  });

  const save = useMutation({
    mutationFn: (values: RequiredSkillFormValues) => {
      const payload: RequiredSkillPayload = {
        skillId: values.skillId,
        requiredLevel: values.requiredLevel,
        weight: Number(values.weight),
        learningOrder: values.learningOrder ?? 0,
        roadmapPhase: values.roadmapPhase ?? defaultRoadmapPhase,
        isRequired: true,
      };
      return adminCatalogService.saveRequiredSkill(endpoint, payload, editing?.id);
    },
    onSuccess: (result) => {
      message.success('Saved');
      notifyCatalogInvalidation(notification, result);
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
      invalidateCatalogImpactQueries(queryClient);
    },
    onError: (error) => {
      message.error(getApiErrorMessage(error));
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminCatalogService.deleteRequiredSkill(endpoint, id),
    onSuccess: (result) => {
      message.success('Deleted');
      notifyCatalogInvalidation(notification, result);
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
      invalidateCatalogImpactQueries(queryClient);
    },
    onError: (error) => {
      message.error(getApiErrorMessage(error));
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
            roadmapPhase: record.roadmapPhase ?? defaultRoadmapPhase,
          }
        : {
            requiredLevel: 1,
            weight: 1,
            learningOrder: (requiredSkills.data?.data.length ?? 0) + 1,
            roadmapPhase: defaultRoadmapPhase,
          },
    );
    setModalOpen(true);
  };
  const requiredSkillRows = requiredSkills.data?.data ?? [];
  const existingSkillIds = new Set(
    requiredSkillRows.map((requiredSkill) => requiredSkill.skillId),
  );
  const skillOptions = (careerSpecificSkills.data?.data ?? [])
    .filter(
      (skill) =>
        editing?.skillId === skill.id || !existingSkillIds.has(skill.id),
    )
    .map((skill) => ({
      label: skill.name,
      value: skill.id,
    }));
  const duplicateSkillMessage = isSpecializationScope
    ? 'Skill is already configured for this specialization'
    : 'Skill is already configured for this career goal';
  const specializationCareerGoal = careerGoal ?? specialization?.careerGoal;

  return (
    <>
      {isSpecializationScope ? (
        <Descriptions
          bordered
          column={2}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="Career Goal">
            {specializationCareerGoal?.name ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Specialization">
            <Space>
              {specialization?.name ?? '-'}
              <StatusTag status={specialization?.status} />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {specialization?.description || '-'}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
      <QueryState
        loading={requiredSkills.isLoading}
        error={requiredSkills.error}
      >
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openRequiredSkillForm()}
          >
            Add Skill
          </Button>
          <Button onClick={() => requiredSkills.refetch()}>Refresh</Button>
        </Space>
        <Table<CareerRequiredSkill>
          rowKey="id"
          dataSource={requiredSkillRows}
          pagination={false}
          columns={[
            {
              title: 'Skill',
              render: (_: unknown, row) => row.skill?.name ?? row.skillId,
            },
            {
              title: 'Type',
              render: (_: unknown, row) => (
                <SkillTypeTag type={row.skill?.type} />
              ),
            },
            { title: 'Level', dataIndex: 'requiredLevel' },
            {
              title: 'Weight',
              render: (_: unknown, row) => Number(row.weight),
            },
            { title: 'Order', dataIndex: 'learningOrder' },
            {
              title: 'Phase',
              render: (_: unknown, row) => <Tag>{row.roadmapPhase ?? '-'}</Tag>,
            },
            ...(isSpecializationScope
              ? [
                  {
                    title: 'Scope',
                    render: (_: unknown, row: CareerRequiredSkill) => {
                      if (careerLevelLoading) {
                        return <Tag>Checking career-level</Tag>;
                      }

                      return careerLevelSkillIds?.has(row.skillId) ? (
                        <Tag color="gold">
                          Override career-level requirement
                        </Tag>
                      ) : (
                        <Tag color="purple">Specialization-specific</Tag>
                      );
                    },
                  },
                ]
              : []),
            {
              title: 'Actions',
              render: (_: unknown, row) => (
                <Space>
                  <Button onClick={() => openRequiredSkillForm(row)}>
                    Edit
                  </Button>
                  <Button danger onClick={() => remove.mutate(row.id)}>
                    Delete
                  </Button>
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
        <Form<RequiredSkillFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          <Form.Item
            name="skillId"
            label="Skill"
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  if (
                    !value ||
                    editing?.skillId === value ||
                    !existingSkillIds.has(value)
                  ) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error(duplicateSkillMessage));
                },
              },
            ]}
          >
            <Select
              disabled={Boolean(editing)}
              loading={careerSpecificSkills.isLoading}
              showSearch
              optionFilterProp="label"
              options={skillOptions}
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
          <Form.Item name="roadmapPhase" label="Roadmap Phase">
            <Select options={roadmapPhaseOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function SpecializationsTab({
  careerGoal,
  open,
}: {
  careerGoal: CareerGoal | null;
  open: boolean;
}) {
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Specialization | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<Specialization | null>(null);
  const [form] = Form.useForm<SpecializationFormValues>();
  const endpoint = careerGoal
    ? `/admin/career-goals/${careerGoal.id}/specializations`
    : '';
  const selectedCareerGoalId =
    selectedSpecialization?.careerGoalId ?? careerGoal?.id ?? '';

  const specializations = useQuery({
    queryKey: ['specializations', careerGoal?.id],
    queryFn: () => adminCatalogService.listSpecializations(endpoint),
    enabled: open && Boolean(careerGoal?.id),
  });
  const careerLevelRequiredSkills = useQuery({
    queryKey: ['career-required-skills', 'career-goal', selectedCareerGoalId],
    queryFn: () =>
      adminCatalogService.listRequiredSkills(
        `/career-goals/${selectedCareerGoalId}/required-skills`,
        200,
      ),
    enabled: Boolean(selectedSpecialization?.id && selectedCareerGoalId),
  });
  const careerLevelSkillIds = new Set(
    (careerLevelRequiredSkills.data?.data ?? []).map(
      (requiredSkill) => requiredSkill.skillId,
    ),
  );

  const save = useMutation({
    mutationFn: (values: SpecializationFormValues) => {
      if (!careerGoal) {
        throw new Error('Career goal is required');
      }

      const payload: SpecializationPayload = {
        name: values.name,
        description: values.description,
        status: values.isActive ? 'ACTIVE' : 'INACTIVE',
      };

      return adminCatalogService.saveSpecialization(
        editing ? payload : { ...payload, careerGoalId: careerGoal.id },
        editing?.id,
      );
    },
    onSuccess: (result) => {
      message.success('Saved');
      notifyCatalogInvalidation(notification, result);
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      queryClient.invalidateQueries({
        queryKey: ['specializations', careerGoal?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      invalidateCatalogImpactQueries(queryClient);
    },
    onError: (error) => {
      message.error(getApiErrorMessage(error));
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => adminCatalogService.deactivateSpecialization(id),
    onSuccess: (result) => {
      message.success('Deactivated');
      notifyCatalogInvalidation(notification, result);
      queryClient.invalidateQueries({
        queryKey: ['specializations', careerGoal?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      invalidateCatalogImpactQueries(queryClient);
    },
    onError: (error) => {
      message.error(getApiErrorMessage(error));
    },
  });

  const openSpecializationForm = (record?: Specialization) => {
    setEditing(record ?? null);
    form.resetFields();
    form.setFieldsValue(
      record
        ? {
            name: record.name,
            description: record.description,
            isActive: record.status === 'ACTIVE',
          }
        : { isActive: true },
    );
    setModalOpen(true);
  };

  return (
    <>
      <QueryState
        loading={specializations.isLoading}
        error={specializations.error}
      >
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openSpecializationForm()}
          >
            Create Specialization
          </Button>
          <Button onClick={() => specializations.refetch()}>Refresh</Button>
        </Space>
        <Table<Specialization>
          rowKey="id"
          dataSource={specializations.data?.data ?? []}
          pagination={false}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Description', dataIndex: 'description', ellipsis: true },
            {
              title: 'Active',
              render: (_: unknown, row) => <StatusTag status={row.status} />,
            },
            {
              title: 'Required Skills',
              render: (_: unknown, row) => row._count?.requiredSkills ?? 0,
            },
            {
              title: 'Updated',
              render: (_: unknown, row) =>
                formatDate(row.updatedAt ?? row.createdAt),
            },
            {
              title: 'Actions',
              render: (_: unknown, row) => (
                <Space wrap>
                  <Button onClick={() => openSpecializationForm(row)}>
                    Edit
                  </Button>
                  <Button
                    disabled={row.status === 'INACTIVE'}
                    onClick={() => setSelectedSpecialization(row)}
                  >
                    Manage Required Skills
                  </Button>
                  <Button
                    danger
                    disabled={row.status === 'INACTIVE'}
                    onClick={() => deactivate.mutate(row.id)}
                  >
                    Deactivate
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </QueryState>
      <Modal
        title={editing ? 'Edit Specialization' : 'Create Specialization'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
      >
        <Form<SpecializationFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        title={
          selectedSpecialization
            ? `Required Skills: ${selectedSpecialization.name}`
            : undefined
        }
        open={Boolean(selectedSpecialization)}
        onClose={() => setSelectedSpecialization(null)}
        width={980}
      >
        <RequiredSkillsManager
          enabled={Boolean(selectedSpecialization?.id)}
          endpoint={
            selectedSpecialization
              ? `/admin/specializations/${selectedSpecialization.id}/required-skills`
              : ''
          }
          queryKey={[
            'specialization-required-skills',
            selectedSpecialization?.id,
          ]}
          invalidateKeys={[
            ['specialization-required-skills', selectedSpecialization?.id],
            ['specializations', careerGoal?.id],
          ]}
          defaultRoadmapPhase="SPECIALIZATION"
          scope="specialization"
          careerGoal={careerGoal}
          specialization={selectedSpecialization}
          careerLevelSkillIds={careerLevelSkillIds}
          careerLevelLoading={careerLevelRequiredSkills.isLoading}
        />
      </Drawer>
    </>
  );
}

function SkillTypeTag({ type }: { type?: SkillType }) {
  return <Tag color={type === 'COMMON' ? 'blue' : 'green'}>{type ?? '-'}</Tag>;
}

function StatusTag({ status }: { status?: CatalogStatus | null }) {
  return <StatusBadge status={status} />;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function toCatalogFormValues(record: CatalogRecord): CatalogFormValues {
  return {
    name: record.name,
    description: record.description,
    status: record.status,
    categoryId: 'categoryId' in record ? record.categoryId : undefined,
    type: 'type' in record ? record.type : undefined,
    defaultRequiredLevel:
      'defaultRequiredLevel' in record ? (record.defaultRequiredLevel ?? undefined) : undefined,
    defaultWeight:
      'defaultWeight' in record && record.defaultWeight !== null && record.defaultWeight !== undefined
        ? Number(record.defaultWeight)
        : undefined,
    roadmapPhase: 'roadmapPhase' in record ? record.roadmapPhase : undefined,
  };
}

function buildCatalogPayload(kind: CatalogKind, values: CatalogFormValues): CatalogPayload {
  if (kind !== 'skills') {
    return values;
  }

  const payload: CatalogFormValues = { ...values };
  if (payload.type !== 'COMMON') {
    delete payload.defaultRequiredLevel;
    delete payload.defaultWeight;
  }

  return payload;
}

interface NotificationApi {
  info: (config: { message: string; description?: string; duration?: number }) => void;
}

interface CatalogInvalidationMetadata {
  analysesInvalidated?: number;
  analysisInvalidated?: number;
  recommendationsObsolete?: number;
  roadmapsArchived?: number;
  assessmentsCancelled?: number;
}

function notifyCatalogInvalidation(notification: NotificationApi, result: unknown) {
  const summary = getCatalogInvalidationSummary(result);

  notification.info({
    message: 'Catalog impact',
    description:
      summary.length > 0
        ? summary.join(' · ')
        : 'Thay đổi này có thể làm mới analysis/recommendation/roadmap liên quan.',
    duration: 6,
  });
}

function getCatalogInvalidationSummary(result: unknown) {
  const metadata = getCatalogInvalidationMetadata(result);
  if (!metadata) {
    return [];
  }

  return [
    getCountLine(metadata.analysesInvalidated ?? metadata.analysisInvalidated, 'analyses invalidated'),
    getCountLine(metadata.recommendationsObsolete, 'recommendations obsolete'),
    getCountLine(metadata.roadmapsArchived, 'roadmaps archived'),
    getCountLine(metadata.assessmentsCancelled, 'assessments cancelled'),
  ].filter((line): line is string => Boolean(line));
}

function getCatalogInvalidationMetadata(result: unknown): CatalogInvalidationMetadata | null {
  if (!isObject(result)) {
    return null;
  }

  const candidates = [
    result.invalidation,
    result.invalidationSummary,
    result.affected,
    result.metadata,
    result,
  ];
  const match = candidates.find(
    (candidate) =>
      isObject(candidate) &&
      ('analysesInvalidated' in candidate ||
        'analysisInvalidated' in candidate ||
        'recommendationsObsolete' in candidate ||
        'roadmapsArchived' in candidate ||
        'assessmentsCancelled' in candidate),
  );

  return match ? (match as CatalogInvalidationMetadata) : null;
}

function getCountLine(value: unknown, label: string) {
  return typeof value === 'number' ? `${value} ${label}` : null;
}

function invalidateCatalogImpactQueries(queryClient: QueryClient) {
  invalidateStudentCurrentContextQueries(queryClient);
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['recommendations'] });
  queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
  queryClient.invalidateQueries({ queryKey: ['analysis'] });
  queryClient.invalidateQueries({ queryKey: ['assessment'] });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
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
