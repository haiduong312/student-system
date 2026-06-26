'use client';

import {
  App,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { SearchBar } from '@/components/ui/SearchBar';
import type {
  AssessmentQuestion,
  QuestionStatus,
  QuestionType,
  SkillType,
} from '@/types/domain';
import {
  assessmentQuestionService,
  type AssessmentQuestionOptionPayload,
  type AssessmentQuestionPayload,
} from './assessment-question.service';

const questionTypeOptions: Array<{ value: QuestionType; label: string }> = [
  { value: 'SINGLE_CHOICE', label: 'SINGLE_CHOICE' },
  { value: 'TRUE_FALSE', label: 'TRUE_FALSE' },
];

const questionStatusOptions: Array<{ value: QuestionStatus; label: string }> = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
];

const skillTypeOptions: Array<{ value: SkillType; label: string }> = [
  { value: 'COMMON', label: 'COMMON' },
  { value: 'CAREER_SPECIFIC', label: 'CAREER_SPECIFIC' },
];

interface QuestionFilters {
  skillId?: string;
  skillType?: SkillType;
  level?: number;
  status?: QuestionStatus;
  questionType?: QuestionType;
}

type QuestionFormValues = AssessmentQuestionPayload;

export function AssessmentQuestionBankPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [editing, setEditing] = useState<AssessmentQuestion | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<QuestionFormValues>();
  const questionType = Form.useWatch('questionType', form) as QuestionType | undefined;

  const questions = useQuery({
    queryKey: ['assessment-questions', search, filters],
    queryFn: () =>
      assessmentQuestionService.listQuestions({
        search,
        ...filters,
      }),
  });
  const skills = useQuery({
    queryKey: ['skills', 'question-bank-options'],
    queryFn: () => assessmentQuestionService.listSkills(),
  });

  const save = useMutation({
    mutationFn: (values: QuestionFormValues) => {
      const payload = buildQuestionPayload(values);
      return assessmentQuestionService.saveQuestion(payload, editing?.id);
    },
    onSuccess: () => {
      message.success('Saved');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['assessment-questions'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => assessmentQuestionService.deleteQuestion(id),
    onSuccess: () => {
      message.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['assessment-questions'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const openForm = (record?: AssessmentQuestion) => {
    setEditing(record ?? null);
    form.resetFields();
    form.setFieldsValue(
      record
        ? {
            skillId: record.skillId,
            questionText: record.questionText,
            questionType: record.questionType,
            level: record.level,
            explanation: record.explanation,
            status: record.status,
            options: (record.options ?? []).map((option) => ({
              optionText: option.optionText,
              isCorrect: option.isCorrect,
              orderIndex: option.orderIndex,
            })),
          }
        : {
            questionType: 'SINGLE_CHOICE',
            level: 1,
            status: 'ACTIVE',
            options: defaultChoiceOptions(),
          },
    );
    setOpen(true);
  };

  const handleQuestionTypeChange = (value: QuestionType) => {
    if (value === 'TRUE_FALSE') {
      form.setFieldValue('options', [
        { optionText: 'True', isCorrect: true, orderIndex: 1 },
        { optionText: 'False', isCorrect: false, orderIndex: 2 },
      ]);
      return;
    }

    const options = form.getFieldValue('options');
    if (!Array.isArray(options) || options.length < 2) {
      form.setFieldValue('options', defaultChoiceOptions());
    }
  };

  const handleSubmit = (values: QuestionFormValues) => {
    const validationError = validateQuestion(values);
    if (validationError) {
      message.error(validationError);
      return;
    }

    save.mutate(values);
  };

  const skillOptions = (skills.data?.data ?? []).map((skill) => ({
    label: `${skill.name} (${skill.type})`,
    value: skill.id,
  }));

  return (
    <QueryState loading={questions.isLoading} error={questions.error}>
      <PageHeader title="Assessment Question Bank" />
      <SearchBar
        onSearch={setSearch}
        onRefresh={() => questions.refetch()}
        extra={
          <>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Skill"
              style={{ width: 220 }}
              value={filters.skillId}
              options={skillOptions}
              onChange={(skillId) => setFilters((current) => ({ ...current, skillId }))}
            />
            <Select
              allowClear
              placeholder="Skill Type"
              style={{ width: 170 }}
              value={filters.skillType}
              options={skillTypeOptions}
              onChange={(skillType) => setFilters((current) => ({ ...current, skillType }))}
            />
            <Select
              allowClear
              placeholder="Level"
              style={{ width: 110 }}
              value={filters.level}
              options={[1, 2, 3].map((level) => ({ value: level, label: `Level ${level}` }))}
              onChange={(level) => setFilters((current) => ({ ...current, level }))}
            />
            <Select
              allowClear
              placeholder="Type"
              style={{ width: 170 }}
              value={filters.questionType}
              options={questionTypeOptions}
              onChange={(nextType) => setFilters((current) => ({ ...current, questionType: nextType }))}
            />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 130 }}
              value={filters.status}
              options={questionStatusOptions}
              onChange={(status) => setFilters((current) => ({ ...current, status }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
              Add
            </Button>
          </>
        }
      />
      <Table<AssessmentQuestion>
        rowKey="id"
        dataSource={questions.data?.data ?? []}
        pagination={{ pageSize: 10, total: questions.data?.meta.total }}
        columns={[
          { title: 'Question', dataIndex: 'questionText', ellipsis: true },
          { title: 'Skill', render: (_: unknown, row: AssessmentQuestion) => row.skill?.name ?? row.skillId },
          { title: 'Skill Type', render: (_: unknown, row: AssessmentQuestion) => <SkillTypeTag type={row.skill?.type} /> },
          { title: 'Level', dataIndex: 'level' },
          { title: 'Question Type', dataIndex: 'questionType', render: (value) => <Tag>{value}</Tag> },
          { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
          {
            title: 'Actions',
            render: (_: unknown, record: AssessmentQuestion) => (
              <Space>
                <Button onClick={() => openForm(record)}>Edit</Button>
                <Button danger onClick={() => remove.mutate(record.id)}>Delete</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? 'Edit Question' : 'Add Question'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        width={760}
      >
        <Form<QuestionFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="skillId" label="Skill" rules={[{ required: true }]}>
            <Select
              loading={skills.isLoading}
              showSearch
              optionFilterProp="label"
              options={skillOptions}
            />
          </Form.Item>
          <Form.Item name="questionText" label="Question" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item
              name="questionType"
              label="Question Type"
              rules={[{ required: true }]}
              style={{ width: '45%' }}
            >
              <Select options={questionTypeOptions} onChange={handleQuestionTypeChange} />
            </Form.Item>
            <Form.Item
              name="level"
              label="Level"
              rules={[{ required: true }]}
              style={{ width: '25%' }}
            >
              <InputNumber min={1} max={3} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="Status" style={{ width: '30%' }}>
              <Select options={questionStatusOptions} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="explanation" label="Explanation">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.List name="options">
            {(fields, { add, remove: removeOption }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field, index) => (
                  <Space key={field.key} align="baseline" style={{ width: '100%' }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'optionText']}
                      rules={[{ required: true }]}
                      style={{ flex: 1, minWidth: 420 }}
                    >
                      <Input placeholder={`Option ${index + 1}`} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'isCorrect']}
                      valuePropName="checked"
                      initialValue={false}
                    >
                      <Checkbox>Correct</Checkbox>
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'orderIndex']}
                      initialValue={index + 1}
                      style={{ width: 80 }}
                    >
                      <InputNumber min={0} />
                    </Form.Item>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={questionType === 'TRUE_FALSE' || fields.length <= 1}
                      onClick={() => removeOption(field.name)}
                    />
                  </Space>
                ))}
                <Button
                  icon={<PlusOutlined />}
                  disabled={questionType === 'TRUE_FALSE'}
                  onClick={() =>
                    add({ optionText: '', isCorrect: false, orderIndex: fields.length + 1 })
                  }
                >
                  Add Option
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </QueryState>
  );
}

function SkillTypeTag({ type }: { type?: SkillType }) {
  return <Tag color={type === 'COMMON' ? 'blue' : 'green'}>{type ?? '-'}</Tag>;
}

function defaultChoiceOptions() {
  return [
    { optionText: '', isCorrect: true, orderIndex: 1 },
    { optionText: '', isCorrect: false, orderIndex: 2 },
    { optionText: '', isCorrect: false, orderIndex: 3 },
  ];
}

function validateQuestion(values: QuestionFormValues) {
  if (!values.skillId) {
    return 'Please choose a skill.';
  }
  if (!values.questionText?.trim()) {
    return 'Please enter question text.';
  }

  const options = Array.isArray(values.options) ? values.options : [];
  const correctCount = options.filter((option) => option?.isCorrect).length;
  if (!options.length || options.some((option) => !option?.optionText?.trim())) {
    return 'Please enter all options.';
  }
  if (values.questionType === 'SINGLE_CHOICE' && correctCount !== 1) {
    return 'SINGLE_CHOICE must have exactly one correct answer.';
  }
  if (values.questionType === 'TRUE_FALSE') {
    if (options.length !== 2) {
      return 'TRUE_FALSE must have exactly two options.';
    }
    if (correctCount !== 1) {
      return 'TRUE_FALSE must have exactly one correct answer.';
    }
  }
  return null;
}

function buildQuestionPayload(values: QuestionFormValues): AssessmentQuestionPayload {
  return {
    skillId: values.skillId,
    questionText: values.questionText,
    questionType: values.questionType,
    level: values.level,
    explanation: values.explanation,
    status: values.status ?? 'ACTIVE',
    options: values.options.map((option: AssessmentQuestionOptionPayload, index: number) => ({
      optionText: option.optionText,
      isCorrect: Boolean(option.isCorrect),
      orderIndex: option.orderIndex ?? index + 1,
    })),
  };
}
