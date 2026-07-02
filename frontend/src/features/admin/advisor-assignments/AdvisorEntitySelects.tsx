'use client';

import { Select } from 'antd';
import { useDeferredValue, useState } from 'react';
import { lecturersService } from '@/features/management/lecturers.service';
import { studentsService } from '@/features/management/students.service';
import { useQuery } from '@tanstack/react-query';
import type {
  Lecturer,
  LecturerReference,
  Student,
  StudentReference,
} from '@/types/management';

interface EntitySelectProps {
  value?: string;
  allowClear?: boolean;
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  onChange?: (value?: string) => void;
}

export function LecturerSelect({
  selectedLecturer,
  placeholder = 'Select lecturer',
  onChange,
  ...props
}: EntitySelectProps & { selectedLecturer?: Lecturer | LecturerReference | null }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const query = useQuery({
    queryKey: ['management-options', 'lecturers', deferredSearch],
    queryFn: () =>
      lecturersService.getLecturers({
        page: 1,
        limit: 50,
        search: deferredSearch.trim() || undefined,
      }),
  });
  const options = mergeOption(
    query.data?.data.map(toLecturerOption) ?? [],
    selectedLecturer ? toLecturerOption(selectedLecturer) : undefined,
  );

  return (
    <Select<string>
      {...props}
      showSearch
      filterOption={false}
      placeholder={placeholder}
      loading={query.isFetching}
      options={options}
      notFoundContent={query.isFetching ? 'Loading...' : 'No lecturers found'}
      onSearch={setSearch}
      onChange={(value) => {
        if (!value) setSearch('');
        onChange?.(value);
      }}
    />
  );
}

export function StudentSelect({
  selectedStudent,
  placeholder = 'Select student',
  onChange,
  ...props
}: EntitySelectProps & { selectedStudent?: Student | StudentReference | null }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const query = useQuery({
    queryKey: ['management-options', 'students', deferredSearch],
    queryFn: () =>
      studentsService.getStudents({
        page: 1,
        limit: 50,
        search: deferredSearch.trim() || undefined,
      }),
  });
  const options = mergeOption(
    query.data?.data.map(toStudentOption) ?? [],
    selectedStudent ? toStudentOption(selectedStudent) : undefined,
  );

  return (
    <Select<string>
      {...props}
      showSearch
      filterOption={false}
      placeholder={placeholder}
      loading={query.isFetching}
      options={options}
      notFoundContent={query.isFetching ? 'Loading...' : 'No students found'}
      onSearch={setSearch}
      onChange={(value) => {
        if (!value) setSearch('');
        onChange?.(value);
      }}
    />
  );
}

interface EntityOption {
  value: string;
  label: string;
}

function toLecturerOption(lecturer: Lecturer | LecturerReference): EntityOption {
  const status = 'status' in lecturer.user && lecturer.user.status === 'INACTIVE'
    ? ' · INACTIVE'
    : '';
  return {
    value: lecturer.id,
    label: `${lecturer.user.fullName} (${lecturer.lecturerCode})${status}`,
  };
}

function toStudentOption(student: Student | StudentReference): EntityOption {
  const status = 'status' in student.user && student.user.status === 'INACTIVE'
    ? ' · INACTIVE'
    : '';
  return {
    value: student.id,
    label: `${student.user.fullName} (${student.studentCode})${status}`,
  };
}

function mergeOption(options: EntityOption[], selected?: EntityOption) {
  if (!selected || options.some((option) => option.value === selected.value)) {
    return options;
  }
  return [selected, ...options];
}
