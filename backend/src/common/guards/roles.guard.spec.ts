import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RolesGuard } from './roles.guard';

const contextWithRole = (role: UserRole) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { role } }),
    }),
  }) as ExecutionContext;

describe('RolesGuard authorization', () => {
  it('does not let students call admin-only routes', () => {
    const guard = new RolesGuard({
      getAllAndOverride: () => [UserRole.ADMIN],
    } as any);

    assert.equal(guard.canActivate(contextWithRole(UserRole.STUDENT)), false);
    assert.equal(guard.canActivate(contextWithRole(UserRole.ADMIN)), true);
  });

  it('allows routes with no role metadata to continue after authentication', () => {
    const guard = new RolesGuard({
      getAllAndOverride: () => undefined,
    } as any);

    assert.equal(guard.canActivate(contextWithRole(UserRole.STUDENT)), true);
  });
});
