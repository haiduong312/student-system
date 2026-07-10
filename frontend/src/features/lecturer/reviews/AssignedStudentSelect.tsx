'use client';

import { Alert, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { studentsService } from '@/features/management/students.service';
import { getApiErrorMessage } from '@/lib/errors';
import type { Student } from '@/types/management';

export function AssignedStudentSelect({
  student,
  onChange,
}: {
  student: Student | null;
  onChange: (student: Student | null) => void;
}) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const query = useQuery({
    queryKey: ['lecturer', 'assigned-student-options', deferredSearch],
    queryFn: () =>
      studentsService.getStudents({
        page: 1,
        limit: 50,
        search: deferredSearch.trim() || undefined,
      }),
  });
  const students = query.data?.data ?? [];
  const options = students.map(toOption);
  if (student && !options.some((option) => option.value === student.id)) {
    options.unshift(toOption(student));
  }

  return (
    <>
      <Select<string>
        allowClear
        showSearch
        filterOption={false}
        data-testid="advisor-review-student-select"
        value={student?.id}
        placeholder="Search and select an assigned student"
        style={{ maxWidth: 560, width: '100%' }}
        loading={query.isFetching}
        options={options}
        notFoundContent={query.isFetching ? 'Loading...' : 'No assigned students found'}
        onSearch={setSearch}
        onChange={(studentId) => {
          if (!studentId) {
            setSearch('');
            onChange(null);
            return;
          }
          onChange(students.find((item) => item.id === studentId) ?? student);
        }}
      />
      {query.error ? (
        <Alert
          showIcon
          type="error"
          message={getApiErrorMessage(query.error)}
          style={{ marginTop: 12 }}
        />
      ) : null}
    </>
  );
}

function toOption(student: Student) {
  return {
    value: student.id,
    label: `${student.user.fullName} (${student.studentCode}) · ${student.className || 'No class'}`,
  };
}
