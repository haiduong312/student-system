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
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { TableColumnsType } from 'antd';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { SearchBar } from '@/components/ui/SearchBar';
import type {
  CareerGoal,
  ProjectStatus,
  Skill,
  Specialization,
  StudentProfile,
  VerificationStatus,
} from '@/types/domain';
import {
  invalidateStudentCurrentContextQueries,
  resetStudentCurrentContextQueries,
  studentQueryKeys,
  useCurrentProfileContext,
} from './profile-context';
import {
  profileService,
  type ProfilePayload,
  type SkillFormValues,
} from './profile.service';

const GENERAL_SPECIALIZATION_VALUE = '__GENERAL_SPECIALIZATION__';

interface ProfileFormValues {
  careerGoalId?: string | null;
  specializationId?: string | null;
  summary?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
}

interface StudentResourceBase {
  id: string;
  verificationStatus?: VerificationStatus;
  evidenceStatus?: VerificationStatus;
}

interface StudentSkillResource extends StudentResourceBase {
  skillId: string;
  skill?: Skill | null;
  currentLevel: number;
  evidenceStatus: VerificationStatus;
}

interface StudentProjectResource extends StudentResourceBase {
  title: string;
  status: ProjectStatus;
  verificationStatus: VerificationStatus;
}

interface StudentCertificateResource extends StudentResourceBase {
  certificateName: string;
  issuer?: string | null;
  verificationStatus: VerificationStatus;
}

interface StudentActivityResource extends StudentResourceBase {
  title: string;
  organization?: string | null;
  verificationStatus: VerificationStatus;
}

interface StudentExperienceResource extends StudentResourceBase {
  companyName: string;
  position: string;
  verificationStatus: VerificationStatus;
}

interface ProjectFormValues {
  title: string;
  roleInProject?: string;
  description?: string;
}

interface CertificateFormValues {
  certificateName: string;
  issuer?: string;
}

interface ActivityFormValues {
  title: string;
  organization?: string;
  description?: string;
}

interface ExperienceFormValues {
  companyName: string;
  position: string;
  description?: string;
}

export function StudentProfilePageView() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const selectedCareerGoalId = Form.useWatch('careerGoalId', form);
  const context = useCurrentProfileContext();
  const careers = useQuery({
    queryKey: ['career-goals', 'options'],
    queryFn: () => profileService.listActiveCareerGoals(),
  });
  const specializations = useQuery({
    queryKey: ['career-goal-specializations', selectedCareerGoalId],
    queryFn: () =>
      profileService.listCareerGoalSpecializations(selectedCareerGoalId),
    enabled: Boolean(selectedCareerGoalId),
  });
  const specializationOptions = useMemo(
    () => specializations.data?.data ?? [],
    [specializations.data],
  );
  const requiresSpecialization =
    Boolean(selectedCareerGoalId) && specializationOptions.length > 0;
  const showSpecializationSelect =
    Boolean(selectedCareerGoalId) &&
    (specializations.isLoading || specializationOptions.length > 0);

  const save = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      profileService.updateMyProfile(buildProfilePayload(values)),
    onSuccess: (updatedProfile) => {
      message.success('Profile updated');
      const contextChanged =
        context.careerGoalId !== (updatedProfile.careerGoalId ?? null) ||
        context.specializationId !== (updatedProfile.specializationId ?? null);

      queryClient.setQueryData(studentQueryKeys.profile, updatedProfile);
      if (contextChanged) {
        resetStudentCurrentContextQueries(queryClient);
      }
      invalidateStudentCurrentContextQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  useEffect(() => {
    if (context.profile && !form.isFieldsTouched()) {
      form.setFieldsValue(toProfileFormValues(context.profile));
    }
  }, [form, context.profile]);

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
    <QueryState loading={context.loading} error={context.error}>
      <PageHeader
        title="Profile"
        description="Update your personal competency profile."
      />
      <Card>
        <Form<ProfileFormValues>
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
            <Form.Item
              name="specializationId"
              label="Specialization"
              rules={[
                {
                  validator: async (_rule, value: string | null | undefined) => {
                    if (
                      !requiresSpecialization ||
                      (value && value !== GENERAL_SPECIALIZATION_VALUE)
                    ) {
                      return;
                    }

                    throw new Error('Please select a specialization for this career goal.');
                  },
                },
              ]}
            >
              <Select
                allowClear
                loading={specializations.isLoading}
                placeholder="Select specialization"
                options={
                  requiresSpecialization
                    ? specializationOptions.map((specialization) => ({
                        label: specialization.name,
                        value: specialization.id,
                      }))
                    : [
                        {
                          label: 'General / No specialization',
                          value: GENERAL_SPECIALIZATION_VALUE,
                        },
                        ...specializationOptions.map((specialization) => ({
                          label: specialization.name,
                          value: specialization.id,
                        })),
                      ]
                }
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
    queryFn: () => profileService.listActiveSkills(),
  });
  return (
    <StudentResourcePage<StudentSkillResource, SkillFormValues>
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
          render: (_value, row) => row.skill?.name ?? row.skillId,
        },
        { title: 'Current Level', dataIndex: 'currentLevel' },
      ]}
    />
  );
}

