import { authorize } from '../src/middleware/authorize';
import { ForbiddenError } from '../src/lib/errors';

function mockReqRes(permissions: string[]) {
  const req: any = { user: { userId: 'u1', roles: [], permissions } };
  const res: any = {};
  const next = jest.fn();
  return { req, res, next };
}

describe('authorize middleware', () => {
  it('calls next() when permission present', () => {
    const { req, res, next } = mockReqRes(['user.create']);
    authorize('user.create')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
  it('throws ForbiddenError when permission missing', () => {
    const { req, res, next } = mockReqRes(['other.perm']);
    authorize('user.create')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
