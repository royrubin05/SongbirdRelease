'use client';

import { useEffect, useMemo, useState } from 'react';
import { saveAgreement, createSigningSession, deleteSigningSession } from '../actions';
import {
    CheckCircle2, AlertCircle, XCircle, Copy, FileText, Plus, Download, Search,
    LayoutList, Clock, Trash2, Sparkles, TrendingUp, Link as LinkIcon, MoreHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

/* eslint-disable @typescript-eslint/no-explicit-any */

type SessionRow = {
    id: string;
    status: string;
    description: string | null;
    designatedName: string | null;
    designatedEmail: string | null;
    isSigned: boolean;
    createdAt: string;
    signedAgreement: {
        customerName: string;
        customerEmail: string | null;
        signedAt: string;
    } | null;
};

export default function AdminDashboard({
    initialAgreement,
    sessions,
}: {
    initialAgreement: string;
    sessions: SessionRow[];
}) {
    const [agreement, setAgreement] = useState(initialAgreement);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    const [formData, setFormData] = useState({ name: '', email: '', description: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentFilter, setCurrentFilter] = useState<'all' | 'pending' | 'signed'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3200);
    };

    /* -------- stats -------- */
    const stats = useMemo(() => {
        const total = sessions.length;
        const signed = sessions.filter((s) => s.isSigned).length;
        const pending = total - signed;
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const thisWeek = sessions.filter(
            (s) => s.isSigned && s.signedAgreement && new Date(s.signedAgreement.signedAt).getTime() >= oneWeekAgo
        ).length;
        const rate = total === 0 ? 0 : Math.round((signed / total) * 100);
        return { total, signed, pending, thisWeek, rate };
    }, [sessions]);

    /* -------- confetti + highlight on new signatures (polished) -------- */
    useEffect(() => {
        const signedIds = sessions.filter((s) => s.isSigned).map((s) => s.id);
        const stored: string[] = JSON.parse(localStorage.getItem('signedSessionIds') || '[]');
        const newIds = signedIds.filter((id) => !stored.includes(id));

        if (newIds.length > 0 && stored.length > 0) {
            // Tamer, brand-aligned confetti — gold + cream only, less spread.
            confetti({
                particleCount: 90,
                spread: 55,
                startVelocity: 32,
                ticks: 140,
                origin: { y: 0.25 },
                colors: ['#D4B483', '#8B5E3C', '#F5E6D3'],
                scalar: 0.9,
            });
            showNotification('New waiver signed');
            setHighlightedIds(new Set(newIds));
            setTimeout(() => setHighlightedIds(new Set()), 4500);
        }
        localStorage.setItem('signedSessionIds', JSON.stringify(signedIds));
    }, [sessions]);

    /* -------- actions -------- */
    const handleSave = async () => {
        setIsSaving(true);
        const res = await saveAgreement(agreement);
        setIsSaving(false);
        if (res.success) {
            showNotification('Agreement saved');
        } else {
            showNotification(res.error || 'Failed to save', 'error');
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            showNotification('Link copied');
        } catch {
            showNotification('Copy failed', 'error');
        }
    };

    const handleCreateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.email.trim()) {
            showNotification('Name and email are required', 'error');
            return;
        }
        const result = await createSigningSession({ ...formData, description: formData.name });
        if (result.success) {
            const url = `${window.location.origin}/sign/${result.id}`;
            copyToClipboard(url);
            setFormData({ name: '', email: '', description: '' });
            setIsCreateModalOpen(false);
        }
    };

    const handleStagedDownload = async (session: SessionRow) => {
        try {
            const res = await fetch(`/api/stage-waiver?sessionId=${session.id}`);
            if (!res.ok) throw new Error('Staging failed');
            const data = await res.json();
            if (data.success && data.url) {
                window.open(data.url, '_blank');
            } else {
                showNotification('Failed to generate download', 'error');
            }
        } catch {
            showNotification('Download error', 'error');
        }
    };

    const handleDelete = async (session: SessionRow) => {
        const label = session.signedAgreement?.customerName || session.designatedName || 'this waiver';
        if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
        const res = await deleteSigningSession(session.id);
        if (res.success) showNotification('Waiver deleted');
        else showNotification('Delete failed', 'error');
    };

    /* -------- filter + paginate -------- */
    const filteredSessions = sessions.filter((s) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
            !q ||
            s.description?.toLowerCase().includes(q) ||
            s.designatedName?.toLowerCase().includes(q) ||
            s.designatedEmail?.toLowerCase().includes(q) ||
            s.signedAgreement?.customerName.toLowerCase().includes(q);
        const matchesStatus =
            currentFilter === 'all' ? true : currentFilter === 'pending' ? !s.isSigned : s.isSigned;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / itemsPerPage));
    const paginatedSessions = filteredSessions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="min-h-screen bg-[var(--bg)] paper-grain pb-20">
            {/* Masthead */}
            <header className="border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Songbird Terrace" className="h-11 w-auto object-contain drop-shadow-sm" />
                        <div className="hidden sm:block border-l border-[var(--border)] pl-3">
                            <h1 className="display-md leading-none">Waiver Dashboard</h1>
                            <p className="eyebrow mt-1">Songbird Terrace</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--success)] bg-[var(--success-soft)] border border-[var(--success)]/20 rounded-full px-2.5 py-1"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                            Live
                        </span>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn-primary"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            <span className="hidden sm:inline">New Waiver</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10 space-y-8">
                {/* Stats row */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Total" value={stats.total} icon={<LayoutList className="w-4 h-4" />} />
                    <StatCard
                        label="Pending"
                        value={stats.pending}
                        icon={<Clock className="w-4 h-4" />}
                        tone="gold"
                    />
                    <StatCard
                        label="Signed this Week"
                        value={stats.thisWeek}
                        icon={<Sparkles className="w-4 h-4" />}
                        tone="success"
                    />
                    <StatCard
                        label="Completion"
                        value={`${stats.rate}%`}
                        icon={<TrendingUp className="w-4 h-4" />}
                    />
                </section>

                {/* Waivers section */}
                <section className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="display-md">Waivers</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                {filteredSessions.length} {filteredSessions.length === 1 ? 'result' : 'results'}
                                {currentFilter !== 'all' && <> · filtered by {currentFilter}</>}
                                {searchTerm && <> · matching &ldquo;{searchTerm}&rdquo;</>}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            {/* Filter tabs */}
                            <div role="tablist" aria-label="Filter waivers" className="inline-flex bg-white border border-[var(--border)] rounded-lg p-1 shadow-[var(--shadow-sm)]">
                                <FilterTab
                                    label="All"
                                    count={stats.total}
                                    active={currentFilter === 'all'}
                                    onClick={() => { setCurrentFilter('all'); setCurrentPage(1); }}
                                />
                                <FilterTab
                                    label="Pending"
                                    count={stats.pending}
                                    active={currentFilter === 'pending'}
                                    onClick={() => { setCurrentFilter('pending'); setCurrentPage(1); }}
                                />
                                <FilterTab
                                    label="Signed"
                                    count={stats.signed}
                                    active={currentFilter === 'signed'}
                                    onClick={() => { setCurrentFilter('signed'); setCurrentPage(1); }}
                                />
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:w-60">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-subtle)]" aria-hidden="true" />
                                <input
                                    type="search"
                                    placeholder="Search name or email…"
                                    className="modern-input pl-9 py-2 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    aria-label="Search waivers"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <AnimatePresence mode="popLayout">
                            {paginatedSessions.map((session, i) => (
                                <WaiverCard
                                    key={session.id}
                                    session={session}
                                    index={i}
                                    highlighted={highlightedIds.has(session.id)}
                                    onCopyLink={() => copyToClipboard(`${window.location.origin}/sign/${session.id}`)}
                                    onDownload={() => handleStagedDownload(session)}
                                    onDelete={() => handleDelete(session)}
                                />
                            ))}
                        </AnimatePresence>

                        {filteredSessions.length === 0 && <EmptyState onCreate={() => setIsCreateModalOpen(true)} filter={currentFilter} search={searchTerm} />}
                    </div>

                    {/* Pagination */}
                    {filteredSessions.length > itemsPerPage && (
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="btn-secondary text-xs px-3 py-1.5"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-semibold tabular-nums text-[var(--text)]">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary text-xs px-3 py-1.5"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </section>

                {/* Template editor entry */}
                <footer className="pt-8 mt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="btn-ghost"
                    >
                        <FileText className="w-3.5 h-3.5" /> Edit Agreement Template
                    </button>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--text-subtle)] font-semibold">
                        Songbird Terrace · Release App · v1.0.1
                    </p>
                </footer>
            </main>

            {/* Create modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <Modal onClose={() => setIsCreateModalOpen(false)} title="Create Waiver">
                        <form onSubmit={handleCreateLink} className="space-y-4">
                            <div>
                                <label htmlFor="new-name" className="field-label">Full Name</label>
                                <input
                                    id="new-name"
                                    autoFocus
                                    type="text"
                                    className="modern-input"
                                    placeholder="e.g. Jane Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="new-email" className="field-label">Email Address</label>
                                <input
                                    id="new-email"
                                    type="email"
                                    className="modern-input"
                                    placeholder="e.g. jane@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">
                                A unique signing link will be generated and copied to your clipboard automatically.
                            </p>
                            <div className="pt-3 flex gap-3">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    <LinkIcon className="w-4 h-4" aria-hidden="true" /> Generate Link
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}

                {/* Template editor */}
                {isTemplateModalOpen && (
                    <Modal
                        onClose={() => setIsTemplateModalOpen(false)}
                        title="Agreement Template"
                        size="lg"
                    >
                        <div className="flex flex-col h-[70vh]">
                            <textarea
                                className="modern-input flex-1 font-display resize-none text-[0.95rem] leading-relaxed"
                                style={{ padding: '1.25rem' }}
                                value={agreement}
                                onChange={(e) => setAgreement(e.target.value)}
                                placeholder="Enter agreement text…"
                            />
                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setIsTemplateModalOpen(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        await handleSave();
                                        setIsTemplateModalOpen(false);
                                    }}
                                    disabled={isSaving}
                                    className="btn-primary min-w-[140px]"
                                >
                                    {isSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.25 }}
                        role="status"
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-50"
                    >
                        <div
                            className={`flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-lg shadow-[var(--shadow-lg)] ${toast.type === 'success'
                                ? 'bg-white/90 border-[var(--border-strong)] text-[var(--text)]'
                                : 'bg-[var(--danger-soft)]/90 border-[var(--danger)]/40 text-[var(--danger)]'
                                }`}
                        >
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-[var(--success)]" aria-hidden="true" />
                            ) : (
                                <AlertCircle className="w-5 h-5" aria-hidden="true" />
                            )}
                            <span className="text-sm font-semibold">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ========================================================================
   Helpers
   ======================================================================== */

