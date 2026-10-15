import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Wrapper that guards routes behind authentication.
 *
 * Props:
 *  - children: node          — the protected content
 *  - adminOnly: boolean      — if true, only admin users may access
 *  - roles: string[]         — if provided, user.role must be in this list
 *  - adminRoles: string[]    — if provided, admin.role (e.g. main_admin) must be in this list;
 *                              used for fine-grained gates inside the /admin section
 *  - employerOnly: boolean   — only a signed-in job board employer may access
 *  - memberOnly: boolean     — only a signed-in member may access (keeps employers
 *                              out of /portal, which would otherwise let any session in)
 *
 * Works with the AuthContext which exposes:
 *  - user / admin   — the logged-in entity (one will be set)
 *  - isAdmin        — boolean shortcut
 *  - loading        — true while the initial auth check runs
 */
const ProtectedRoute = ({ children, adminOnly = false, roles, adminRoles, employerOnly = false, memberOnly = false }) => {
  const { user, admin, employer, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  // Employer area: its own sign-in page
  if (employerOnly) {
    if (!employer) return <Navigate to="/employers/sign-in" state={{ from: location }} replace />;
    return children;
  }

  // Not logged in at all — redirect to login, preserving intended destination
  if (!user && !admin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (memberOnly && !user) {
    return <Navigate to={admin ? '/admin' : '/login'} replace />;
  }

  // Admin-only gate
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Role-based gate (checks user.role if it exists)
  if (roles && roles.length > 0) {
    const currentRole = admin ? 'admin' : user?.role;
    if (!currentRole || !roles.includes(currentRole)) {
      return <Navigate to="/" replace />;
    }
  }

  // Admin-role gate (checks admin.role specifically — e.g. ['main_admin'])
  if (adminRoles && adminRoles.length > 0) {
    if (!admin || !adminRoles.includes(admin.role)) {
      return <Navigate to="/admin" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
