'use client';

import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Table,
  Tag,
  Upload,
  App,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { getData, getPage, patchData } from '@/lib/request';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { SearchBar } from '@/components/ui/SearchBar';
import type {
  CareerGoal,
  Skill,
  Specialization,
  StudentProfile,
} from '@/types/domain';

const GENERAL_SPECIALIZATION_VALUE = '__GENERAL_SPECIALIZATION__';

export function StudentProfilePageView() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const selectedCareerGoalId = Form.useWatch('careerGoalId', form);
  const profile = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => getData<StudentProfile>('/profiles/me'),
  });
  const careers = useQuery({
    queryKey: ['career-goals', 'options'],
    queryFn: () =>
      getPage<CareerGoal>('/career-goals', { limit: 100, status: 'ACTIVE' }),
  });
  const specializations = useQuery({
    queryKey: ['career-goal-specializations', selectedCareerGoalId],
    queryFn: () =>
      getPage<Specialization>(
        `/career-goals/${selectedCareerGoalId}/specializations`,
        {
          limit: 100,
        },
      ),
    enabled: Boolean(selectedCareerGoalId),
  });
  const specializationOptions = useMemo(
    () => specializations.data?.data ?? [],
    [specializations.data],
  );
  const showSpecializationSelect =
    Boolean(selectedCareerGoalId) &&
    (specializations.isLoading || specializationOptions.length > 0);

  const save = useMutation({
    mutationFn: (values: any) =>
      patchData('/profiles/me', buildProfilePayload(values)),
    onSuccess: () => {
      message.success('Profile updated');
      profile.refetch();
    },
  });

  useEffect(() => {
    if (profile.data && !form.isFieldsTouched()) {
      form.setFieldsValue(toProfileFormValues(profile.data));
    }
  }, [form, profile.data]);

  useEffect(() => {
    if (!selectedCareerGoalId) {
      form.setFieldValue('specializationId', GENERAL_SPECIALIZATION_VALUE);
      return;
    }
    if (!specializations.data) {
      return;
    }

    const currentSpecializationId = form.getFieldValue('specializationId');
    const hasCurrentSpecialization = specializationOptions.some(
      (specialization) => specialization.id === currentSpecializationId,
    );

    if (
      !specializationOptions.length ||
      (currentSpecializationId &&
        currentSpecializationId !== GENERAL_SPECIALIZATION_VALUE &&
        !hasCurrentSpecialization)
    ) {
      form.setFieldValue('specializationId', GENERAL_SPECIALIZATION_VALUE);
    }
  }, [form, selectedCareerGoalId, specializationOptions, specializations.data]);

  return (
    <QueryState loading={profile.isLoading} error={profile.error}>
      <PageHeader
        title="Profile"
        description="Update your personal competency profile."
      />
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          <Form.Item name="careerGoalId" label="Career Goal">
            <Select
              allowClear
              loading={careers.isLoading}
              onChange={() =>
                form.setFieldValue(
                  'specializationId',
                  GENERAL_SPECIALIZATION_VALUE,
                )
              }
              options={(careers.data?.data ?? []).map((goal) => ({
                label: goal.name,
                value: goal.id,
              }))}
            />
          </Form.Item>
          {showSpecializationSelect ? (
            <Form.Item name="specializationId" label="Specialization">
              <Select
                allowClear
                loading={specializations.isLoading}
                placeholder="Select specialization"
                options={[
                  {
                    label: 'General / No specialization',
                    value: GENERAL_SPECIALIZATION_VALUE,
                  },
                  ...specializationOptions.map((specialization) => ({
                    label: specialization.name,
                    value: specialization.id,
                  })),
                ]}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="summary" label="Summary">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="githubUrl" label="GitHub URL">
            <Input />
          </Form.Item>
          <Form.Item name="linkedinUrl" label="LinkedIn URL">
            <Input />
          </Form.Item>
          <Form.Item name="portfolioUrl" label="Portfolio URL">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            Save Profile
          </Button>
        </Form>
      </Card>
    </QueryState>
  );
}

export function StudentSkillsPageView() {
  const skills = useQuery({
    queryKey: ['skills', 'options'],
    queryFn: () => getPage<Skill>('/skills', { limit: 100, status: 'ACTIVE' }),
  });
  return (
    <StudentResourcePage
      title="Skills"
      endpoint="/profiles/me/skills"
      fields={[
        <Form.Item
          key="skillId"
          name="skillId"
          label="Skill"
          rules={[{ required: true }]}
        >
          <Select
            options={(skills.data?.data ?? []).map((skill) => ({
              label: skill.name,
              value: skill.id,
            }))}
          />
        </Form.Item>,
        <Form.Item key="description" name="description" label="Description">
          <Input.TextArea rows={3} />
        </Form.Item>,
      ]}
      columns={[
        {
          title: 'Skill',
          render: (_value: unknown, row: any) => row.skill?.name ?? row.skillId,
        },
        { title: 'Current Level', dataIndex: 'currentLevel' },
      ]}
    />
  );
}

export function StudentProjectsPageView() {
  return (
    <StudentResourcePage
      title="Projects"
      endpoint="/profiles/me/projects"
      fields={projectFields()}
      columns={[
        { title: 'Title', dataIndex: 'title' },
        { title: 'Status', dataIndex: 'status', render: tag },
      ]}
    />
  );
}

export function StudentCertificatesPageView() {
  return (
    <StudentResourcePage
      title="Certificates"
      endpoint="/profiles/me/certificates"
      fields={certificateFields()}
      columns={[
        { title: 'Name', dataIndex: 'certificateName' },
        { title: 'Issuer', dataIndex: 'issuer' },
      ]}
    />
  );
}

export function StudentActivitiesPageView() {
  return (
    <StudentResourcePage
      title="Activities"
      endpoint="/profiles/me/activities"
      fields={activityFields()}
      columns={[
        { title: 'Title', dataIndex: 'title' },
        { title: 'Organization', dataIndex: 'organization' },
      ]}
    />
  );
}

export function StudentExperiencesPageView() {
  return (
    <StudentResourcePage
      title="Experiences"
      endpoint="/profiles/me/experiences"
      fields={experienceFields()}
      columns={[
        { title: 'Company', dataIndex: 'companyName' },
        { title: 'Position', dataIndex: 'position' },
      ]}
    />
  );
}

function StudentResourcePage({ title, endpoint, fields, columns }: any) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey: [endpoint],
    queryFn: () => getPage<any>(endpoint, { limit: 50 }),
  });
  const save = useMutation({
    mutationFn: (values: any) => api.post(endpoint, values),
    onSuccess: () => {
      message.success('Saved');
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
  });

  return (
    <QueryState loading={data.isLoading} error={data.error}>
      <PageHeader title={title} />
      <Card style={{ marginBottom: 16 }}>
        <Form layout="vertical" onFinish={(values) => save.mutate(values)}>
          {fields}
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            Add
          </Button>
        </Form>
      </Card>
      <SearchBar onSearch={() => undefined} onRefresh={() => data.refetch()} />
      <Table
        rowKey="id"
        dataSource={data.data?.data ?? []}
        columns={[
          ...columns,
          {
            title: 'Verification',
            dataIndex: 'verificationStatus',
            render: tag,
          },
          {
            title: 'Evidence',
            render: (_: unknown, row: any) => (
              <EvidenceUpload endpoint={`${endpoint}/${row.id}/evidences`} />
            ),
          },
        ]}
      />
    </QueryState>
  );
}

