"use client";

import {
    Alert,
    App,
    Button,
    Card,
    Col,
    Descriptions,
    Empty,
    List,
    Pagination,
    Progress,
    Radio,
    Row,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import type { AssessmentCooldown, SkillType } from "@/types/domain";
import { ASSESSMENT_IN_PROGRESS_STATUS, SKILL_TYPES } from "@/types/domain";
import {
    invalidateStudentCurrentContextQueries,
    studentQueryKeys,
    useCurrentProfileContext,
} from "./profile-context";
import {
    startAssessment,
    submitAssessment,
    type AssessmentLevelBreakdown,
    type AssessmentSkillResult,
    type AssessmentStartQuestion,
    type AssessmentStartResponse,
    type AssessmentSubmitResponse,
} from "./assessment.service";

const ASSESSMENT_QUESTIONS_PER_PAGE = 20;

export function StudentAssessmentPage() {
    const { message, modal } = App.useApp();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [started, setStarted] = useState<AssessmentStartResponse | null>(
        null,
    );
    const [result, setResult] = useState<AssessmentSubmitResponse | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const context = useCurrentProfileContext();
    const startedMatchesContext = started
        ? isAssessmentInCurrentContext(
              started,
              context.careerGoalId,
              context.specializationId,
          )
        : true;

    const start = useMutation({
        mutationKey: studentQueryKeys.assessmentStart(context.scopeKey),
        mutationFn: () => startAssessment(),
        onSuccess: (data) => {
            setStarted(data);
            setResult(null);
            setAnswers({});
            message.success("Assessment started");
        },
        onError: (error) => message.error(getApiErrorMessage(error)),
    });
    const submit = useMutation({
        mutationFn: () => {
            if (!started) {
                throw new Error("Assessment has not started");
            }
            if (
                !isAssessmentInCurrentContext(
                    started,
                    context.careerGoalId,
                    context.specializationId,
                )
            ) {
                throw new Error(
                    "Assessment does not match the current career goal or specialization",
                );
            }

            return submitAssessment(
                started.assessmentId,
                buildAssessmentAnswers(started, answers),
            );
        },
        onSuccess: (data) => {
            setResult(data);
            invalidateStudentCurrentContextQueries(queryClient);
            message.success("Assessment submitted");
        },
        onError: (error) => message.error(getApiErrorMessage(error)),
    });

    useEffect(() => {
        setStarted(null);
        setResult(null);
        setAnswers({});
    }, [context.careerGoalId, context.specializationId]);

    return (
        <QueryState loading={context.loading} error={context.error}>
            {!started ? (
                <StartAssessmentView
                    careerGoalName={context.careerGoalName}
                    specializationName={context.specializationName}
                    hasCareerGoal={context.hasCareerGoal}
                    isContextReady={context.isContextReady}
                    loading={start.isPending}
                    onStart={() => {
                        if (!context.isContextReady) {
                            message.error(
                                "Please select a career goal before starting.",
                            );
                            return;
                        }
                        start.mutate();
                    }}
                />
            ) : result ? (
                <AssessmentResultView
                    result={result}
                    onViewAnalysis={() => router.push("/student/analysis")}
                    onViewRoadmap={() => router.push("/student/roadmap")}
                    onRestart={() => {
                        setStarted(null);
                        setResult(null);
                        setAnswers({});
                    }}
                />
            ) : (
                <AssessmentQuizView
                    assessment={started}
                    careerGoalName={context.careerGoalName}
                    specializationName={context.specializationName}
                    answers={answers}
                    submitting={submit.isPending}
                    canSubmit={startedMatchesContext && !submit.isPending}
                    onAnswer={(questionId, selectedOptionId) =>
                        setAnswers((current) => ({
                            ...current,
                            [questionId]: selectedOptionId,
                        }))
                    }
                    onSubmit={() => {
                        if (submit.isPending) {
                            return;
                        }
                        if (!startedMatchesContext) {
                            message.error(
                                "This assessment no longer matches the current profile context.",
                            );
                            return;
                        }
                        const answeredCount = started.questions.filter(
                            (question) => answers[question.id],
                        ).length;
                        if (answeredCount < started.questions.length) {
                            message.error(
                                "Please answer all questions before submitting.",
                            );
                            return;
                        }

                        modal.confirm({
                            title: "Submit assessment?",
                            content:
                                "Your answers will be graded and used to update your skill levels.",
                            okText: "Submit",
                            onOk: () => submit.mutateAsync(),
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
    isContextReady,
    loading,
    onStart,
}: {
    careerGoalName?: string | null;
    specializationName?: string | null;
    hasCareerGoal: boolean;
    isContextReady: boolean;
    loading: boolean;
    onStart: () => void;
}) {
    return (
        <>
            <PageHeader title="Assessment" />
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card>
                        <Space
                            direction="vertical"
                            size={16}
                            style={{ width: "100%" }}
                        >
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Career Goal">
                                    {careerGoalName ??
                                        "No career goal selected"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Specialization">
                                    {specializationName ?? "General"}
                                </Descriptions.Item>
                            </Descriptions>

                            {!isContextReady ? (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message={
                                        hasCareerGoal
                                            ? "Current profile context is not ready yet."
                                            : "Please select a career goal in your profile before starting."
                                    }
                                />
                            ) : null}
                            <Button
                                type="primary"
                                size="large"
                                loading={loading}
                                disabled={!isContextReady}
                                data-testid="assessment-start-button"
                                onClick={onStart}
                            >
                                Start Assessment
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
    canSubmit,
    onAnswer,
    onSubmit,
}: {
    assessment: AssessmentStartResponse;
    careerGoalName?: string | null;
    specializationName?: string | null;
    answers: Record<string, string>;
    submitting: boolean;
    canSubmit: boolean;
    onAnswer: (questionId: string, selectedOptionId: string) => void;
    onSubmit: () => void;
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const questionListTopRef = useRef<HTMLDivElement>(null);
    const answeredCount = assessment.questions.filter(
        (question) => answers[question.id],
    ).length;
    const percent = Math.round(
        (answeredCount / assessment.questions.length) * 100,
    );
    const status = assessment.status ?? ASSESSMENT_IN_PROGRESS_STATUS;
    const remainingTime = useCountdown(assessment.expiresAt);
    const groupedSkills = useMemo(
        () => groupQuestionsBySkillType(assessment.questions),
        [assessment.questions],
    );
    const pageStartIndex =
        (currentPage - 1) * ASSESSMENT_QUESTIONS_PER_PAGE;
    const visibleQuestions = assessment.questions.slice(
        pageStartIndex,
        pageStartIndex + ASSESSMENT_QUESTIONS_PER_PAGE,
    );

    const changePage = (page: number) => {
        setCurrentPage(page);
        requestAnimationFrame(() => {
            questionListTopRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    return (
        <>
            <PageHeader title="Assessment Quiz" />
            <Card style={{ marginBottom: 16 }}>
                <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
                    <Descriptions.Item label="Status">
                        <Tag color="processing">{status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Career Goal">
                        {careerGoalName ?? assessment.careerGoalId}
                    </Descriptions.Item>
                    <Descriptions.Item label="Specialization">
                        {specializationName ??
                            (assessment.specializationId
                                ? assessment.specializationId
                                : "General")}
                    </Descriptions.Item>
                    <Descriptions.Item label="Started At">
                        {formatDateTime(assessment.startedAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Expires At">
                        {formatDateTime(assessment.expiresAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Time Remaining">
                        {remainingTime}
                    </Descriptions.Item>
                    {assessment.attemptPolicy ? (
                        <Descriptions.Item label="Attempt Policy" span={2}>
                            Max {assessment.attemptPolicy.maxAttempts} attempts
                            · Cooldown{" "}
                            {assessment.attemptPolicy.cooldownMinutes} min ·
                            Time limit{" "}
                            {assessment.attemptPolicy.timeLimitMinutes} min
                        </Descriptions.Item>
                    ) : null}
                    {assessment.cooldown ? (
                        <Descriptions.Item label="Cooldown" span={2}>
                            {formatCooldown(assessment.cooldown)}
                        </Descriptions.Item>
                    ) : null}
                </Descriptions>
            </Card>
            {!canSubmit ? (
                <Alert
                    showIcon
                    type="warning"
                    style={{ marginBottom: 16 }}
                    message="This assessment cannot be submitted for the current profile context."
                />
            ) : null}
            {assessment.warnings.length ? (
                <Alert
                    showIcon
                    type="warning"
                    style={{ marginBottom: 16 }}
                    message="Some skills do not have enough active questions."
                    description={assessment.warnings
                        .map(
                            (warning) =>
                                `${warning.skillName}: ${warning.message}`,
                        )
                        .join(", ")}
                />
            ) : null}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={7}>
                    <Card title="Progress">
                        <Progress percent={percent} />
                        <Typography.Text>
                            {answeredCount}/{assessment.questions.length}{" "}
                            answered
                        </Typography.Text>
                    </Card>
                    <Card title="Skill Groups" style={{ marginTop: 16 }}>
                        <SkillGroupList groups={groupedSkills} />
                    </Card>
                </Col>
                <Col xs={24} lg={17}>
                    <div ref={questionListTopRef} />
                    <Space
                        direction="vertical"
                        size={16}
                        style={{ width: "100%" }}
                    >
                        <AssessmentQuestionPagination
                            currentPage={currentPage}
                            totalQuestions={assessment.questions.length}
                            onChange={changePage}
                        />
                        {visibleQuestions.map((question, index) => (
                            <QuestionCard
                                key={question.id}
                                index={pageStartIndex + index}
                                question={question}
                                value={answers[question.id]}
                                onChange={(selectedOptionId) =>
                                    onAnswer(question.id, selectedOptionId)
                                }
                            />
                        ))}
                        <AssessmentQuestionPagination
                            currentPage={currentPage}
                            totalQuestions={assessment.questions.length}
                            onChange={changePage}
                        />
                        <Card>
                            <Button
                                type="primary"
                                size="large"
                                loading={submitting}
                                disabled={
                                    submitting ||
                                    !canSubmit ||
                                    answeredCount < assessment.questions.length
                                }
                                data-testid="assessment-submit-button"
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

function AssessmentQuestionPagination({
    currentPage,
    totalQuestions,
    onChange,
}: {
    currentPage: number;
    totalQuestions: number;
    onChange: (page: number) => void;
}) {
    if (totalQuestions <= ASSESSMENT_QUESTIONS_PER_PAGE) {
        return null;
    }

    return (
        <Card size="small">
            <Pagination
                current={currentPage}
                pageSize={ASSESSMENT_QUESTIONS_PER_PAGE}
                total={totalQuestions}
                showSizeChanger={false}
                responsive
                showTotal={(total, range) =>
                    `Questions ${range[0]}-${range[1]} of ${total}`
                }
                onChange={onChange}
            />
        </Card>
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
            role="group"
            aria-label={`Question ${index + 1}: ${question.questionText}`}
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
            <Radio.Group
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
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
                <Button type="primary" onClick={onViewAnalysis}>
                    View Competency Analysis
                </Button>
                <Button onClick={onViewRoadmap}>View Roadmap</Button>
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
                            dataSource={Object.entries(
                                record.levelBreakdown,
                            ).map(([level, stat]) => ({
                                level,
                                ...stat,
                            }))}
                            columns={[
                                { title: "Level", dataIndex: "level" },
                                { title: "Total", dataIndex: "total" },
                                { title: "Correct", dataIndex: "correct" },
                                {
                                    title: "Percentage",
                                    render: (_: unknown, row) =>
                                        `${row.percentage}%`,
                                },
                            ]}
                        />
                    ),
                }}
                columns={[
                    { title: "Skill", dataIndex: "skillName" },
                    {
                        title: "Type",
                        render: (_: unknown, row) => (
                            <SkillTypeTag type={row.skillType} />
                        ),
                    },
                    { title: "Calculated Level", dataIndex: "calculatedLevel" },
                    { title: "Total", dataIndex: "totalQuestions" },
                    { title: "Correct", dataIndex: "correctQuestions" },
                    {
                        title: "Result",
                        render: (_: unknown, row) =>
                            row.calculatedLevel > 0 ? (
                                <Tag color="green">ACHIEVED</Tag>
                            ) : (
                                <Tag color="red">NOT ACHIEVED</Tag>
                            ),
                    },
                ]}
            />
        </>
    );
}

function SkillGroupList({ groups }: { groups: SkillQuestionGroups }) {
    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            {SKILL_TYPES.filter((skillType) => groups[skillType]?.length).map(
                (skillType) => (
                    <div key={skillType}>
                        <SkillTypeTag type={skillType} />
                        <List
                            size="small"
                            dataSource={groups[skillType]}
                            renderItem={(skill) => (
                                <List.Item>
                                    <Typography.Text>
                                        {skill.skillName}
                                    </Typography.Text>
                                    <Tag>{skill.count}</Tag>
                                </List.Item>
                            )}
                        />
                    </div>
                ),
            )}
        </Space>
    );
}

function SkillTypeTag({ type }: { type?: SkillType }) {
    return (
        <Tag color={type === "COMMON" ? "blue" : "green"}>{type ?? "-"}</Tag>
    );
}

type SkillQuestionGroups = Partial<
    Record<
        SkillType,
        Array<{ skillId: string; skillName: string; count: number }>
    >
>;

function groupQuestionsBySkillType(questions: AssessmentStartQuestion[]) {
    const groups: SkillQuestionGroups = {};

    for (const question of questions) {
        const list = groups[question.skillType] ?? [];
        const existing = list.find(
            (skill) => skill.skillId === question.skillId,
        );
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

function buildAssessmentAnswers(
    assessment: AssessmentStartResponse,
    answers: Record<string, string>,
) {
    return assessment.questions.map((question) => {
        const selectedOptionId = answers[question.id];
        if (!selectedOptionId) {
            throw new Error("Please answer all questions before submitting.");
        }
        const belongsToQuestion = question.options.some(
            (option) => option.id === selectedOptionId,
        );
        if (!belongsToQuestion) {
            throw new Error(
                "Selected option does not belong to this assessment question.",
            );
        }

        return {
            questionId: question.id,
            selectedOptionId,
        };
    });
}

function isAssessmentInCurrentContext(
    assessment: AssessmentStartResponse,
    careerGoalId?: string | null,
    specializationId?: string | null,
) {
    return (
        assessment.careerGoalId === careerGoalId &&
        (assessment.specializationId ?? null) === (specializationId ?? null)
    );
}

function useCountdown(expiresAt?: string) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    if (!expiresAt) {
        return "-";
    }

    const remainingMs = new Date(expiresAt).getTime() - now;
    if (remainingMs <= 0) {
        return "Expired";
    }

    return formatDuration(remainingMs);
}

function formatDuration(milliseconds: number) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatCooldown(cooldown: AssessmentCooldown) {
    if (cooldown.message) {
        return cooldown.message;
    }
    if (cooldown.nextAllowedAt) {
        return `Next attempt after ${formatDateTime(cooldown.nextAllowedAt)}`;
    }
    if (cooldown.remainingMinutes !== undefined) {
        return `${cooldown.remainingMinutes} minutes remaining`;
    }
    if (cooldown.remainingSeconds !== undefined) {
        return formatDuration(cooldown.remainingSeconds * 1000);
    }

    return "-";
}

function formatDateTime(value?: string) {
    return value ? new Date(value).toLocaleString() : "-";
}
