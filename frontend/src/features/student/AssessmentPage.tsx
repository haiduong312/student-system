'use client';

import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  List,
  Modal,
  Progress,
  Radio,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import type { SkillType } from '@/types/domain';
import { SKILL_TYPES } from '@/types/domain';
import {
  getStudentProfileScopeKey,
  invalidateStudentCurrentContextQueries,
  useStudentProfileQuery,
} from './profile-context';
import {
  startAssessment,
  submitAssessment,
  type AssessmentLevelBreakdown,
  type AssessmentSkillResult,
  type AssessmentStartQuestion,
  type AssessmentStartResponse,
  type AssessmentSubmitResponse,
} from './assessment.service';

export function StudentAssessmentPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [started, setStarted] = useState<AssessmentStartResponse | null>(null);
  const [result, setResult] = useState<AssessmentSubmitResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const profile = useStudentProfileQuery();
  const profileScopeKey = getStudentProfileScopeKey(profile.data);

  const start = useMutation({
    mutationKey: ['assessment', 'start', ...profileScopeKey],
    mutationFn: () => startAssessment(),
    onSuccess: (data) => {
      setStarted(data);
      setResult(null);
      setAnswers({});
      message.success('Assessment started');
    },
  });
  const submit = useMutation({
    mutationFn: () => {
      if (!started) {
        throw new Error('Assessment has not started');
      }

      return submitAssessment(
        started.assessmentId,
        started.questions.map((question) => ({
          questionId: question.id,
          selectedOptionId: answers[question.id],
        })),
      );
    },
    onSuccess: (data) => {
      setResult(data);
      invalidateStudentCurrentContextQueries(queryClient);
      message.success('Assessment submitted');
    },
  });

  const careerGoalId = profile.data?.careerGoalId;

  return (
    <QueryState loading={profile.isLoading} error={profile.error}>
      {!started ? (
        <StartAssessmentView
          careerGoalName={profile.data?.careerGoal?.name}
          specializationName={profile.data?.specialization?.name}
          hasCareerGoal={Boolean(careerGoalId)}
          loading={start.isPending}
          onStart={() => {
            if (!careerGoalId) {
              message.error('Please select a career goal before starting.');
              return;
            }
            start.mutate();
          }}
        />
      ) : result ? (
        <AssessmentResultView
          result={result}
          onViewAnalysis={() => router.push('/student/analysis')}
          onViewRoadmap={() => router.push('/student/roadmap')}
          onRestart={() => {
            setStarted(null);
            setResult(null);
            setAnswers({});
          }}
        />
      ) : (
        <AssessmentQuizView
          assessment={started}
          careerGoalName={profile.data?.careerGoal?.name}
          specializationName={profile.data?.specialization?.name}
          answers={answers}
          submitting={submit.isPending}
          onAnswer={(questionId, selectedOptionId) =>
            setAnswers((current) => ({ ...current, [questionId]: selectedOptionId }))
          }
          onSubmit={() => {
            const answeredCount = Object.keys(answers).length;
            if (answeredCount < started.questions.length) {
              message.error('Please answer all questions before submitting.');
              return;
            }

            Modal.confirm({
              title: 'Submit assessment?',
              content: 'Your answers will be graded and used to update your skill levels.',
              okText: 'Submit',
              onOk: () => submit.mutate(),
            });
          }}
        />
      )}
    </QueryState>
  );
}

function StartAssessmentView({
  careerGoalName,
  specializationName,
  hasCareerGoal,
  loading,
  onStart,
}: {
  careerGoalName?: string | null;
  specializationName?: string | null;
  hasCareerGoal: boolean;
  loading: boolean;
  onStart: () => void;
}) {
  return (
    <>
      <PageHeader title="Assessment" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Career Goal">
                  {careerGoalName ?? 'No career goal selected'}
                </Descriptions.Item>
                <Descriptions.Item label="Specialization">
                  {specializationName ?? 'General'}
                </Descriptions.Item>
              </Descriptions>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                Hệ thống sẽ đánh giá kỹ năng của bạn dựa trên kết quả làm bài,
                thay vì tự khai báo trình độ.
              </Typography.Paragraph>
              {!hasCareerGoal ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Please select a career goal in your profile before starting."
                />
              ) : null}
              <Button
                type="primary"
                size="large"
                loading={loading}
                disabled={!hasCareerGoal}
                onClick={onStart}
              >
                Bắt đầu đánh giá
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Skills to assess">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Skill groups will appear after the assessment is generated."
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function AssessmentQuizView({
  assessment,
  careerGoalName,
  specializationName,
  answers,
  submitting,
  onAnswer,
  onSubmit,
}: {
  assessment: AssessmentStartResponse;
  careerGoalName?: string | null;
  specializationName?: string | null;
  answers: Record<string, string>;
  submitting: boolean;
  onAnswer: (questionId: string, selectedOptionId: string) => void;
  onSubmit: () => void;
}) {
  const answeredCount = Object.keys(answers).length;
  const percent = Math.round((answeredCount / assessment.questions.length) * 100);
  const groupedSkills = useMemo(
    () => groupQuestionsBySkillType(assessment.questions),
    [assessment.questions],
  );

  return (
    <>
      <PageHeader title="Assessment Quiz" />
      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="Career Goal">
            {careerGoalName ?? assessment.careerGoalId}
          </Descriptions.Item>
          <Descriptions.Item label="Specialization">
            {specializationName ?? (assessment.specializationId ? assessment.specializationId : 'General')}
          </Descriptions.Item>
          <Descriptions.Item label="Started At">
            {formatDateTime(assessment.startedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Expires At">
            {formatDateTime(assessment.expiresAt)}
          </Descriptions.Item>
          {assessment.attemptPolicy ? (
            <Descriptions.Item label="Attempt Policy" span={2}>
              Max {assessment.attemptPolicy.maxAttempts} attempts · Cooldown{' '}
              {assessment.attemptPolicy.cooldownMinutes} min · Time limit{' '}
              {assessment.attemptPolicy.timeLimitMinutes} min
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      </Card>
      {assessment.warnings.length ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 16 }}
          message="Some skills do not have enough active questions."
          description={assessment.warnings.map((warning) => warning.skillName).join(', ')}
        />
      ) : null}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card title="Progress">
            <Progress percent={percent} />
            <Typography.Text>
              {answeredCount}/{assessment.questions.length} answered
            </Typography.Text>
          </Card>
          <Card title="Skill Groups" style={{ marginTop: 16 }}>
            <SkillGroupList groups={groupedSkills} />
          </Card>
        </Col>
        <Col xs={24} lg={17}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {assessment.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                index={index}
                question={question}
                value={answers[question.id]}
                onChange={(selectedOptionId) => onAnswer(question.id, selectedOptionId)}
              />
            ))}
            <Card>
              <Button
                type="primary"
                size="large"
                loading={submitting}
                disabled={answeredCount < assessment.questions.length}
                onClick={onSubmit}
              >
                Submit Assessment
              </Button>
            </Card>
          </Space>
        </Col>
      </Row>
    </>
  );
}