function EvidenceUpload({ endpoint }: { endpoint: string }) {
  const { message } = App.useApp();
  return (
    <Upload
      showUploadList={false}
      customRequest={async ({ file, onSuccess, onError }) => {
        const formData = new FormData();
        formData.append('file', file as File);
        try {
          await api.post(endpoint, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          message.success('Evidence uploaded');
          onSuccess?.({});
        } catch (error) {
          onError?.(error as Error);
        }
      }}
    >
      <Button icon={<UploadOutlined />}>Upload</Button>
    </Upload>
  );
}

const tag = (value: string) => (value ? <Tag>{value}</Tag> : '-');

function toProfileFormValues(profile: StudentProfile) {
  return {
    ...profile,
    specializationId: profile.specializationId ?? GENERAL_SPECIALIZATION_VALUE,
  };
}

function buildProfilePayload(values: any) {
  return {
    ...values,
    careerGoalId: values.careerGoalId ?? null,
    specializationId:
      values.specializationId &&
      values.specializationId !== GENERAL_SPECIALIZATION_VALUE
        ? values.specializationId
        : null,
  };
}

function projectFields() {
  return [
    <Form.Item
      key="title"
      name="title"
      label="Title"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>,
    <Form.Item key="roleInProject" name="roleInProject" label="Role">
      <Input />
    </Form.Item>,
    <Form.Item key="description" name="description" label="Description">
      <Input.TextArea rows={3} />
    </Form.Item>,
  ];
}
function certificateFields() {
  return [
    <Form.Item
      key="certificateName"
      name="certificateName"
      label="Certificate Name"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>,
    <Form.Item key="issuer" name="issuer" label="Issuer">
      <Input />
    </Form.Item>,
  ];
}
function activityFields() {
  return [
    <Form.Item
      key="title"
      name="title"
      label="Title"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>,
    <Form.Item key="organization" name="organization" label="Organization">
      <Input />
    </Form.Item>,
    <Form.Item key="description" name="description" label="Description">
      <Input.TextArea rows={3} />
    </Form.Item>,
  ];
}
function experienceFields() {
  return [
    <Form.Item
      key="companyName"
      name="companyName"
      label="Company"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>,
    <Form.Item
      key="position"
      name="position"
      label="Position"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>,
    <Form.Item key="description" name="description" label="Description">
      <Input.TextArea rows={3} />
    </Form.Item>,
  ];
}
