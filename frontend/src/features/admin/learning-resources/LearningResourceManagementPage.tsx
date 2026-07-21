'use client';

import {
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Col,
  Descriptions,
  Drawer,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { RecordDetailLink } from '@/components/ui/RecordDetailLink';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getApiErrorMessage } from '@/lib/errors';
import type {
  CatalogStatus,
  DifficultyLevel,
  LearningResource,
  LearningResourceSkillLink,
  LearningResourceType,
  RoadmapPhase,
  SkillLevel,
} from '@/types/domain';
import {
  learningResourceService,
  type LearningResourceFilters,
  type LearningResourcePayload,
  type LinkResourceSkillPayload,
} from './learning-resource.service';

const DEFAULT_TABLE_PAGE_SIZE = 10;

const resourceTypeOptions: Array<{
  value: LearningResourceType;
  label: string;
}> = [
  { value: 'COURSE', label: 'COURSE' },
  { value: 'VIDEO', label: 'VIDEO' },
  { value: 'DOCUMENT', label: 'DOCUMENT' },
  { value: 'ARTICLE', label: 'ARTICLE' },
  { value: 'BOOK', label: 'BOOK' },
  { value: 'PRACTICE', label: 'PRACTICE' },
  { value: 'PROJECT', label: 'PROJECT' },
  { value: 'CERTIFICATE', label: 'CERTIFICATE' },
  { value: 'TOOL', label: 'TOOL' },
];

const difficultyOptions: Array<{ value: DifficultyLevel; label: string }> = [
  { value: 'BEGINNER', label: 'BEGINNER' },
  { value: 'INTERMEDIATE', label: 'INTERMEDIATE' },
  { value: 'ADVANCED', label: 'ADVANCED' },
];

const levelOptions: Array<{ value: SkillLevel; label: string }> = [
  { value: 'ZERO', label: 'ZERO' },
  { value: 'BASIC', label: 'BASIC' },
  { value: 'INTERMEDIATE', label: 'INTERMEDIATE' },
  { value: 'GOOD', label: 'GOOD' },
];

const roadmapPhaseOptions: Array<{ value: RoadmapPhase; label: string }> = [
  { value: 'CORE_FOUNDATION', label: 'Core Foundation' },
  { value: 'CAREER_TRACK', label: 'Career Track' },
  { value: 'SPECIALIZATION', label: 'Specialization' },
  { value: 'PRACTICE_PROJECT', label: 'Practice Project' },
  { value: 'PORTFOLIO_PREPARATION', label: 'Portfolio Preparation' },
];

const statusOptions: Array<{ value: CatalogStatus; label: string }> = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
];

type ResourceFormValues = LearningResourcePayload;
type SkillLinkFormValues = LinkResourceSkillPayload;

