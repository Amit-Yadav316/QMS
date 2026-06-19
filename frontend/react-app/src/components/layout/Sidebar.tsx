import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  BarChart2,
  FileText,
  TestTube,
  Link as LinkIcon,
  Scan,
  AlertTriangle,
  FileBarChart,
  Truck,
  Building,
  Users,
  MessageCircle,
  LogOut,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { initials, roleLabel } from '../../lib/initials';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, organisation, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="qms-sidebar">
      <div className="qms-sidebar-top">
        <div className="qms-logo">
          <div className="qms-logo-icon">QM</div>
          <div>
            <div className="qms-logo-text">QMS</div>
            <div className="qms-logo-sub">Quality management</div>
          </div>
        </div>
        <div className="qms-project-badge">
          {organisation?.org_name ?? 'Your organisation'}
          <span>{roleLabel(organisation?.org_type) || '—'} · {organisation?.status ?? ''}</span>
        </div>
      </div>

      <nav className="qms-nav">
        <div className="qms-nav-section">Overview</div>
        <NavLink to="/app" end className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <Home size={18} /> Dashboard
        </NavLink>
        <NavLink to="/app/analytics" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <BarChart2 size={18} /> Analytics
        </NavLink>
        <NavLink to="/app/documents" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={18} /> Documents
        </NavLink>

        <div className="qms-nav-section">Operations</div>
        <NavLink to="/app/pours/new" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={18} /> Pour cards
        </NavLink>
        <NavLink to="/app/results/1" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <TestTube size={18} /> Cube results
        </NavLink>
        <NavLink to="/app/trace" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <LinkIcon size={18} /> Traceability
        </NavLink>
        <NavLink to="/app/gate" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <Scan size={18} /> Gate scan
        </NavLink>

        <div className="qms-nav-section">Quality</div>
        <NavLink to="/app/ncr" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <AlertTriangle size={18} /> NCR <span className="qms-nav-badge">3</span>
        </NavLink>
        <NavLink to="/app/audits" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <CheckSquare size={18} /> Audits
        </NavLink>
        <NavLink to="/app/reports" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <FileBarChart size={18} /> Reports
        </NavLink>

        <div className="qms-nav-section">Setup</div>
        <NavLink to="/app/suppliers" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <Truck size={18} /> Suppliers
        </NavLink>
        <NavLink to="/app/labs" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <Building size={18} /> Laboratories
        </NavLink>
        <NavLink to="/app/team" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <Users size={18} /> Team
        </NavLink>

        <div className="qms-nav-section">AI</div>
        <NavLink to="/app/chatbot" className={({ isActive }) => `qms-nav-item ${isActive ? 'active' : ''}`}>
          <MessageCircle size={18} /> QMS assistant
        </NavLink>
      </nav>

      <div className="qms-sidebar-bottom">
        <div className="qms-user-row">
          <div className="qms-avatar">{initials(user?.full_name)}</div>
          <div>
            <div className="qms-user-name">{user?.full_name ?? 'Not signed in'}</div>
            <div className="qms-user-role">{roleLabel(user?.role)}</div>
          </div>
          <LogOut
            size={16}
            className="qms-settings-icon"
            role="button"
            aria-label="Log out"
            onClick={handleLogout}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>
    </aside>
  );
};
