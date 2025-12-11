'use client';

import { useState } from 'react';
import { saveAgreement, createSigningSession } from '../actions';
import { CheckCircle, XCircle, Copy, FileText, Plus, Download, Search, LayoutList, CheckSquare, Clock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard({ initialAgreement, sessions }: { initialAgreement: string, sessions: any[] }) {
    const [agreement, setAgreement] = useState(initialAgreement);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    // New Creation State
    const [formData, setFormData] = useState({ name: '', email: '', description: '' });

    // Filtering & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentFilter, setCurrentFilter] = useState<'all' | 'pending' | 'signed'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await saveAgreement(agreement);
        setIsSaving(false);
        showNotification('Agreement saved successfully!');
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                showNotification('Link copied to clipboard');
            } else {
                // Fallback for non-secure contexts (e.g. mobile LAN testing)
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    showNotification('Link copied to clipboard');
                } catch (err) {
                    console.error('Fallback copy failed', err);
                    showNotification('Copy failed (try manual selection)', 'error');
                }
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Copy failed', err);
            showNotification('Copy failed', 'error');
        }
    };

    const handleCreateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation
        if (!formData.name.trim() || !formData.email.trim()) {
            showNotification('Name and Email are required', 'error');
            return;
        }

        const result = await createSigningSession({ ...formData, description: formData.name }); // Use name as description/reference implicitly if needed, or just omit
        if (result.success) {
            const url = `${window.location.origin}/sign/${result.id}`;
            copyToClipboard(url);
            showNotification('Waiver created & link copied!');
            setFormData({ name: '', email: '', description: '' });
            setIsModalOpen(false);
        }
    };

    const handleStagedDownload = async (session: any) => {
        try {
            // New Strategy: Call API to stage file -> Get static URL -> Open URL
            const res = await fetch(`/api/stage-waiver?sessionId=${session.id}`);
            if (!res.ok) throw new Error('Staging failed');
            const data = await res.json();

            if (data.success && data.url) {
                // Open the static file directly
                // This guarantees correct filename because it IS a file 
                window.open(data.url, '_blank');
            } else {
                showNotification('Failed to generate download', 'error');
            }
        } catch (e) {
            console.error(e);
            showNotification('Download error', 'error');
        }
    };

    const renderDownloadButton = (session: any) => {
        return (
            <button
                onClick={() => handleStagedDownload(session)}
                className="flex-1 text-[#4A3B32] hover:text-[#2C1810] hover:bg-[#F9F7F2] rounded py-1 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
                <Download className="w-3 h-3" /> Download PDF
            </button>
        );
    };


    // Filter Logic
    const filteredSessions = sessions.filter(s => {
        const matchesSearch =
            s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.designatedName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.signedAgreement?.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            currentFilter === 'all' ? true :
                currentFilter === 'pending' ? !s.isSigned :
                    currentFilter === 'signed' ? s.isSigned : true;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
    const paginatedSessions = filteredSessions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-4 md:p-8 font-sans text-[#2C1810]">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6DCC3] pb-4">
                    <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Songbird Terrace" className="h-12 w-auto object-contain drop-shadow-sm" />
                        <div>
                            <h1 className="text-2xl font-serif text-[#2C1810] tracking-tight">Waiver Dashboard</h1>
                            <p className="text-[#8B5E3C] text-xs uppercase tracking-widest font-medium">Songbird Terrace</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-[#2C1810]/20 transform transition hover:scale-105 active:scale-95 text-sm py-2 px-4"
                    >
                        <Plus className="w-4 h-4" /> New Waiver
                    </button>
                </header>

                {/* Agreement Editor (Collapsible or smaller? keeping as is for now but usually less important) */}
                {/* Stats & Actions Row */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E6DCC3] flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-[#8B6E4E]">Total Waivers</p>
                            <p className="text-2xl font-bold text-[#2C1810]">{sessions.length}</p>
                        </div>
                        <LayoutList className="w-8 h-8 text-[#E6DCC3]" />
                    </div>

                    <button
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-[#E6DCC3] flex items-center justify-between hover:border-[#8B5E3C] transition-colors group text-left"
                    >
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-[#8B6E4E]">Agreement Template</p>
                            <p className="text-sm font-bold text-[#2C1810] group-hover:text-[#8B5E3C] transition-colors">Edit Content</p>
                        </div>
                        <FileText className="w-8 h-8 text-[#E6DCC3] group-hover:text-[#8B5E3C] transition-colors" />
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#2C1810] p-4 rounded-xl shadow-lg border border-[#2C1810] flex items-center justify-between hover:bg-[#4A3B32] transition-colors text-left group"
                    >
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-[#8B6E4E] opacity-80">Quick Action</p>
                            <p className="text-sm font-bold text-[#FDFBF7]">New Waiver</p>
                        </div>
                        <Plus className="w-8 h-8 text-[#8B5E3C] group-hover:text-[#FDFBF7] transition-colors" />
                    </button>
                </section>

                {/* Waivers List */}
                <section className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-xl font-bold text-[#2C1810] font-serif">Waivers</h2>
                            <span className="text-[#8B6E4E] text-xs font-medium bg-[#F9F7F2] px-2 py-0.5 rounded-full border border-[#E6DCC3]">{sessions.length} total</span>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto text-sm">
                            {/* Filter Tabs */}
                            <div className="flex bg-[#F9F7F2] p-1 rounded-lg border border-[#E6DCC3]">
                                <button
                                    onClick={() => { setCurrentFilter('all'); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${currentFilter === 'all' ? 'bg-[#8B5E3C] text-[#FDFBF7] shadow-sm' : 'text-[#8B5E3C] hover:bg-[#E6DCC3]/50'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => { setCurrentFilter('pending'); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${currentFilter === 'pending' ? 'bg-[#8B5E3C] text-[#FDFBF7] shadow-sm' : 'text-[#8B5E3C] hover:bg-[#E6DCC3]/50'}`}
                                >
                                    Pending
                                </button>
                                <button
                                    onClick={() => { setCurrentFilter('signed'); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${currentFilter === 'signed' ? 'bg-[#8B5E3C] text-[#FDFBF7] shadow-sm' : 'text-[#8B5E3C] hover:bg-[#E6DCC3]/50'}`}
                                >
                                    Completed
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative w-full md:w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9C8C74]" />
                                <input
                                    type="text"
                                    placeholder="Search name..."
                                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E6DCC3] bg-white focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] w-full shadow-sm text-[#2C1810]"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <AnimatePresence mode="popLayout">
                            {paginatedSessions.map((session) => (
                                <motion.div
                                    key={session.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all relative flex flex-col ${session.isSigned ? 'border-[#E6DCC3]/60 p-3' : 'p-4 border-[#D4B483] border-l-4'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-[#2C1810] text-sm truncate flex-1 pr-2">
                                            {session.designatedName || session.description || 'Guest'}
                                        </h3>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${session.isSigned ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                            {session.isSigned ? 'Completed' : 'Pending'}
                                        </span>
                                    </div>

                                    {/* Metadata */}
                                    <div className="text-[11px] text-[#8B6E4E] space-y-0.5 mb-2 leading-tight">
                                        {session.designatedEmail && <p className="truncate">{session.designatedEmail}</p>}
                                        {!session.isSigned && <p className="text-[#9C8C74]">{new Date(session.createdAt).toLocaleDateString()}</p>}
                                        {session.isSigned && session.signedAgreement && <p className="text-green-700/70">Signed: {new Date(session.signedAgreement.signedAt).toLocaleDateString()}</p>}
                                    </div>

                                    {/* Action Area */}
                                    <div className="mt-auto pt-2 border-t border-[#F5F0E6] flex gap-2">
                                        {!session.isSigned ? (
                                            <button
                                                onClick={() => {
                                                    copyToClipboard(`${window.location.origin}/sign/${session.id}`);
                                                }}
                                                className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1 hover:bg-[#FDFBF7]"
                                            >
                                                <Copy className="w-3 h-3" /> Copy Link
                                            </button>
                                        ) : (
                                            renderDownloadButton(session)
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {filteredSessions.length === 0 && (
                            <div className="col-span-full py-12 text-center text-[#9C8C74] bg-[#F9F7F2] rounded-xl border border-dashed border-[#E6DCC3]">
                                <p className="text-sm font-medium">No waivers found</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-[#E6DCC3]">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-xs font-medium text-[#8B5E3C] disabled:opacity-50 hover:bg-[#F9F7F2] rounded transition"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-bold text-[#2C1810]">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-xs font-medium text-[#8B5E3C] disabled:opacity-50 hover:bg-[#F9F7F2] rounded transition"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </section>

                {/* New Session Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C1810]/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-[#FDFBF7] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E6DCC3]"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-[#2C1810] font-serif">Create Waiver</h3>
                                        <button onClick={() => setIsModalOpen(false)} className="text-[#9C8C74] hover:text-[#2C1810] transition">
                                            <XCircle className="w-6 h-6" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleCreateLink} className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-[#8B6E4E] uppercase tracking-wider mb-1.5 block">Full Name *</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                className="modern-input w-full"
                                                placeholder="e.g. John Doe"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[#8B6E4E] uppercase tracking-wider mb-1.5 block">Email Address *</label>
                                            <input
                                                type="email"
                                                className="modern-input w-full"
                                                placeholder="e.g. john@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="pt-2 flex gap-3">
                                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary justify-center">
                                                Cancel
                                            </button>
                                            <button type="submit" className="flex-1 btn-primary justify-center shadow-lg shadow-[#8B5E3C]/20">
                                                Generate Link
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Template Editor Modal */}
                    {isTemplateModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C1810]/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-[#FDFBF7] rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-[#E6DCC3]"
                            >
                                <div className="p-4 border-b border-[#E6DCC3] flex justify-between items-center bg-[#F9F7F2]">
                                    <h3 className="text-lg font-bold text-[#2C1810] font-serif flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-[#8B5E3C]" /> Edit Agreement Template
                                    </h3>
                                    <button onClick={() => setIsTemplateModalOpen(false)} className="text-[#9C8C74] hover:text-[#2C1810] transition">
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex-1 p-0 relative">
                                    <textarea
                                        className="w-full h-full p-6 text-sm text-[#4A3B32] leading-relaxed resize-none focus:outline-none font-serif bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] bg-blend-multiply"
                                        value={agreement}
                                        onChange={(e) => setAgreement(e.target.value)}
                                        placeholder="Enter agreement text..."
                                    />
                                </div>
                                <div className="p-4 border-t border-[#E6DCC3] bg-[#F9F7F2] flex justify-end gap-3">
                                    <button onClick={() => setIsTemplateModalOpen(false)} className="btn-secondary">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await handleSave();
                                            setIsTemplateModalOpen(false);
                                        }}
                                        disabled={isSaving}
                                        className="btn-primary min-w-[120px] justify-center"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Notification Toast */}
                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: 20, x: '-50%' }}
                            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 text-sm font-bold ${notification.type === 'success' ? 'bg-[#2C1810] text-[#D4B483]' : 'bg-red-600 text-white'
                                }`}
                        >
                            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {notification.message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