export function LearningResourceManagementPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<LearningResourceFilters>({
    status: 'ACTIVE',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [editing, setEditing] = useState<LearningResource | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailResourceId, setDetailResourceId] = useState<string | null>(null);
  const [form] = Form.useForm<ResourceFormValues>();

  const resources = useQuery({
    queryKey: ['admin', 'learning-resources', 'list', search, filters, page, pageSize],
    queryFn: () =>
      learningResourceService.list({
        ...filters,
        search,
        page,
        limit: pageSize,
      }),
  });
  const skills = useQuery({
    queryKey: ['admin', 'learning-resources', 'skills', 'options'],
    queryFn: () => learningResourceService.listSkills(),
  });

  const save = useMutation({
    mutationFn: (values: ResourceFormValues) =>
      learningResourceService.save(toResourcePayload(values), editing?.id),
    onSuccess: () => {
      message.success('Saved');
      setFormOpen(false);
      setEditing(null);
      form.resetFields();
      invalidateResourceQueries(queryClient);
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'recommendation-templates', 'learning-resources'],
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => learningResourceService.deactivate(id),
    onSuccess: () => {
      message.success('Deactivated');
      invalidateResourceQueries(queryClient);
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'recommendation-templates', 'learning-resources'],
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const skillOptions = (skills.data?.data ?? []).map((skill) => ({
    label: `${skill.name}${skill.category?.name ? ` (${skill.category.name})` : ''}`,
    value: skill.id,
  }));

  const updateFilters = (nextFilters: Partial<LearningResourceFilters>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...nextFilters }));
  };

  const openForm = (resource?: LearningResource) => {
    setEditing(resource ?? null);
    form.resetFields();
    form.setFieldsValue(
      resource
        ? toResourceFormValues(resource)
        : {
            resourceType: 'COURSE',
            isFree: true,
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

  return (
    <>
      <PageHeader
        title="Learning Resources"
        description="Catalog used by recommendations and development roadmaps."
      />
      <Space
        direction={isMobile ? 'vertical' : 'horizontal'}
        align={isMobile ? undefined : 'center'}
        style={{
          justifyContent: 'space-between',
          marginBottom: 16,
          width: '100%',
        }}
      >
        <Input.Search
          allowClear
          aria-label="Search learning resources"
          placeholder="Search"
          enterButton={<SearchOutlined />}
          style={{ width: isMobile ? '100%' : 280 }}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
            Add resource
          </Button>
          <Tooltip title="Refresh">
            <Button
              aria-label="Refresh learning resources"
              icon={<ReloadOutlined />}
              onClick={() => resources.refetch()}
            />
          </Tooltip>
        </Space>
      </Space>
      <Space wrap style={{ marginBottom: 16, width: '100%' }}>
        <Select
          aria-label="Resource type filter"
          allowClear
          placeholder="Type"
          style={{ width: isMobile ? '100%' : 170 }}
          value={filters.resourceType}
          options={resourceTypeOptions}
          onChange={(resourceType) => updateFilters({ resourceType })}
        />
        <Select
          aria-label="Difficulty filter"
          allowClear
          placeholder="Difficulty"
          style={{ width: isMobile ? '100%' : 170 }}
          value={filters.difficultyLevel}
          options={difficultyOptions}
          onChange={(difficultyLevel) => updateFilters({ difficultyLevel })}
        />
        <Select
          aria-label="Skill filter"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Skill"
          style={{ width: isMobile ? '100%' : 240 }}
          value={filters.skillId}
          loading={skills.isLoading}
          options={skillOptions}
          onChange={(skillId) => updateFilters({ skillId })}
        />
        <Select
          aria-label="Status filter"
          allowClear
          placeholder="Status"
          style={{ width: isMobile ? '100%' : 140 }}
          value={filters.status}
          options={statusOptions}
          onChange={(status) => updateFilters({ status })}
        />
        <Button
          onClick={() => {
            setFilters({ status: 'ACTIVE' });
            setPage(1);
          }}
        >
          Reset filters
        </Button>
      </Space>

      <QueryState loading={resources.isLoading && !resources.data} error={resources.error}>
        <Table<LearningResource>
          rowKey="id"
          dataSource={resources.data?.data ?? []}
          loading={resources.isFetching}
          scroll={{ x: isMobile ? 320 : 1180 }}
          pagination={{
            current: page,
            pageSize,
            total: resources.data?.meta.total ?? 0,
            showSizeChanger: true,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_TABLE_PAGE_SIZE);
          }}
          columns={
            isMobile
              ? [
                  {
                    title: 'Resource',
                    width: 190,
                    render: (_: unknown, record: LearningResource) => (
                      <Space direction="vertical" size={4}>
                        <RecordDetailLink
                          ariaLabel={`View learning resource ${record.title}`}
                          onClick={() => setDetailResourceId(record.id)}
                        >
                          {record.title}
                        </RecordDetailLink>
                        <Space wrap size={[0, 4]}>
                          <Tag color="blue">{record.resourceType}</Tag>
                          <StatusBadge status={record.status} />
                        </Space>
                        {record.provider ? (
                          <Typography.Text type="secondary">
                            {record.provider}
                          </Typography.Text>
                        ) : null}
                      </Space>
                    ),
                  },
                  {
                    title: 'Actions',
                    fixed: 'right' as const,
                    width: 130,
                    render: (_: unknown, record: LearningResource) => (
                      <Space size={4}>
                        <Tooltip title="Edit">
                          <Button
                            aria-label={`Edit ${record.title}`}
                            icon={<EditOutlined />}
                            onClick={() => openForm(record)}
                          />
                        </Tooltip>
                        <Tooltip title="Manage skills">
                          <Button
                            aria-label={`Manage skills for ${record.title}`}
                            icon={<LinkOutlined />}
                            onClick={() => setDetailResourceId(record.id)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Deactivate resource?"
                          description="It will no longer be available for new recommendations."
                          okText="Deactivate"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => deactivate.mutate(record.id)}
                          disabled={record.status === 'INACTIVE'}
                        >
                          <Tooltip title="Deactivate">
                            <Button
                              aria-label={`Deactivate ${record.title}`}
                              danger
                              icon={<DeleteOutlined />}
                              disabled={record.status === 'INACTIVE'}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]
              : [
                  {
                    title: 'Title',
                    dataIndex: 'title',
                    width: 250,
                    ellipsis: true,
                    render: (title: string, record: LearningResource) => (
                      <RecordDetailLink
                        ariaLabel={`View learning resource ${title}`}
                        onClick={() => setDetailResourceId(record.id)}
                      >
                        {title}
                      </RecordDetailLink>
                    ),
                  },
                  {
                    title: 'Type',
                    dataIndex: 'resourceType',
                    width: 120,
                    render: (value: LearningResourceType) => (
                      <Tag color="blue">{value}</Tag>
                    ),
                  },
                  {
                    title: 'Provider',
                    dataIndex: 'provider',
                    width: 160,
                    ellipsis: true,
                    render: (value?: string | null) => value || '-',
                  },
                  {
                    title: 'Difficulty',
                    dataIndex: 'difficultyLevel',
                    width: 130,
                    render: (value?: DifficultyLevel | null) => value ?? '-',
                  },
                  {
                    title: 'Access',
                    dataIndex: 'isFree',
                    width: 90,
                    render: (isFree: boolean) => (
                      <Tag color={isFree ? 'green' : 'gold'}>
                        {isFree ? 'FREE' : 'PAID'}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Skills',
                    width: 80,
                    render: (_: unknown, record: LearningResource) =>
                      record.skills?.length ?? 0,
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    width: 110,
                    render: (status: CatalogStatus) => (
                      <StatusBadge status={status} />
                    ),
                  },
                  {
                    title: 'Updated',
                    width: 170,
                    render: (_: unknown, record: LearningResource) =>
                      formatDate(record.updatedAt),
                  },
                  {
                    title: 'Actions',
                    fixed: 'right' as const,
                    width: 310,
                    render: (_: unknown, record: LearningResource) => (
                      <Space>
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => openForm(record)}
                        >
                          Edit
                        </Button>
                        <Button
                          icon={<LinkOutlined />}
                          onClick={() => setDetailResourceId(record.id)}
                        >
                          Skills
                        </Button>
                        <Popconfirm
                          title="Deactivate resource?"
                          description="It will no longer be available for new recommendations."
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
                ]
          }
        />
      </QueryState>

      <Modal
        title={editing ? 'Edit Learning Resource' : 'Add Learning Resource'}
        open={formOpen}
        onCancel={closeForm}
        onOk={() => form.submit()}
        okText="Save"
        confirmLoading={save.isPending}
        width={820}
        destroyOnHidden
      >
        <Form<ResourceFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, whitespace: true, max: 200 }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 5000 }]}
          >
            <Input.TextArea rows={4} maxLength={5000} showCount />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="resourceType"
                label="Type"
                rules={[{ required: true }]}
              >
                <Select options={resourceTypeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="difficultyLevel" label="Difficulty">
                <Select allowClear options={difficultyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Status">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="provider"
                label="Provider"
                rules={[{ max: 150 }]}
              >
                <Input maxLength={150} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="estimatedDuration"
                label="Duration"
                rules={[{ max: 100 }]}
              >
                <Input maxLength={100} placeholder="e.g. 6 hours" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="language"
                label="Language"
                rules={[{ max: 50 }]}
              >
                <Input maxLength={50} placeholder="e.g. vi" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="url" label="URL" rules={[{ max: 500 }]}>
            <Input maxLength={500} />
          </Form.Item>
          <Form.Item name="isFree" label="Free access" valuePropName="checked">
            <Switch checkedChildren="Free" unCheckedChildren="Paid" />
          </Form.Item>
        </Form>
      </Modal>

      <ResourceDetailDrawer
        resourceId={detailResourceId}
        open={Boolean(detailResourceId)}
        onClose={() => setDetailResourceId(null)}
      />
    </>
  );
}

function ResourceDetailDrawer({
  resourceId,
  open,
  onClose,
}: {
  resourceId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const resource = useQuery({
    queryKey: ['admin', 'learning-resources', 'detail', resourceId],
    queryFn: () => learningResourceService.get(resourceId ?? ''),
    enabled: open && Boolean(resourceId),
  });
  const record = resource.data;

  return (
    <Drawer
      title={record?.title ?? 'Learning Resource'}
      open={open}
      onClose={onClose}
      width={isMobile ? '100%' : 1040}
    >
      <QueryState loading={resource.isLoading} error={resource.error}>
        {record ? (
          <>
            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Title" span={2}>
                {record.title}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color="blue">{record.resourceType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusBadge status={record.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Provider">
                {record.provider || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Difficulty">
                {record.difficultyLevel ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {record.estimatedDuration || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Language">
                {record.language || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Access">
                <Tag color={record.isFree ? 'green' : 'gold'}>
                  {record.isFree ? 'FREE' : 'PAID'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Last updated">
                {formatDate(record.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="URL" span={2}>
                {record.url ? (
                  <Typography.Link
                    href={record.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {record.url}
                  </Typography.Link>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {record.description || '-'}
                </Typography.Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Usage" span={2}>
                <Space wrap>
                  <Tag>{record._count?.templateLinks ?? 0} templates</Tag>
                  <Tag>{record._count?.recommendationLinks ?? 0} recommendations</Tag>
                  <Tag>{record._count?.progress ?? 0} progress records</Tag>
                </Space>
              </Descriptions.Item>
            </Descriptions>
            <ResourceSkillLinksManager resource={record} />
          </>
        ) : null}
      </QueryState>
    </Drawer>
  );
}

function ResourceSkillLinksManager({ resource }: { resource: LearningResource }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LearningResourceSkillLink | null>(
    null,
  );
  const [form] = Form.useForm<SkillLinkFormValues>();
  const links = resource.skills ?? [];

  const skills = useQuery({
    queryKey: ['admin', 'learning-resources', 'skills', 'options'],
    queryFn: () => learningResourceService.listSkills(),
  });

  const saveLink = useMutation({
    mutationFn: (values: SkillLinkFormValues) => {
      const payload = toSkillLinkPayload(values);
      if (editingLink) {
        return learningResourceService.updateSkill(
          resource.id,
          editingLink.skillId,
          {
            currentTargetLevel: editingLink.targetLevel ?? null,
            targetLevel: payload.targetLevel,
            roadmapPhase: payload.roadmapPhase,
            relevanceScore: payload.relevanceScore,
            orderIndex: payload.orderIndex,
          },
        );
      }
      return learningResourceService.linkSkill(resource.id, payload);
    },
    onSuccess: () => {
      message.success(editingLink ? 'Skill link updated' : 'Skill linked');
      setModalOpen(false);
      setEditingLink(null);
      form.resetFields();
      invalidateResourceQueries(queryClient, resource.id);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const unlinkSkill = useMutation({
    mutationFn: (skillId: string) =>
      learningResourceService.unlinkSkill(resource.id, skillId),
    onSuccess: (result) => {
      message.success(
        result.deletedLinks > 1
          ? `${result.deletedLinks} skill links removed`
          : 'Skill unlinked',
      );
      invalidateResourceQueries(queryClient, resource.id);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const skillOptions = (skills.data?.data ?? []).map((skill) => ({
    label: `${skill.name}${skill.category?.name ? ` (${skill.category.name})` : ''}`,
    value: skill.id,
  }));

  const openLinkForm = (link?: LearningResourceSkillLink) => {
    setEditingLink(link ?? null);
    form.resetFields();
    form.setFieldsValue(
      link
        ? {
            skillId: link.skillId,
            targetLevel: link.targetLevel,
            roadmapPhase: link.roadmapPhase,
            relevanceScore: link.relevanceScore,
            orderIndex: link.orderIndex,
          }
        : {
            relevanceScore: 0,
            orderIndex: links.length + 1,
          },
    );
    setModalOpen(true);
  };

  const closeLinkForm = () => {
    if (saveLink.isPending) return;
    setModalOpen(false);
    setEditingLink(null);
    form.resetFields();
  };

  return (
    <div style={{ marginTop: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Linked Skills
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openLinkForm()}>
          Link skill
        </Button>
      </Space>
      <Table<LearningResourceSkillLink>
        rowKey="id"
        dataSource={links}
        pagination={false}
        scroll={{ x: 860 }}
        locale={{ emptyText: 'No skills linked' }}
        columns={[
          {
            title: 'Skill',
            width: 210,
            render: (_: unknown, link) => (
              <Space direction="vertical" size={0}>
                <Typography.Text strong>{link.skill?.name ?? link.skillId}</Typography.Text>
                {link.skill?.category?.name ? (
                  <Typography.Text type="secondary">
                    {link.skill.category.name}
                  </Typography.Text>
                ) : null}
              </Space>
            ),
          },
          {
            title: 'Target level',
            width: 130,
            render: (_: unknown, link) => <Tag>{link.targetLevel ?? 'ANY'}</Tag>,
          },
          {
            title: 'Roadmap phase',
            width: 190,
            render: (_: unknown, link) => link.roadmapPhase ?? '-',
          },
          { title: 'Relevance', dataIndex: 'relevanceScore', width: 100 },
          { title: 'Order', dataIndex: 'orderIndex', width: 80 },
          {
            title: 'Actions',
            fixed: 'right',
            width: 220,
            render: (_: unknown, link) => {
              const sameSkillCount = links.filter(
                (item) => item.skillId === link.skillId,
              ).length;
              return (
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => openLinkForm(link)}>
                    Edit
                  </Button>
                  <Popconfirm
                    title={
                      sameSkillCount > 1
                        ? `Unlink all ${sameSkillCount} levels for this skill?`
                        : 'Unlink skill?'
                    }
                    okText="Unlink"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => unlinkSkill.mutate(link.skillId)}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      Unlink
                    </Button>
                  </Popconfirm>
                </Space>
              );
            },
          },
        ]}
      />

      <Modal
        title={editingLink ? 'Edit Skill Link' : 'Link Skill'}
        open={modalOpen}
        onCancel={closeLinkForm}
        onOk={() => form.submit()}
        okText={editingLink ? 'Save' : 'Link'}
        confirmLoading={saveLink.isPending}
        destroyOnHidden
      >
        <Form<SkillLinkFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => saveLink.mutate(values)}
        >
          <Form.Item
            name="skillId"
            label="Skill"
            rules={[{ required: true }]}
          >
            <Select
              disabled={Boolean(editingLink)}
              loading={skills.isLoading}
              showSearch
              optionFilterProp="label"
              options={skillOptions}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetLevel" label="Target Level">
                <Select allowClear options={levelOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="roadmapPhase" label="Roadmap Phase">
                <Select allowClear options={roadmapPhaseOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="relevanceScore" label="Relevance Score">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="orderIndex" label="Order">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

function toResourceFormValues(resource: LearningResource): ResourceFormValues {
  return {
    title: resource.title,
    description: resource.description,
    resourceType: resource.resourceType,
    url: resource.url,
    provider: resource.provider,
    difficultyLevel: resource.difficultyLevel,
    estimatedDuration: resource.estimatedDuration,
    language: resource.language,
    isFree: resource.isFree,
    status: resource.status,
  };
}

function toResourcePayload(values: ResourceFormValues): LearningResourcePayload {
  return {
    title: values.title.trim(),
    description: normalizeOptionalText(values.description),
    resourceType: values.resourceType,
    url: normalizeOptionalText(values.url),
    provider: normalizeOptionalText(values.provider),
    difficultyLevel: values.difficultyLevel ?? null,
    estimatedDuration: normalizeOptionalText(values.estimatedDuration),
    language: normalizeOptionalText(values.language),
    isFree: values.isFree ?? true,
    status: values.status ?? 'ACTIVE',
  };
}

function toSkillLinkPayload(
  values: SkillLinkFormValues,
): LinkResourceSkillPayload {
  return {
    skillId: values.skillId,
    targetLevel: values.targetLevel ?? null,
    roadmapPhase: values.roadmapPhase ?? null,
    relevanceScore: values.relevanceScore ?? 0,
    orderIndex: values.orderIndex ?? 0,
  };
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function invalidateResourceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  void queryClient.invalidateQueries({
    queryKey: ['admin', 'learning-resources', 'list'],
  });
  if (id) {
    void queryClient.invalidateQueries({
      queryKey: ['admin', 'learning-resources', 'detail', id],
    });
  } else {
    void queryClient.invalidateQueries({
      queryKey: ['admin', 'learning-resources'],
    });
  }
}
