import React from 'react';
import { 
  Building2, 
  Truck, 
  QrCode, 
  FileText, 
  Box, 
  TestTube, 
  ShieldCheck, 
  LayoutDashboard,
  CheckCircle,
  Bell
} from 'lucide-react';
import './AnimatedHeroVisual.css';

export const AnimatedHeroVisual: React.FC = () => {
  return (
    <div className="ahv-container">
      {/* BACKGROUND ELEMENTS */}
      <div className="ahv-grid-bg"></div>
      
      {/* PATH & PULSE */}
      <svg className="ahv-svg-path" viewBox="0 0 500 500" preserveAspectRatio="none">
        {/* Background track */}
        <path d="M 50 100 L 450 100 A 30 30 0 0 1 480 130 L 480 220 A 30 30 0 0 1 450 250 L 50 250 A 30 30 0 0 0 20 280 L 20 370 A 30 30 0 0 0 50 400 L 250 400" 
              fill="none" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Glowing animated line */}
        <path className="ahv-glow-path" d="M 50 100 L 450 100 A 30 30 0 0 1 480 130 L 480 220 A 30 30 0 0 1 450 250 L 50 250 A 30 30 0 0 0 20 280 L 20 370 A 30 30 0 0 0 50 400 L 250 400" 
              fill="none" stroke="#1A56DB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* NODES */}
      <div className="ahv-nodes">
        <div className="ahv-node ahv-node-1">
          <div className="ahv-icon-wrap"><Building2 size={20} /></div>
          <span className="ahv-node-label">Plant</span>
        </div>
        
        <div className="ahv-node ahv-node-2">
          <div className="ahv-icon-wrap"><Truck size={20} /></div>
          <span className="ahv-node-label">Dispatch</span>
        </div>

        <div className="ahv-node ahv-node-3">
          <div className="ahv-icon-wrap"><QrCode size={20} /></div>
          <span className="ahv-node-label">Gate Scan</span>
        </div>

        <div className="ahv-node ahv-node-4">
          <div className="ahv-icon-wrap"><Box size={20} /></div>
          <span className="ahv-node-label">Sampling</span>
        </div>

        <div className="ahv-node ahv-node-5">
          <div className="ahv-icon-wrap"><TestTube size={20} /></div>
          <span className="ahv-node-label">Testing</span>
        </div>

        <div className="ahv-node ahv-node-6">
          <div className="ahv-icon-wrap"><LayoutDashboard size={20} /></div>
          <span className="ahv-node-label">Insights</span>
        </div>
      </div>

      {/* MOVING TRUCK */}
      <div className="ahv-moving-truck">
        <Truck size={24} fill="currentColor" />
      </div>

      {/* ANIMATED POPUPS */}
      
      {/* 1. Gate Scan Anim */}
      <div className="ahv-popup ahv-popup-scan">
        <div className="ahv-scan-line"></div>
        <QrCode size={32} color="#1A56DB" />
        <div className="ahv-scan-success">
          <CheckCircle size={16} color="#10B981" /> Verified
        </div>
      </div>

      {/* 2. Pour Card & Cube */}
      <div className="ahv-popup ahv-popup-pour">
        <div className="ahv-pour-card">
          <FileText size={14} /> Pour #8492
          <div className="ahv-pour-skeleton"></div>
        </div>
        <div className="ahv-cube-3d">
          <div className="ahv-cube-face ahv-cube-front"></div>
          <div className="ahv-cube-face ahv-cube-back"></div>
          <div className="ahv-cube-face ahv-cube-right"></div>
          <div className="ahv-cube-face ahv-cube-left"></div>
          <div className="ahv-cube-face ahv-cube-top"></div>
          <div className="ahv-cube-face ahv-cube-bottom"></div>
        </div>
      </div>

      {/* 3. Lab Result Card */}
      <div className="ahv-popup ahv-popup-result">
        <div className="ahv-res-header">Cube C-047</div>
        <div className="ahv-res-row">
          <span>Expected:</span>
          <strong>40 MPa</strong>
        </div>
        <div className="ahv-res-row">
          <span>Actual:</span>
          <strong className="ahv-res-actual">43.8 MPa</strong>
        </div>
        <div className="ahv-res-badge">PASS <CheckCircle size={14} /></div>
      </div>

      {/* 4. Mini Dashboard */}
      <div className="ahv-popup ahv-popup-dash">
        <div className="ahv-dash-title">Executive Overview</div>
        <div className="ahv-dash-grid">
          <div className="ahv-dash-stat">
            <span>Today's Pours</span>
            <strong>12</strong>
          </div>
          <div className="ahv-dash-stat">
            <span>Pending Tests</span>
            <strong>4</strong>
          </div>
          <div className="ahv-dash-stat">
            <span>Active NCRs</span>
            <strong style={{ color: '#EF4444' }}>1</strong>
          </div>
          <div className="ahv-dash-stat">
            <span>Quality Score</span>
            <strong style={{ color: '#10B981' }}>98%</strong>
          </div>
        </div>
      </div>

      {/* FLOATING NOTIFICATIONS */}
      <div className="ahv-notifications">
        <div className="ahv-notif ahv-notif-1"><CheckCircle size={14} /> Truck Arrived</div>
        <div className="ahv-notif ahv-notif-2"><CheckCircle size={14} /> Cube Registered</div>
        <div className="ahv-notif ahv-notif-3"><CheckCircle size={14} /> Lab Result Uploaded</div>
        <div className="ahv-notif ahv-notif-4"><Bell size={14} /> NCR Auto Generated</div>
        <div className="ahv-notif ahv-notif-5"><CheckCircle size={14} /> QA Team Notified</div>
      </div>
    </div>
  );
};