function QuestionCard({
  question,
  index,
  value,
  onChange,
}: {
  question: AssessmentStartQuestion;
  index: number;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card
      title={
        <Space wrap>
          <span>Question {index + 1}</span>
          <Tag>{question.skillName}</Tag>
          <SkillTypeTag type={question.skillType} />
          <Tag>Level {question.level}</Tag>
        </Space>
      }
    >
      <Typography.Paragraph>{question.questionText}</Typography.Paragraph>
      <Radio.Group value={value} onChange={(event) => onChange(event.target.value)}>
        <Space direction="vertical">
          {question.options.map((option) => (
            <Radio key={option.id} value={option.id}>
              {option.optionText}
            </Radio>
          ))}
        </Space>
      </Radio.Group>
    </Card>
  );
}

function AssessmentResultView({
  result,
  onViewAnalysis,
  onViewRoadmap,
  onRestart,
}: {
  result: AssessmentSubmitResponse;
  onViewAnalysis: () => void;
  onViewRoadmap: () => void;
  onRestart: () => void;
}) {
  return (
    <>
      <PageHeader title="Assessment Result" />
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={onViewAnalysis}>Xem Competency Analysis</Button>
        <Button onClick={onViewRoadmap}>Xem Roadmap</Button>
        <Button onClick={onRestart}>Start Another Assessment</Button>
      </Space>
      <Table<AssessmentSkillResult>
        rowKey="skillId"
        dataSource={result.skillResults}
        expandable={{
          expandedRowRender: (record) => (
            <Table<LevelBreakdownRow>
              rowKey="level"
              pagination={false}
              dataSource={Object.entries(record.levelBreakdown).map(([level, stat]) => ({
                level,
                ...stat,
              }))}
              columns={[
                { title: 'Level', dataIndex: 'level' },
                { title: 'Total', dataIndex: 'total' },
                { title: 'Correct', dataIndex: 'correct' },
                { title: 'Percentage', render: (_: unknown, row) => `${row.percentage}%` },
              ]}
            />
          ),
        }}
        columns={[
          { title: 'Skill', dataIndex: 'skillName' },
          { title: 'Type', render: (_: unknown, row) => <SkillTypeTag type={row.skillType} /> },
          { title: 'Calculated Level', dataIndex: 'calculatedLevel' },
          { title: 'Total', dataIndex: 'totalQuestions' },
          { title: 'Correct', dataIndex: 'correctQuestions' },
          {
            title: 'Result',
            render: (_: unknown, row) =>
              row.calculatedLevel > 0 ? <Tag color="green">ACHIEVED</Tag> : <Tag color="red">NOT ACHIEVED</Tag>,
          },
        ]}
      />
    </>
  );
}

function SkillGroupList({
  groups,
}: {
  groups: SkillQuestionGroups;
}) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {SKILL_TYPES.filter((skillType) => groups[skillType]?.length).map((skillType) => (
        <div key={skillType}>
          <SkillTypeTag type={skillType} />
          <List
            size="small"
            dataSource={groups[skillType]}
            renderItem={(skill) => (
              <List.Item>
                <Typography.Text>{skill.skillName}</Typography.Text>
                <Tag>{skill.count}</Tag>
              </List.Item>
            )}
          />
        </div>
      ))}
    </Space>
  );
}

function SkillTypeTag({ type }: { type?: SkillType }) {
  return <Tag color={type === 'COMMON' ? 'blue' : 'green'}>{type ?? '-'}</Tag>;
}

type SkillQuestionGroups = Partial<
  Record<SkillType, Array<{ skillId: string; skillName: string; count: number }>>
>;

function groupQuestionsBySkillType(questions: AssessmentStartQuestion[]) {
  const groups: SkillQuestionGroups = {};

  for (const question of questions) {
    const list = groups[question.skillType] ?? [];
    const existing = list.find((skill) => skill.skillId === question.skillId);
    if (existing) {
      existing.count += 1;
    } else {
      list.push({
        skillId: question.skillId,
        skillName: question.skillName,
        count: 1,
      });
    }
    groups[question.skillType] = list;
  }

  return groups;
}

type LevelBreakdownRow = AssessmentLevelBreakdown & { level: string };

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}
