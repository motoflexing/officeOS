import type { LeaveRequest, Role, UserProfile } from '../types';

export const normalizeLeaveRequest = (request: LeaveRequest): LeaveRequest => {
  const requesterName = request.requesterName || request.employeeName;
  const requesterEmail = request.requesterEmail || request.employeeEmail;
  const requesterRole = request.requesterRole || inferRequesterRole(request);
  const createdAt = request.createdAt || request.submittedAt || request.date || new Date().toISOString();

  return {
    ...request,
    employeeName: request.employeeName || requesterName,
    employeeEmail: request.employeeEmail || requesterEmail,
    requesterName,
    requesterEmail,
    requesterRole,
    createdAt,
    submittedAt: request.submittedAt || createdAt,
  };
};

export const getOwnLeaveRequests = (requests: LeaveRequest[], profile: UserProfile) =>
  sortLeaveRequests(
    requests
      .map(normalizeLeaveRequest)
      .filter((request) => sameRequester(request, profile)),
  );

export const getReviewLeaveRequests = (requests: LeaveRequest[], reviewerRole: Role) =>
  sortLeaveRequests(
    requests
      .map(normalizeLeaveRequest)
      .filter((request) => {
        if (reviewerRole === 'Admin') return request.requesterRole === 'HR';
        if (reviewerRole === 'HR') return request.requesterRole === 'Employee';
        return false;
      }),
  );

export const canReviewLeaveRequest = (request: LeaveRequest, reviewer: UserProfile) => {
  const normalized = normalizeLeaveRequest(request);
  if (sameRequester(normalized, reviewer)) return false;
  if (reviewer.role === 'Admin') return normalized.requesterRole === 'HR';
  if (reviewer.role === 'HR') return normalized.requesterRole === 'Employee';
  return false;
};

export const getLeaveReviewTitle = (role: Role) => {
  if (role === 'Admin') return 'HR Leave Requests';
  if (role === 'HR') return 'Employee Leave Requests';
  return 'My Leave Requests';
};

export const sortLeaveRequests = (requests: LeaveRequest[]) =>
  [...requests].sort((first, second) => leaveTimestamp(second) - leaveTimestamp(first));

const sameRequester = (request: LeaveRequest, profile: UserProfile) => {
  const normalized = normalizeLeaveRequest(request);
  const requestEmail = normalized.requesterEmail || normalized.employeeEmail;
  if (requestEmail) return requestEmail.toLowerCase() === profile.email.toLowerCase();
  return (normalized.requesterName || normalized.employeeName) === profile.name;
};

const inferRequesterRole = (request: LeaveRequest): Role => {
  const identity = `${request.requesterRole || ''} ${request.requesterEmail || ''} ${request.employeeEmail || ''} ${
    request.requesterName || ''
  } ${request.employeeName || ''}`.toLowerCase();

  if (identity.includes('admin')) return 'Admin';
  if (identity.includes('hr')) return 'HR';
  return 'Employee';
};

const leaveTimestamp = (request: LeaveRequest) => {
  const value = request.createdAt || request.submittedAt || request.startDate || request.date || '';
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};