export function StudentProjectsPageView() {
  return (
    <StudentResourcePage<StudentProjectResource, ProjectFormValues>
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
    <StudentResourcePage<StudentCertificateResource, CertificateFormValues>
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
    <StudentResourcePage<StudentActivityResource, ActivityFormValues>
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
    <StudentResourcePage<StudentExperienceResource, ExperienceFormValues>
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

function StudentResourcePage<TResource extends StudentResourceBase, TFormValues extends object>({
  title,
  endpoint,
  fields,
  columns,
}: {
  title: string;
  endpoint: string;
  fields: ReactNode[];
  columns: TableColumnsType<TResource>;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey: [endpoint],
    queryFn: () => profileService.listProfileResources<TResource>(endpoint),
  });
  const save = useMutation({
    mutationFn: (values: TFormValues) =>
      profileService.createProfileResource<TResource, TFormValues>(endpoint, values),
    onSuccess: () => {
      message.success('Saved');
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      invalidateAfterResourceChange(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  return (
    <QueryState loading={data.isLoading} error={data.error}>
      <PageHeader title={title} />
      <Card style={{ marginBottom: 16 }}>
        <Form<TFormValues> layout="vertical" onFinish={(values) => save.mutate(values)}>
          {fields}
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            Add
          </Button>
        </Form>
      </Card>
      <SearchBar onSearch={() => undefined} onRefresh={() => data.refetch()} />
      <Table<TResource>
        rowKey="id"
        dataSource={data.data?.data ?? []}
        columns={[
          ...columns,
          {
            title: 'Verification',
            render: (_value, row) => tag(row.verificationStatus ?? row.evidenceStatus),
          },
          {
            title: 'Evidence',
            render: (_value, row) => (
              <EvidenceUpload
                endpoint={`${endpoint}/${row.id}/evidences`}
                onUploaded={() => {
                  queryClient.invalidateQueries({ queryKey: [endpoint] });
                  queryClient.invalidateQueries({ queryKey: studentQueryKeys.evidencesMe });
                  invalidateAfterResourceChange(queryClient);
                }}
              />
            ),
          },
        ]}
      />
    </QueryState>
  );
}

function EvidenceUpload({
  endpoint,
  onUploaded,
}: {
  endpoint: string;
  onUploaded: () => void;
}) {
  const { message } = App.useApp();
  return (
    <Upload
      showUploadList={false}
      customRequest={async ({ file, onSuccess, onError }) => {
        try {
          await profileService.uploadProfileEvidence(endpoint, file as File);
          message.success('Evidence uploaded');
          onUploaded();
          onSuccess?.({});
        } catch (error) {
          message.error(getApiErrorMessage(error));
          onError?.(error as Error);
        }
      }}
    >
      <Button icon={<UploadOutlined />}>Upload</Button>
    </Upload>
  );
}

const tag = (value?: string | null) => (value ? <Tag>{value}</Tag> : '-');

function toProfileFormValues(profile: StudentProfile): ProfileFormValues {
  return {
    careerGoalId: profile.careerGoalId ?? null,
    specializationId: profile.specializationId ?? GENERAL_SPECIALIZATION_VALUE,
    summary: profile.summary,
    githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl,
    portfolioUrl: profile.portfolioUrl,
  };
}

function buildProfilePayload(values: ProfileFormValues): ProfilePayload {
  return {
    careerGoalId: values.careerGoalId ?? null,
    specializationId:
      values.specializationId &&
      values.specializationId !== GENERAL_SPECIALIZATION_VALUE
        ? values.specializationId
        : null,
    summary: values.summary,
    githubUrl: values.githubUrl,
    linkedinUrl: values.linkedinUrl,
    portfolioUrl: values.portfolioUrl,
  };
}

function invalidateAfterResourceChange(queryClient: QueryClient) {
  invalidateStudentCurrentContextQueries(queryClient);
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
