'use client';

import { Form, Input, Modal, Rate } from 'antd';
import { useEffect } from 'react';
import type { CreateAdvisorReviewRequest, Student } from '@/types/management';

interface ReviewFormValues {
  reviewContent: string;
  suggestion?: string;
  rating?: number;
}

export function ReviewFormModal({
  open,
  student,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  student: Student | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateAdvisorReviewRequest) => void;
}) {
  const [form] = Form.useForm<ReviewFormValues>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open, student?.id]);

  return (
    <Modal
      title={student ? `Review ${student.user.fullName}` : 'Create advisor review'}
      open={open}
      width={680}
      okText="Create review"
      confirmLoading={submitting}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form<ReviewFormValues>
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={(values) =>
          onSubmit({
            reviewContent: values.reviewContent.trim(),
            suggestion: values.suggestion?.trim() || null,
            rating: values.rating || null,
          })
        }
      >
        <Form.Item
          name="reviewContent"
          label="Review"
          rules={[{ required: true, whitespace: true, message: 'Review content is required.' }]}
        >
          <Input.TextArea rows={6} placeholder="Assessment of the student's current progress..." />
        </Form.Item>
        <Form.Item name="suggestion" label="Suggestion">
          <Input.TextArea rows={4} placeholder="Recommended next steps..." />
        </Form.Item>
        <Form.Item name="rating" label="Rating" extra="Optional, from 1 to 5 stars.">
          <Rate disabled={submitting} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
