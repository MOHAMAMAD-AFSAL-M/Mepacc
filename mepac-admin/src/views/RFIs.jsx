import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  User,
  Building2,
  Search,
  Filter,
  Trash2,
  Check,
  ChevronRight,
  ShieldAlert,
  Send,
  MessageSquare,
  X,
  ExternalLink,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function RFIs({ openModal }) {
  const rfis = useQuery(api.rfis.list) || [];
  const updateStatus = useMutation(api.rfis.updateStatus);
  const removeRfi = useMutation(api.rfis.remove);

  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'dispute' | 'rfi'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Statistics
  const totalCount = rfis.length;
  const activeDisputes = rfis.filter(
    (r) => r.type === 'dispute' && r.status !== 'RESOLVED'
  ).length;
  const openRfis = rfis.filter(
    (r) => r.type === 'rfi' && r.status !== 'RESOLVED'
  ).length;
  const resolvedCount = rfis.filter((r) => r.status === 'RESOLVED').length;

  // Filtered list
  const filteredRfis = rfis.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchProject = item.projectName?.toLowerCase().includes(q);
      const matchWorker = item.workerName?.toLowerCase().includes(q);
      const matchSender = item.createdByName?.toLowerCase().includes(q);
      const matchCode = item.rfiCode?.toLowerCase().includes(q);
      const matchDetails = item.details?.toLowerCase().includes(q);
      return (
        matchTitle ||
        matchProject ||
        matchWorker ||
        matchSender ||
        matchCode ||
        matchDetails
      );
    }
    return true;
  });

  const handleStatusChange = async (rfiId, newStatus) => {
    try {
      await updateStatus({ rfiId, status: newStatus });
      if (selectedItem && selectedItem._id === rfiId) {
        setSelectedItem((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (rfiId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this inquiry record?')) {
      try {
        await removeRfi({ rfiId });
        if (selectedItem && selectedItem._id === rfiId) {
          setSelectedItem(null);
        }
      } catch (err) {
        console.error('Failed to delete RFI:', err);
      }
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Recent';
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'FLAGGED FOR ADMIN REVIEW':
        return {
          bg: '#fee2e2',
          text: '#991b1b',
          border: '#fca5a5',
          label: 'Flagged Review',
        };
      case 'OPEN':
        return {
          bg: '#fef3c7',
          text: '#92400e',
          border: '#fde68a',
          label: 'Open',
        };
      case 'IN PROGRESS':
        return {
          bg: '#e0f2fe',
          text: '#0369a1',
          border: '#bae6fd',
          label: 'In Progress',
        };
      case 'RESOLVED':
        return {
          bg: '#dcfce7',
          text: '#166534',
          border: '#bbf7d0',
          label: 'Resolved',
        };
      default:
        return {
          bg: 'var(--bg-surface-hover)',
          text: 'var(--text-secondary)',
          border: 'var(--border-subtle)',
          label: status || 'Open',
        };
    }
  };

  return (
    <section className="view active" style={{ paddingBottom: '32px' }}>
      {/* ── Sleek View Header & Metric Bar ─────────────────── */}
      <div className="view-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2>RFI & Dispute Center</h2>
          <p className="subtitle">Track and resolve field attendance disputes, delay notes, and technical inquiries.</p>
        </div>
        <button className="btn primary" onClick={() => openModal('new-rfi')}>
          + New RFI
        </button>
      </div>

      {/* ── Clean Compact Stat Chips ────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Cases:</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalCount}</span>
        </div>

        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>Active Disputes:</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>{activeDisputes}</span>
        </div>

        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>Open RFIs:</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b' }}>{openRfis}</span>
        </div>

        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(34, 197, 94, 0.05)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
          <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>Resolved:</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e' }}>{resolvedCount}</span>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div
        className="panel"
        style={{
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Type Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'dispute', label: `Attendance Disputes (${rfis.filter((r) => r.type === 'dispute').length})` },
            { id: 'rfi', label: `RFIs (${rfis.filter((r) => r.type === 'rfi').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`btn ${typeFilter === tab.id ? 'primary' : 'secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search case, worker, site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-base)',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Status: All</option>
            <option value="FLAGGED FOR ADMIN REVIEW">Flagged Review</option>
            <option value="OPEN">Open</option>
            <option value="IN PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* ── Main Clean Inquiry Table ─────────────────────────── */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Case Code</th>
              <th style={{ width: '120px' }}>Type</th>
              <th>Subject / Worker Details</th>
              <th style={{ width: '180px' }}>Project Site</th>
              <th style={{ width: '160px' }}>Raised By</th>
              <th style={{ width: '100px' }}>Time</th>
              <th style={{ width: '130px' }}>Status</th>
              <th style={{ width: '80px', textAlign: 'right', paddingRight: '20px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRfis.length > 0 ? (
              filteredRfis.map((item) => {
                const isDispute = item.type === 'dispute';
                const statusBadge = getStatusBadge(item.status);
                const isSelected = selectedItem?._id === item._id;

                return (
                  <tr
                    key={item._id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected
                        ? 'rgba(59, 130, 246, 0.08)'
                        : isDispute && item.status !== 'RESOLVED'
                        ? 'rgba(239, 68, 68, 0.02)'
                        : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="worker-table-row"
                  >
                    {/* Case Code */}
                    <td style={{ width: '110px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '3px 6px',
                          backgroundColor: 'var(--bg-base)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)',
                          color: isDispute ? '#b91c1c' : 'var(--accent-blue)',
                        }}
                      >
                        #{item.rfiCode || item._id.slice(-5)}
                      </span>
                    </td>

                    {/* Type Badge */}
                    <td style={{ width: '120px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '10px',
                          backgroundColor: isDispute ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                          color: isDispute ? '#dc2626' : '#2563eb',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isDispute ? <ShieldAlert size={12} /> : <FileText size={12} />}
                        {isDispute ? 'Dispute' : 'RFI'}
                      </span>
                    </td>

                    {/* Subject & Summary */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                          {item.title}
                        </span>
                        {item.workerName && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Worker: <strong style={{ color: 'var(--text-secondary)' }}>{item.workerName}</strong> {item.workerRole ? `(${item.workerRole})` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Project Site */}
                    <td style={{ width: '180px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.projectName}
                        </span>
                      </div>
                    </td>

                    {/* Raised By */}
                    <td style={{ width: '160px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <User size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{item.createdByName}</span>
                      </div>
                    </td>

                    {/* Time */}
                    <td style={{ width: '100px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatRelativeTime(item.createdAt)}
                    </td>

                    {/* Status Pill */}
                    <td style={{ width: '130px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '12px',
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.text,
                          border: `1px solid ${statusBadge.border}`,
                          display: 'inline-block',
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Inspect Arrow Action */}
                    <td style={{ width: '80px', textAlign: 'right', paddingRight: '20px' }}>
                      <button
                        className="icon-btn"
                        style={{ padding: '5px' }}
                        title="View Case Details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600 }}>No inquiries found</div>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                      ? 'No cases match your filters.'
                      : 'All attendance disputes and RFIs will be listed here.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Slide-Over Case Inspector Drawer ────────────────── */}
      {selectedItem && (
        <div
          className="transparent-click-catcher"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 2500,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            style={{
              width: '540px',
              maxWidth: '92vw',
              height: '100vh',
              backgroundColor: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 2600,
              animation: 'slideInRight 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    backgroundColor:
                      selectedItem.type === 'dispute' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                    color: selectedItem.type === 'dispute' ? '#dc2626' : '#2563eb',
                  }}
                >
                  {selectedItem.type === 'dispute' ? 'Attendance Dispute' : 'Project RFI'}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  #{selectedItem.rfiCode || selectedItem._id.slice(-6)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="icon-btn"
                  onClick={(e) => handleDelete(selectedItem._id, e)}
                  title="Delete Record"
                  style={{ color: 'var(--accent-red)' }}
                >
                  <Trash2 size={16} />
                </button>
                <button className="icon-btn close-btn" onClick={() => setSelectedItem(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Title & Status */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {selectedItem.title}
                  </h3>
                  <span
                    style={{
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '12px',
                      flexShrink: 0,
                      ...getStatusBadge(selectedItem.status),
                    }}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> Logged on {new Date(selectedItem.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Key Attributes Box */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Project Site</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 size={14} color="var(--accent-blue)" /> {selectedItem.projectName}
                  </span>
                </div>

                {selectedItem.workerName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subject Worker</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedItem.workerName} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({selectedItem.workerRole || 'Worker'})</span>
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Raised By</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {selectedItem.createdByName} ({selectedItem.createdByRole || 'Supervisor'})
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Priority</span>
                  <span style={{ fontWeight: 700, color: selectedItem.priority === 'High' ? '#ef4444' : '#f59e0b' }}>
                    {selectedItem.priority || 'Normal'} Priority
                  </span>
                </div>
              </div>

              {/* Statement / Explanation Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  {selectedItem.type === 'dispute' ? 'Supervisor Explanation / Justification' : 'Inquiry Statement'}
                </span>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedItem.details}
                </div>
              </div>

              {/* Quick Status Action Panel */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Take Action / Lifecycle
                </span>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedItem.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleStatusChange(selectedItem._id, 'RESOLVED')}
                      className="btn primary"
                      style={{
                        padding: '7px 14px',
                        fontSize: '12px',
                        backgroundColor: '#16a34a',
                        borderColor: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={15} /> Resolve Case
                    </button>
                  )}

                  {selectedItem.status !== 'IN PROGRESS' && selectedItem.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleStatusChange(selectedItem._id, 'IN PROGRESS')}
                      className="btn secondary"
                      style={{ padding: '7px 14px', fontSize: '12px' }}
                    >
                      Set In Progress
                    </button>
                  )}

                  {selectedItem.status === 'RESOLVED' && (
                    <button
                      onClick={() => handleStatusChange(selectedItem._id, 'OPEN')}
                      className="btn secondary"
                      style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RotateCcw size={14} /> Re-open Case
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-base)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button className="btn secondary" onClick={() => setSelectedItem(null)}>
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
