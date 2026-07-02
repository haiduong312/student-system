'use client';

import { Form, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type {
  AdvisorAssignment,
  AssignmentStatus,
  CreateAdvisorAssignmentRequest,
  UpdateAdvisorAssignmentRequest,
} from '@/types/management';
import { LecturerSelect, StudentSelect } from './AdvisorEntitySelects';

interface AdvisorAssignmentFormValues {
  lecturerId: string;
  studentId: string;
  status: AssignmentStatus;
}

export type AdvisorAssignmentFormSubmission =
  | { mode: 'create'; payload: CreateAdvisorAssignmentRequest }
  | { mode: 'update'; assignmentId: string; payload: UpdateAdvisorAssignmentRequest };

export function AdvisorAssignmentFormModal({
  open,
  assignment,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  assignment: AdvisorAssignment | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (submission: AdvisorAssignmentFormSubmission) => void;
}) {
  const [form] = Form.useForm<AdvisorAssignmentFormValues>();
  const editing = Boolean(assignment);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(
      assignment
        ? {
            lecturerId: assignment.lecturerId,
            studentId: assignment.studentId,
            status: assignment.status,
          }
        : { status: 'ACTIVE' },
    );
  }, [assignment, form, open]);

  const submit = (values: AdvisorAssignmentFormValues) => {
    const payload: CreateAdvisorAssignmentRequest = {
      lecturerId: values.lecturerId,
      studentId: values.studentId,
      status: values.status,
    };
    onSubmit(
      assignment
        ? { mode: 'update', assignmentId: assignment.id, payload }
        : { mode: 'create', payload },
    );
  };

  return (
    <Modal
      title={editing ? 'Edit advisor assignment' : 'Create advisor assignment'}
      open={open}
      width={620}
      okText={editing ? 'Save changes' : 'Create assignment'}
      confirmLoading={submitting}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form<AdvisorAssignmentFormValues>
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={submit}
      >
        <Form.Item
          name="lecturerId"
          label="Lecturer / Advisor"
          rules={[{ required: true, message: 'Select a lecturer.' }]}
        >
          <LecturerSelect
            selectedLecturer={assignment?.lecturer}
            disabled={submitting}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          name="studentId"
          label="Student"
          rules={[{ required: true, message: 'Select a student.' }]}
        >
          <StudentSelect
            selectedStudent={assignment?.student}
            disabled={submitting}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: 'Select a status.' }]}
        >
          <Select<AssignmentStatus>
            disabled={submitting}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'INACTIVE', label: 'INACTIVE' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
