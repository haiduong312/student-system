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
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { RecordDetailLink } from '@/components/ui/RecordDetailLink';
import { SearchBar } from '@/components/ui/SearchBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getApiErrorMessage } from '@/lib/errors';
import type {
  DifficultyLevel,
  LearningResource,
  RecommendationTemplate,
  RecommendationTemplateResourceLink,
  RecommendationType,
  RoadmapPhase,
  SkillLevel,
  TemplateStatus,
} from '@/types/domain';
import {
  recommendationTemplateService,
  type LinkRecommendationTemplateResourcePayload,
  type RecommendationTemplateFilters,
  type RecommendationTemplatePayload,
} from './recommendation-template.service';

const DEFAULT_TABLE_PAGE_SIZE = 10;

const levelOptions: Array<{ value: SkillLevel; label: string }> = [
  { value: 'ZERO', label: 'ZERO' },
  { value: 'BASIC', label: 'BASIC' },
  { value: 'INTERMEDIATE', label: 'INTERMEDIATE' },
  { value: 'GOOD', label: 'GOOD' },
];

const recommendationTypeOptions: Array<{
  value: RecommendationType;
  label: string;
}> = [
  { value: 'COURSE', label: 'COURSE' },
  { value: 'PROJECT', label: 'PROJECT' },
  { value: 'CERTIFICATE', label: 'CERTIFICATE' },
  { value: 'PRACTICE', label: 'PRACTICE' },
  { value: 'DOCUMENT', label: 'DOCUMENT' },
  { value: 'PORTFOLIO_TASK', label: 'PORTFOLIO_TASK' },
];

const difficultyOptions: Array<{ value: DifficultyLevel; label: string }> = [
  { value: 'BEGINNER', label: 'BEGINNER' },
  { value: 'INTERMEDIATE', label: 'INTERMEDIATE' },
  { value: 'ADVANCED', label: 'ADVANCED' },
];

const roadmapPhaseOptions: Array<{ value: RoadmapPhase; label: string }> = [
  { value: 'CORE_FOUNDATION', label: 'Core Foundation' },
  { value: 'CAREER_TRACK', label: 'Career Track' },
  { value: 'SPECIALIZATION', label: 'Specialization' },
  { value: 'PRACTICE_PROJECT', label: 'Practice Project' },
  { value: 'PORTFOLIO_PREPARATION', label: 'Portfolio Preparation' },
];

const statusOptions: Array<{ value: TemplateStatus; label: string }> = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
];

type TemplateFormValues = RecommendationTemplatePayload;
type ResourceLinkFormValues = LinkRecommendationTemplateResourcePayload;

export function RecommendationTemplateManagementPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RecommendationTemplateFilters>({
    status: 'ACTIVE',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [editing, setEditing] = useState<RecommendationTemplate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null);
  const [form] = Form.useForm<TemplateFormValues>();
  const formCareerGoalId = Form.useWatch('careerGoalId', form);

  const templates = useQuery({
    queryKey: ['admin', 'recommendation-templates', search, filters, page, pageSize],
    queryFn: () =>
      recommendationTemplateService.listTemplates({
        ...filters,
        search,
        page,
        limit: pageSize,
      }),
  });
  const skills = useQuery({
    queryKey: ['admin', 'recommendation-templates', 'skills', 'options'],
    queryFn: () => recommendationTemplateService.listSkills(),
  });
  const skillCategories = useQuery({
    queryKey: ['admin', 'recommendation-templates', 'skill-categories', 'options'],
    queryFn: () => recommendationTemplateService.listSkillCategories(),
  });
  const careerGoals = useQuery({
    queryKey: ['admin', 'recommendation-templates', 'career-goals', 'options'],
    queryFn: () => recommendationTemplateService.listCareerGoals(),
  });
  const specializations = useQuery({
    queryKey: ['admin', 'recommendation-templates', 'specializations', 'options'],
    queryFn: () => recommendationTemplateService.listSpecializations(),
  });

  const save = useMutation({
    mutationFn: (values: TemplateFormValues) =>
      recommendationTemplateService.saveTemplate(
        toTemplatePayload(values),
        editing?.id,
      ),
    onSuccess: () => {
      message.success('Saved');
      setFormOpen(false);
      setEditing(null);
      form.resetFields();
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'recommendation-templates'],
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) =>
      recommendationTemplateService.deactivateTemplate(id),
    onSuccess: () => {
      message.success('Deactivated');
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'recommendation-templates'],
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const skillOptions = (skills.data?.data ?? []).map((skill) => ({
    label: `${skill.name} (${skill.type})`,
    value: skill.id,
  }));
  const categoryOptions = (skillCategories.data?.data ?? []).map((category) => ({
    label: category.name,
    value: category.id,
  }));
  const careerGoalOptions = (careerGoals.data?.data ?? []).map((goal) => ({
    label: goal.name,
    value: goal.id,
  }));
  const allSpecializationOptions = (specializations.data?.data ?? []).map(
    (specialization) => ({
      label: `${specialization.name} (${specialization.careerGoal?.name ?? 'Career goal'})`,
      value: specialization.id,
      careerGoalId: specialization.careerGoalId,
    }),
  );
  const formSpecializationOptions = allSpecializationOptions.filter(
    (specialization) =>
      !formCareerGoalId || specialization.careerGoalId === formCareerGoalId,
  );
  const filterSpecializationOptions = allSpecializationOptions.filter(
    (specialization) =>
      !filters.careerGoalId ||
      specialization.careerGoalId === filters.careerGoalId,
  );

  const updateFilters = (nextFilters: Partial<RecommendationTemplateFilters>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...nextFilters }));
  };

  const openForm = (record?: RecommendationTemplate) => {
    setEditing(record ?? null);
    form.resetFields();
    form.setFieldsValue(
      record
        ? toTemplateFormValues(record)
        : {
            recommendationType: 'PRACTICE',
            priority: 0,
            status: 'ACTIVE',
          },
    );
    setFormOpen(true);
  };

  const closeForm = () => {
    if (save.isPending) return;
    setFormOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const resetFilters = () => {
    setSearch('');
    setFilters({ status: 'ACTIVE' });
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Recommendation Templates"
        description="Manage reusable recommendation content and learning resources."
      />
      <SearchBar
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onRefresh={() => templates.refetch()}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
            Add template
          </Button>
        }
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          aria-label="Skill filter"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Skill"
          style={{ width: 220 }}
          value={filters.skillId}
          loading={skills.isLoading}
          options={skillOptions}
          onChange={(skillId) => updateFilters({ skillId })}
        />
        <Select
          aria-label="Skill category filter"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Category"
          style={{ width: 190 }}
          value={filters.skillCategoryId}
          loading={skillCategories.isLoading}
          options={categoryOptions}
          onChange={(skillCategoryId) => updateFilters({ skillCategoryId })}
        />
        <Select
          aria-label="Career goal filter"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Career Goal"
          style={{ width: 220 }}
          value={filters.careerGoalId}
          loading={careerGoals.isLoading}
          options={careerGoalOptions}
          onChange={(careerGoalId) =>
            updateFilters({ careerGoalId, specializationId: undefined })
          }
        />
        <Select
          aria-label="Specialization filter"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Specialization"
          style={{ width: 220 }}
          value={filters.specializationId}
          loading={specializations.isLoading}
          options={filterSpecializationOptions}
          onChange={(specializationId) => updateFilters({ specializationId })}
        />
        <Select
          aria-label="Level filter"
          allowClear
          placeholder="Level"
          style={{ width: 160 }}
          value={filters.level}
          options={levelOptions}
          onChange={(level) => updateFilters({ level })}
        />
        <Select
          aria-label="Recommendation type filter"
          allowClear
          placeholder="Type"
          style={{ width: 170 }}
          value={filters.recommendationType}
          options={recommendationTypeOptions}
          onChange={(recommendationType) => updateFilters({ recommendationType })}
        />
        <Select
          aria-label="Roadmap phase filter"
          allowClear
          placeholder="Phase"
          style={{ width: 190 }}
          value={filters.roadmapPhase}
          options={roadmapPhaseOptions}
          onChange={(roadmapPhase) => updateFilters({ roadmapPhase })}
        />
        <Select
          aria-label="Status filter"
          allowClear
          placeholder="Status"
          style={{ width: 130 }}
          value={filters.status}
          options={statusOptions}
          onChange={(status) => updateFilters({ status })}
        />
        <Button onClick={resetFilters}>Reset</Button>
      </Space>

      <QueryState loading={templates.isLoading && !templates.data} error={templates.error}>
        <Table<RecommendationTemplate>
          rowKey="id"
          dataSource={templates.data?.data ?? []}
          loading={templates.isFetching}
          pagination={{
            current: page,
            pageSize,
            total: templates.data?.meta.total ?? 0,
            showSizeChanger: true,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_TABLE_PAGE_SIZE);
          }}
          columns={[
            {
              title: 'Title',
              dataIndex: 'title',
              ellipsis: true,
              render: (title: string, record) => (
                <RecordDetailLink
                  ariaLabel={`View recommendation template ${title}`}
                  onClick={() => setDetailTemplateId(record.id)}
                >
                  {title}
                </RecordDetailLink>
              ),
            },
            {
              title: 'Scope',
              render: (_: unknown, record) => <ScopeTags template={record} />,
            },
            {
              title: 'Level',
              render: (_: unknown, record) => <Tag>{record.level ?? 'ANY'}</Tag>,
            },
            {
              title: 'Type',
              dataIndex: 'recommendationType',
              render: (value: RecommendationType) => <Tag color="blue">{value}</Tag>,
            },
            {
              title: 'Phase',
              render: (_: unknown, record) => (
                <Tag>{record.roadmapPhase ?? '-'}</Tag>
              ),
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              sorter: true,
            },
            {
              title: 'Resources',
              render: (_: unknown, record) => record.resourceLinks?.length ?? 0,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (status: TemplateStatus) => <StatusBadge status={status} />,
            },
            {
              title: 'Updated',
              render: (_: unknown, record) => formatDate(record.updatedAt),
            },
            {
              title: 'Actions',
              render: (_: unknown, record) => (
                <Space wrap>
                  <Button icon={<EditOutlined />} onClick={() => openForm(record)}>
                    Edit
                  </Button>
                  <Button
                    icon={<LinkOutlined />}
                    onClick={() => setDetailTemplateId(record.id)}
                  >
                    Resources
                  </Button>
                  <Popconfirm
                    title="Deactivate template?"
                    okText="Deactivate"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => deactivate.mutate(record.id)}
                    disabled={record.status === 'INACTIVE'}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={record.status === 'INACTIVE'}
                    >
                      Deactivate
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </QueryState>

      <Modal
        title={editing ? 'Edit Recommendation Template' : 'Add Recommendation Template'}
        open={formOpen}
        onCancel={closeForm}
        onOk={() => form.submit()}
        okText="Save"
        confirmLoading={save.isPending}
        width={820}
      >
        <Form<TemplateFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, whitespace: true, max: 200 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item
              name="recommendationType"
              label="Type"
              rules={[{ required: true }]}
              style={{ width: '35%' }}
            >
              <Select options={recommendationTypeOptions} />
            </Form.Item>
            <Form.Item name="difficultyLevel" label="Difficulty" style={{ width: '30%' }}>
              <Select allowClear options={difficultyOptions} />
            </Form.Item>
            <Form.Item name="status" label="Status" style={{ width: '35%' }}>
              <Select options={statusOptions} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item name="priority" label="Priority" style={{ width: '30%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="level" label="Level" style={{ width: '35%' }}>
              <Select allowClear options={levelOptions} />
            </Form.Item>
            <Form.Item name="roadmapPhase" label="Roadmap Phase" style={{ width: '35%' }}>
              <Select allowClear options={roadmapPhaseOptions} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item name="estimatedDuration" label="Estimated Duration" style={{ width: '40%' }}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="resourceUrl" label="Resource URL" style={{ width: '60%' }}>
              <Input maxLength={500} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="skillId" label="Skill">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={skills.isLoading}
              options={skillOptions}
            />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="skillCategoryId" label="Skill Category" style={{ width: '50%' }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                loading={skillCategories.isLoading}
                options={categoryOptions}
              />
            </Form.Item>
            <Form.Item name="careerGoalId" label="Career Goal" style={{ width: '50%' }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                loading={careerGoals.isLoading}
                options={careerGoalOptions}
                onChange={() => form.setFieldValue('specializationId', undefined)}
              />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="specializationId" label="Specialization">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={specializations.isLoading}
              options={formSpecializationOptions}
            />
          </Form.Item>
        </Form>
      </Modal>

      <TemplateDetailDrawer
        templateId={detailTemplateId}
        open={Boolean(detailTemplateId)}
        onClose={() => setDetailTemplateId(null)}
      />
    </>
  );
}

function TemplateDetailDrawer({
  templateId,
  open,
  onClose,
}: {
  templateId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const template = useQuery({
    queryKey: ['admin', 'recommendation-templates', 'detail', templateId],
    queryFn: () => recommendationTemplateService.getTemplate(templateId ?? ''),
    enabled: open && Boolean(templateId),
  });

  const record = template.data;

  return (
    <Drawer
      title={record?.title ?? 'Recommendation Template'}
      open={open}
      onClose={onClose}
      width={1040}
    >
      <QueryState loading={template.isLoading} error={template.error}>
        {record ? (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Title" span={2}>
                {record.title}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusBadge status={record.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Priority">{record.priority}</Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color="blue">{record.recommendationType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Level">
                <Tag>{record.level ?? 'ANY'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Skill">
                {record.skill?.name ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Skill Category">
                {record.skillCategory?.name ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Career Goal">
                {record.careerGoal?.name ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Specialization">
                {record.specialization?.name ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phase">
                {record.roadmapPhase ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Difficulty">
                {record.difficultyLevel ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {record.estimatedDuration ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="URL">
                {record.resourceUrl ? (
                  <Typography.Link href={record.resourceUrl} target="_blank">
                    {record.resourceUrl}
                  </Typography.Link>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {record.description || '-'}
              </Descriptions.Item>
            </Descriptions>
            <TemplateResourceLinksManager template={record} />
          </>
        ) : null}
      </QueryState>
    </Drawer>
  );
}

function TemplateResourceLinksManager({
  template,
}: {
  template: RecommendationTemplate;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<ResourceLinkFormValues>();
  const links = template.resourceLinks ?? [];
  const linkedResourceIds = new Set(links.map((link) => link.resourceId));

  const resources = useQuery({
    queryKey: ['admin', 'recommendation-templates', 'learning-resources', 'options'],
    queryFn: () =>
      recommendationTemplateService.listLearningResources({
        status: 'ACTIVE',
        limit: 100,
      }),
  });

  const linkResource = useMutation({
    mutationFn: (values: ResourceLinkFormValues) =>
      recommendationTemplateService.linkResource(template.id, {
        resourceId: values.resourceId,
        orderIndex: values.orderIndex ?? 0,
        priority: values.priority ?? 0,
      }),
    onSuccess: () => {
      message.success('Resource linked');
      setModalOpen(false);
      form.resetFields();
      invalidateTemplateQueries(queryClient, template.id);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const unlinkResource = useMutation({
    mutationFn: (resourceId: string) =>
      recommendationTemplateService.unlinkResource(template.id, resourceId),
    onSuccess: () => {
      message.success('Resource unlinked');
      invalidateTemplateQueries(queryClient, template.id);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const resourceOptions = (resources.data?.data ?? [])
    .filter((resource) => !linkedResourceIds.has(resource.id))
    .map((resource) => ({
      label: `${resource.title}${resource.provider ? ` (${resource.provider})` : ''}`,
      value: resource.id,
    }));

  const openLinkModal = () => {
    form.resetFields();
    form.setFieldsValue({
      orderIndex: links.length + 1,
      priority: 0,
    });
    setModalOpen(true);
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Learning Resources
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openLinkModal}>
          Link resource
        </Button>
      </Space>
      <Table<RecommendationTemplateResourceLink>
        rowKey="id"
        dataSource={links}
        pagination={false}
        columns={[
          {
            title: 'Resource',
            render: (_: unknown, row) =>
              row.resource ? (
                <ResourceTitle resource={row.resource} />
              ) : (
                row.resourceId
              ),
          },
          {
            title: 'Type',
            render: (_: unknown, row) => <Tag>{row.resource?.resourceType ?? '-'}</Tag>,
          },
          {
            title: 'Difficulty',
            render: (_: unknown, row) => row.resource?.difficultyLevel ?? '-',
          },
          {
            title: 'Provider',
            render: (_: unknown, row) => row.resource?.provider ?? '-',
          },
          { title: 'Order', dataIndex: 'orderIndex' },
          { title: 'Priority', dataIndex: 'priority' },
          {
            title: 'Actions',
            render: (_: unknown, row) => (
              <Popconfirm
                title="Unlink resource?"
                okText="Unlink"
                okButtonProps={{ danger: true }}
                onConfirm={() => unlinkResource.mutate(row.resourceId)}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Unlink
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
      <Modal
        title="Link Learning Resource"
        open={modalOpen}
        onCancel={() => {
          if (linkResource.isPending) return;
          setModalOpen(false);
        }}
        onOk={() => form.submit()}
        okText="Link"
        confirmLoading={linkResource.isPending}
      >
        <Form<ResourceLinkFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => linkResource.mutate(values)}
        >
          <Form.Item name="resourceId" label="Resource" rules={[{ required: true }]}>
            <Select
              loading={resources.isLoading}
              showSearch
              optionFilterProp="label"
              options={resourceOptions}
            />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="orderIndex" label="Order" style={{ width: '50%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="priority" label="Priority" style={{ width: '50%' }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </>
  );
}

function ResourceTitle({ resource }: { resource: LearningResource }) {
  const title = resource.url ? (
    <Typography.Link href={resource.url} target="_blank">
      {resource.title}
    </Typography.Link>
  ) : (
    resource.title
  );

  return (
    <Space direction="vertical" size={0}>
      {title}
      {resource.estimatedDuration ? (
        <Typography.Text type="secondary">{resource.estimatedDuration}</Typography.Text>
      ) : null}
    </Space>
  );
}

function ScopeTags({ template }: { template: RecommendationTemplate }) {
  const tags = [
    template.specialization?.name
      ? { label: template.specialization.name, color: 'purple' }
      : null,
    template.careerGoal?.name ? { label: template.careerGoal.name, color: 'green' } : null,
    template.skillCategory?.name
      ? { label: template.skillCategory.name, color: 'gold' }
      : null,
    template.skill?.name ? { label: template.skill.name, color: 'blue' } : null,
  ].filter((tag): tag is { label: string; color: string } => Boolean(tag));

  if (!tags.length) {
    return <Tag>Global</Tag>;
  }

  return (
    <Space wrap size={[0, 4]}>
      {tags.map((tag) => (
        <Tag key={`${tag.color}-${tag.label}`} color={tag.color}>
          {tag.label}
        </Tag>
      ))}
    </Space>
  );
}

function toTemplateFormValues(
  template: RecommendationTemplate,
): TemplateFormValues {
  return {
    skillId: template.skillId,
    skillCategoryId: template.skillCategoryId,
    careerGoalId: template.careerGoalId,
    specializationId: template.specializationId,
    level: template.level,
    recommendationType: template.recommendationType,
    title: template.title,
    description: template.description,
    difficultyLevel: template.difficultyLevel,
    estimatedDuration: template.estimatedDuration,
    resourceUrl: template.resourceUrl,
    priority: template.priority,
    roadmapPhase: template.roadmapPhase,
    status: template.status,
  };
}

function toTemplatePayload(values: TemplateFormValues): RecommendationTemplatePayload {
  return {
    skillId: values.skillId ?? null,
    skillCategoryId: values.skillCategoryId ?? null,
    careerGoalId: values.careerGoalId ?? null,
    specializationId: values.specializationId ?? null,
    level: values.level ?? null,
    recommendationType: values.recommendationType,
    title: values.title.trim(),
    description: normalizeOptionalText(values.description),
    difficultyLevel: values.difficultyLevel ?? null,
    estimatedDuration: normalizeOptionalText(values.estimatedDuration),
    resourceUrl: normalizeOptionalText(values.resourceUrl),
    priority: values.priority ?? 0,
    roadmapPhase: values.roadmapPhase ?? null,
    status: values.status ?? 'ACTIVE',
  };
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function invalidateTemplateQueries(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({
    queryKey: ['admin', 'recommendation-templates'],
  });
  void queryClient.invalidateQueries({
    queryKey: ['admin', 'recommendation-templates', 'detail', id],
  });
}
