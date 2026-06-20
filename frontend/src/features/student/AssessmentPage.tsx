'use client';

import {
  Alert,
  App,
  Button,
  Card,
  Col,
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getData } from '@/lib/request';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import type { StudentProfile } from '@/types/domain';
import {
  startAssessment,
  submitAssessment,
  type AssessmentStartQuestion,
  type AssessmentStartResponse,
  type AssessmentSubmitResponse,
} from './assessment.service';

export function StudentAssessmentPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [started, setStarted] = useState<AssessmentStartResponse | null>(null);
  const [result, setResult] = useState<AssessmentSubmitResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const profile = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => getData<StudentProfile>('/profiles/me'),
  });

  const start = useMutation({
    mutationFn: (careerGoalId: string) => startAssessment(careerGoalId),
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
      message.success('Assessment submitted');
    },
  });

  const careerGoalId = profile.data?.careerGoalId;

  return (
    <QueryState loading={profile.isLoading} error={profile.error}>
      {!started ? (
        <StartAssessmentView
          careerGoalName={profile.data?.careerGoal?.name}
          hasCareerGoal={Boolean(careerGoalId)}
          loading={start.isPending}
          onStart={() => {
            if (!careerGoalId) {
              message.error('Please select a career goal before starting.');
              return;
            }
            start.mutate(careerGoalId);
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
  hasCareerGoal,
  loading,
  onStart,
}: {
  careerGoalName?: string | null;
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
              <div>
                <Typography.Text type="secondary">Career Goal</Typography.Text>
                <Typography.Title level={4} style={{ marginTop: 4, marginBottom: 0 }}>
                  {careerGoalName ?? 'No career goal selected'}
                </Typography.Title>
              </div>
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
  answers,
  submitting,
  onAnswer,
  onSubmit,
}: {
  assessment: AssessmentStartResponse;
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
      <Table
        rowKey="skillId"
        dataSource={result.skillResults}
        expandable={{
          expandedRowRender: (record) => (
            <Table
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
                { title: 'Percentage', render: (_: unknown, row: any) => `${row.percentage}%` },
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
  groups: Record<string, Array<{ skillId: string; skillName: string; count: number }>>;
}) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {Object.entries(groups).map(([skillType, skills]) => (
        <div key={skillType}>
          <SkillTypeTag type={skillType as any} />
          <List
            size="small"
            dataSource={skills}
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

function SkillTypeTag({ type }: { type?: string }) {
  return <Tag color={type === 'COMMON' ? 'blue' : 'green'}>{type ?? '-'}</Tag>;
}

function groupQuestionsBySkillType(questions: AssessmentStartQuestion[]) {
  const groups: Record<string, Array<{ skillId: string; skillName: string; count: number }>> = {};

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