function StatCard({
    label,
    value,
    icon,
    tone = 'default',
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    tone?: 'default' | 'gold' | 'success';
}) {
    const iconTone =
        tone === 'gold'
            ? 'text-[var(--accent)] bg-[var(--gold-soft)]'
            : tone === 'success'
                ? 'text-[var(--success)] bg-[var(--success-soft)]'
                : 'text-[var(--text-muted)] bg-[var(--bg-muted)]';

    return (
        <div className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
                <p className="eyebrow">{label}</p>
                <p className="display-lg mt-1 tabular-nums">{value}</p>
            </div>
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconTone}`} aria-hidden="true">
                {icon}
            </div>
        </div>
    );
}

function FilterTab({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`relative px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${active
                ? 'text-[var(--text-inverse)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
        >
            {active && (
                <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 bg-[var(--text)] rounded-md shadow-[var(--shadow-sm)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
            )}
            <span className="relative">{label}</span>
            <span className={`relative tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/15' : 'bg-[var(--bg-muted)]'}`}>
                {count}
            </span>
        </button>
    );
}

function WaiverCard({
    session,
    index,
    highlighted,
    onCopyLink,
    onDownload,
    onDelete,
}: {
    session: SessionRow;
    index: number;
    highlighted: boolean;
    onCopyLink: () => void;
    onDownload: () => void;
    onDelete: () => void;
}) {
    const name =
        session.signedAgreement?.customerName ||
        session.designatedName ||
        session.description ||
        'Unnamed';
    const email = session.signedAgreement?.customerEmail || session.designatedEmail;
    const dateStr = session.isSigned && session.signedAgreement
        ? new Date(session.signedAgreement.signedAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' })
        : new Date(session.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: highlighted ? 1.015 : 1,
                boxShadow: highlighted ? '0 0 0 2px var(--gold), var(--shadow-lg)' : 'var(--shadow-card)',
            }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.2) }}
            className="card card-hover relative overflow-hidden flex flex-col"
        >
            {/* Left status stripe */}
            <span
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{
                    background: session.isSigned ? 'var(--success)' : 'var(--gold)',
                }}
            />

            <div className="p-4 pl-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-display text-[0.95rem] font-semibold text-[var(--text)] truncate">
                            {name}
                        </h3>
                        {email && (
                            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{email}</p>
                        )}
                    </div>
                    <StatusPill signed={session.isSigned} />
                </div>

                <p className="text-[11px] text-[var(--text-subtle)] font-medium mb-3 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {session.isSigned ? 'Signed' : 'Created'} {dateStr}
                </p>

                <div className="mt-auto pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2">
                    {session.isSigned ? (
                        <button onClick={onDownload} className="btn-secondary flex-1 py-1.5 text-xs">
                            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download PDF
                        </button>
                    ) : (
                        <button onClick={onCopyLink} className="btn-secondary flex-1 py-1.5 text-xs">
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy Link
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-md text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
                        aria-label={`Delete waiver for ${name}`}
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.article>
    );
}

