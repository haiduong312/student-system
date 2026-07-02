'use client';

import { Alert, App } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { usersService } from '@/features/management/users.service';
import { getApiErrorMessage } from '@/lib/errors';
import type {
  DeactivateUserResult,
  ReactivateUserResult,
  ResetPasswordRequest,
  UpdateUserRequest,
  User,
} from '@/types/management';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { UserDetailDrawer } from './UserDetailDrawer';
import { UserFilterBar, type UserFilters } from './UserFilterBar';
import { UserFormModal } from './UserFormModal';
import { UserTable } from './UserTable';

const DEFAULT_PAGE_SIZE = 10;

export function UserManagementPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<UserFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);

  const users = useQuery({
    queryKey: ['admin', 'users', 'list', filters, page, pageSize],
    queryFn: () => usersService.getUsers({ ...filters, page, limit: pageSize }),
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserRequest }) =>
      usersService.updateUser(userId, payload),
    onSuccess: () => {
      message.success('User updated.');
      setEditingUser(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const changeStatus = useMutation({
    mutationFn: ({ user }: { user: User }): Promise<DeactivateUserResult | ReactivateUserResult> =>
      user.status === 'ACTIVE'
        ? usersService.deactivateUser(user.id)
        : usersService.reactivateUser(user.id),
    onSuccess: (_result, { user }) => {
      message.success(user.status === 'ACTIVE' ? 'User deactivated.' : 'User reactivated.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const resetPassword = useMutation({
    mutationFn: ({
      user,
      payload,
    }: {
      user: User;
      payload: ResetPasswordRequest;
    }) => usersService.resetPassword(user.id, payload),
    onSuccess: () => {
      message.success('Password reset successfully.');
      setResetUser(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const confirmStatusChange = (user: User) => {
    const deactivating = user.status === 'ACTIVE';
    modal.confirm({
      title: `${deactivating ? 'Deactivate' : 'Reactivate'} user?`,
      content: `${user.fullName} (${user.email}) will be ${
        deactivating ? 'unable to sign in' : 'allowed to sign in again'
      }.`,
      okText: deactivating ? 'Deactivate' : 'Reactivate',
      okButtonProps: { danger: deactivating },
      onOk: () => changeStatus.mutateAsync({ user }).then(() => undefined),
    });
  };

  return (
    <>
      <PageHeader title="Users" description="Manage user accounts and access status." />
      <Alert
        showIcon
        type="info"
        message="New accounts are created through the Create Student or Create Lecturer functions."
        style={{ marginBottom: 16 }}
      />
      <UserFilterBar
        filters={filters}
        refreshing={users.isFetching}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        onRefresh={() => users.refetch()}
      />
      <QueryState loading={users.isLoading && !users.data} error={users.error}>
        <UserTable
          users={users.data?.data ?? []}
          loading={users.isFetching}
          page={page}
          pageSize={pageSize}
          total={users.data?.meta.total ?? 0}
          changingStatusId={changeStatus.isPending ? changeStatus.variables?.user.id : undefined}
          resettingId={resetPassword.isPending ? resetPassword.variables?.user.id : undefined}
          onPaginationChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
          }}
          onView={(user) => setDetailUserId(user.id)}
          onEdit={setEditingUser}
          onToggleStatus={confirmStatusChange}
          onResetPassword={setResetUser}
        />
      </QueryState>

      <UserFormModal
        open={Boolean(editingUser)}
        user={editingUser}
        submitting={updateUser.isPending}
        onCancel={() => {
          if (!updateUser.isPending) setEditingUser(null);
        }}
        onSubmit={(userId, payload) => {
          if (!updateUser.isPending) updateUser.mutate({ userId, payload });
        }}
      />
      <UserDetailDrawer
        userId={detailUserId}
        open={Boolean(detailUserId)}
        onClose={() => setDetailUserId(null)}
      />
      <ResetPasswordDialog
        user={resetUser}
        open={Boolean(resetUser)}
        submitting={resetPassword.isPending}
        onCancel={() => {
          if (!resetPassword.isPending) setResetUser(null);
        }}
        onSubmit={(_userId, payload) => {
          if (resetUser && !resetPassword.isPending) {
            resetPassword.mutate({ user: resetUser, payload });
          }
        }}
      />
    </>
  );
}
