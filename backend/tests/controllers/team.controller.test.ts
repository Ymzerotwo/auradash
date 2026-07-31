import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TeamController } from '../../src/controllers/team.controller';
import { TeamService } from '../../src/services/team.services';

describe('TeamController', () => {
  let mockContext: any;
  let getAllSpy: any;
  let getStatsSpy: any;
  let getByIdSpy: any;
  let createSpy: any;
  let updateSpy: any;
  let toggleStatusSpy: any;
  let deleteSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getAllSpy = vi.spyOn(TeamService, 'getAll');
    getStatsSpy = vi.spyOn(TeamService, 'getStats');
    getByIdSpy = vi.spyOn(TeamService, 'getById');
    createSpy = vi.spyOn(TeamService, 'create');
    updateSpy = vi.spyOn(TeamService, 'update');
    toggleStatusSpy = vi.spyOn(TeamService, 'toggleStatus');
    deleteSpy = vi.spyOn(TeamService, 'delete');

    mockContext = {
      req: {
        url: 'http://localhost/api/team',
        query: vi.fn(),
        param: vi.fn(),
        valid: vi.fn()
      },
      env: {
        DB: {},
        K1: {}
      },
      get: vi.fn().mockImplementation((key) => {
        if (key === 'requestId') return 'test-request-id';
        if (key === 'user') return { id: 'admin-id', role: 'Admin' };
        return null;
      }),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should retrieve team list successfully', async () => {
      mockContext.req.query.mockImplementation((key: string) => {
        if (key === 'search') return 'john';
        if (key === 'page') return '1';
        if (key === 'limit') return '10';
        if (key === 'status') return 'active';
        return '';
      });
      
      getAllSpy.mockResolvedValue({
        team: [{ id: '1', full_name: 'John Doe' }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
      });

      const response: any = await TeamController.getAll(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.slug).toBe('TEAM_FETCHED');
      expect(response.data.data.team).toHaveLength(1);
      expect(getAllSpy).toHaveBeenCalledWith(
        mockContext.env.DB,
        'john',
        '1',
        '10',
        'active',
        { id: 'admin-id', role: 'Admin' }
      );
    });

    it('should return 500 error if TeamService.getAll throws', async () => {
      mockContext.req.query.mockReturnValue('');
      getAllSpy.mockRejectedValue(new Error('DB Error'));

      const response: any = await TeamController.getAll(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('getStats', () => {
    it('should retrieve stats successfully', async () => {
      const statsObj = { totalMembers: 5, activeMembers: 4, suspendedMembers: 1, adminsCount: 1 };
      getStatsSpy.mockResolvedValue(statsObj);

      const response: any = await TeamController.getStats(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.slug).toBe('TEAM_STATS_FETCHED');
      expect(response.data.data.stats).toEqual(statsObj);
    });

    it('should return 500 error if TeamService.getStats throws', async () => {
      getStatsSpy.mockRejectedValue(new Error('DB Error'));

      const response: any = await TeamController.getStats(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('getById', () => {
    it('should retrieve a team member by id successfully', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      getByIdSpy.mockResolvedValue({
        member: { id: 'user-id', full_name: 'John Doe' }
      });

      const response: any = await TeamController.getById(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.slug).toBe('TEAM_MEMBER_FETCHED');
      expect(response.data.data.member.full_name).toBe('John Doe');
    });

    it('should return error if TeamService.getById returns an error status', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      getByIdSpy.mockResolvedValue({
        error: 'FORBIDDEN',
        message: 'You do not have permission',
        status: 403
      });

      const response: any = await TeamController.getById(mockContext);
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.slug).toBe('FORBIDDEN');
    });

    it('should return 500 error if TeamService.getById throws', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      getByIdSpy.mockRejectedValue(new Error('Unknown error'));

      const response: any = await TeamController.getById(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
    });
  });

  describe('create', () => {
    it('should create team member successfully', async () => {
      const payload = { username: 'ahmed', email: 'ahmed@test.com' };
      mockContext.req.valid.mockReturnValue(payload);
      createSpy.mockResolvedValue({ id: 'new-user-id' });

      const response: any = await TeamController.create(mockContext);
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.slug).toBe('TEAM_MEMBER_CREATED');
      expect(response.data.data.id).toBe('new-user-id');
      expect(createSpy).toHaveBeenCalledWith(
        mockContext.env.DB,
        payload,
        mockContext.env.K1,
        { id: 'admin-id', role: 'Admin' }
      );
    });

    it('should return error if TeamService.create returns a service error', async () => {
      mockContext.req.valid.mockReturnValue({});
      createSpy.mockResolvedValue({
        error: 'CANNOT_CREATE_ADMIN',
        message: 'Cannot create admin account',
        status: 403
      });

      const response: any = await TeamController.create(mockContext);
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.slug).toBe('CANNOT_CREATE_ADMIN');
    });
  });

  describe('update', () => {
    it('should update team member successfully', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      const payload = { full_name: 'New Name' };
      mockContext.req.valid.mockReturnValue(payload);
      updateSpy.mockResolvedValue({ success: true });

      const response: any = await TeamController.update(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.slug).toBe('TEAM_MEMBER_UPDATED');
    });

    it('should return error if TeamService.update returns an error', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      mockContext.req.valid.mockReturnValue({});
      updateSpy.mockResolvedValue({
        error: 'LAST_ADMIN',
        message: 'Cannot demote the last administrator',
        status: 400
      });

      const response: any = await TeamController.update(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.slug).toBe('LAST_ADMIN');
    });
  });

  describe('toggleStatus', () => {
    it('should toggle status successfully', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      const payload = { is_banned: true };
      mockContext.req.valid.mockReturnValue(payload);
      toggleStatusSpy.mockResolvedValue({ success: true });

      const response: any = await TeamController.toggleStatus(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.slug).toBe('TEAM_MEMBER_STATUS_UPDATED');
    });

    it('should return error if TeamService.toggleStatus returns an error', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      mockContext.req.valid.mockReturnValue({ is_banned: true });
      toggleStatusSpy.mockResolvedValue({
        error: 'LAST_ADMIN',
        message: 'Cannot ban the last administrator',
        status: 400
      });

      const response: any = await TeamController.toggleStatus(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.slug).toBe('LAST_ADMIN');
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      deleteSpy.mockResolvedValue({ success: true });

      const response: any = await TeamController.delete(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.slug).toBe('TEAM_MEMBER_DELETED');
    });

    it('should return error if TeamService.delete returns an error', async () => {
      mockContext.req.param.mockReturnValue('user-id');
      deleteSpy.mockResolvedValue({
        error: 'USER_HAS_OPERATIONS',
        message: 'This user is linked to operations',
        status: 400
      });

      const response: any = await TeamController.delete(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.slug).toBe('USER_HAS_OPERATIONS');
    });
  });
});