function StatusPill({ signed }: { signed: boolean }) {
    return (
        <span
            className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${signed
                ? 'text-[var(--success)] bg-[var(--success-soft)] border-[var(--success)]/20'
                : 'text-[var(--accent-strong)] bg-[var(--gold-soft)] border-[var(--border-strong)]'
                }`}
        >
            {signed ? 'Signed' : 'Pending'}
        </span>
    );
}

function EmptyState({
    onCreate,
    filter,
    search,
}: {
    onCreate: () => void;
    filter: 'all' | 'pending' | 'signed';
    search: string;
}) {
    const isFiltered = filter !== 'all' || !!search;

    return (
        <div className="col-span-full py-14 text-center border border-dashed border-[var(--border-strong)] rounded-2xl bg-[var(--bg-muted)]/30">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--bg-white)] border border-[var(--border)] flex items-center justify-center shadow-[var(--shadow-sm)]">
                {isFiltered ? (
                    <Search className="w-6 h-6 text-[var(--text-muted)]" aria-hidden="true" />
                ) : (
                    <FileText className="w-6 h-6 text-[var(--text-muted)]" aria-hidden="true" />
                )}
            </div>
            <h3 className="display-md">{isFiltered ? 'No matches' : 'No waivers yet'}</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto mt-1.5 leading-relaxed">
                {isFiltered
                    ? 'Try clearing filters or searching with a different name.'
                    : 'Create your first waiver link to get started.'}
            </p>
            {!isFiltered && (
                <button onClick={onCreate} className="btn-primary mt-5">
                    <Plus className="w-4 h-4" aria-hidden="true" /> New Waiver
                </button>
            )}
        </div>
    );
}

function Modal({
    onClose,
    title,
    children,
    size = 'md',
}: {
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'md' | 'lg';
}) {
    // Escape key close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-inverse)]/55 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                onClick={(e) => e.stopPropagation()}
                className={`card w-full ${size === 'lg' ? 'max-w-3xl' : 'max-w-md'} overflow-hidden`}
                style={{ boxShadow: 'var(--shadow-lg)' }}
            >
                <header className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border-subtle)]">
                    <h3 id="modal-title" className="display-md">{title}</h3>
                    <button
                        onClick={onClose}
                        className="btn-ghost -mr-2"
                        aria-label="Close dialog"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </header>
                <div className="p-6">{children}</div>
            </motion.div>
        </motion.div>
    );
}
