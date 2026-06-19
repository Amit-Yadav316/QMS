import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Bell, FolderPlus, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../lib/initials';
import './Topbar.css';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="qms-topbar">
      <div className="qms-page-title">{title}</div>
      <div className="qms-topbar-actions">
        <Button variant="outline" size="sm" icon={<FolderPlus size={14} />} onClick={() => navigate('/app/projects/new')}>
          Register project
        </Button>
        <Button variant="outline" size="sm" icon={<Download size={14} />}>
          Export
        </Button>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => navigate('/app/pours/new')}>
          New pour card
        </Button>
        
        <div className="qms-notif-btn">
          <Bell size={18} color="var(--gray-500)" />
          <div className="qms-notif-dot"></div>
        </div>

        <div className="qms-avatar qms-avatar--clickable" title={user?.full_name ?? ''}>
          {initials(user?.full_name)}
        </div>
        <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </header>
  );
};
