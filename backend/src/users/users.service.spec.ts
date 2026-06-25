import { UsersService } from './users.service';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('UsersService sensitive field selection', () => {
  it('does not select password or refresh token hashes for admin user detail responses', async () => {
    let selectArg: any;
    const service = new UsersService(
      {
        user: {
          findUnique: async ({ select }: any) => {
            selectArg = select;
            return {
              id: 'user-1',
              fullName: 'Student A',
              email: 'student-a@example.edu',
              student: null,
              lecturer: null,
            };
          },
        },
      } as any,
      {} as any,
    );

    await service.findOneForAdmin('user-1');

    assert.equal(selectArg.passwordHash, undefined);
    assert.equal(selectArg.refreshTokenHash, undefined);
    assert.equal(selectArg.id, true);
    assert.equal(selectArg.email, true);
  });
});
