'use client';

import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { submitSignedAgreement } from '../../actions';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Loader2, Lock } from 'lucide-react';

type SigRef = { clear: () => void; isEmpty: () => boolean; getTrimmedCanvas: () => HTMLCanvasElement };

export default function SigningForm({
    sessionId,
    agreementText,
    initialData,
}: {
    sessionId: string;
    agreementText: string;
    initialData?: { name: string; email: string };
}) {
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        address: '',
        email: initialData?.email || '',
        phone: '',
    });
    const [accepted, setAccepted] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sigPad = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollTop + clientHeight >= scrollHeight - 24) {
            setScrolledToBottom(true);
        }
    };

    // If the agreement text is short enough to fit without scrolling, auto-mark as reviewed.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        if (el.scrollHeight <= el.clientHeight + 2) setScrolledToBottom(true);
    }, [agreementText]);

    const currentStep = hasSignature ? 3 : scrolledToBottom && accepted ? 3 : scrolledToBottom ? 2 : 1;
    const canSubmit = scrolledToBottom && accepted && hasSignature && !submitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        const sig = sigPad.current as SigRef | null;
        if (!canSubmit || !sig) return;
        if (sig.isEmpty()) {
            setSubmitError('Please sign the agreement in the signature area above.');
            return;
        }

        setSubmitting(true);
        try {
            const signatureData = sig.getTrimmedCanvas().toDataURL('image/png');
            const result = await submitSignedAgreement(sessionId, {
                ...formData,
                signatureData,
                agreementSnapshot: agreementText,
            });

            if (result.success) {
                window.location.reload();
            } else {
                setSubmitError(result.error || 'Something went wrong. Please try again.');
                setSubmitting(false);
            }
        } catch (err) {
            console.error(err);
            setSubmitError('Unable to submit. Check your connection and try again.');
            setSubmitting(false);
        }
    };

    const clearSignature = () => {
        (sigPad.current as SigRef | null)?.clear();
        setHasSignature(false);
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] paper-grain py-6 px-4 md:py-12">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                className="max-w-xl mx-auto"
            >
                {/* Header / Masthead */}
                <header className="text-center mb-6 md:mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logo.png"
                        alt="Songbird Terrace"
                        className="h-14 w-auto object-contain mx-auto drop-shadow-sm"
                    />
                    <span className="gold-rule" aria-hidden="true" />
                    <h1 className="display-lg mt-4">Liability Release</h1>
                    <p className="eyebrow mt-1.5">Songbird Terrace</p>
                </header>

                {/* Step indicator */}
                <StepIndicator current={currentStep} />

                {/* Main card */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                    className="card overflow-hidden"
                >
                    <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-9">
                        {/* 1. Personal Details */}
                        <section aria-labelledby="sec-details" className="space-y-4">
                            <SectionHeader number={1} title="Your Details" id="sec-details" />
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="field-label">Full Name</label>
                                    <input
                                        id="name"
                                        required
                                        type="text"
                                        className="modern-input"
                                        placeholder="Jane Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        readOnly={!!initialData?.name}
                                        disabled={!!initialData?.name}
                                        autoComplete="name"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="phone" className="field-label">Phone</label>
                                        <input
                                            id="phone"
                                            required
                                            type="tel"
                                            className="modern-input"
                                            placeholder="(555) 000-0000"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            autoComplete="tel"
                                            inputMode="tel"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="field-label">Email</label>
                                        <input
                                            id="email"
                                            required
                                            type="email"
                                            className="modern-input"
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            readOnly={!!initialData?.email}
                                            disabled={!!initialData?.email}
                                            autoComplete="email"
                                            inputMode="email"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="address" className="field-label">Full Address</label>
                                    <input
                                        id="address"
                                        required
                                        type="text"
                                        className="modern-input"
                                        placeholder="123 Main St, City, State"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        autoComplete="street-address"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 2. Agreement */}
                        <section aria-labelledby="sec-agreement" className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <SectionHeader number={2} title="Review Agreement" id="sec-agreement" />
                                <StatusChip reviewed={scrolledToBottom} />
                            </div>

                            <div className="relative rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)] overflow-hidden">
                                <div
                                    ref={scrollRef}
                                    onScroll={handleScroll}
                                    className="custom-scroll h-64 overflow-y-auto p-6 prose-reading whitespace-pre-wrap scroll-smooth"
                                    tabIndex={0}
                                    role="region"
                                    aria-label="Agreement text"
                                >
                                    {agreementText}
                                    <div className="h-6" aria-hidden="true" />
                                </div>
                                <AnimatePresence>
                                    {!scrolledToBottom && (
                                        <motion.div
                                            key="fade"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none flex justify-center items-end pb-3"
                                            style={{ background: 'linear-gradient(to top, #fff, rgba(255,255,255,0))' }}
                                            aria-hidden="true"
                                        >
                                            <motion.div
                                                animate={{ y: [0, 4, 0] }}
                                                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                                                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                                Scroll to continue
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Accept checkbox */}
                            <label
                                htmlFor="accept"
                                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${scrolledToBottom
                                    ? 'bg-[var(--gold-soft)]/50 border-[var(--border-strong)] hover:bg-[var(--gold-soft)]'
                                    : 'bg-[var(--bg-muted)]/50 border-[var(--border)] opacity-60 cursor-not-allowed'
                                    }`}
                            >
                                <span className="relative flex items-center mt-0.5">
                                    <input
                                        id="accept"
                                        type="checkbox"
                                        required
                                        disabled={!scrolledToBottom}
                                        checked={accepted}
                                        onChange={(e) => setAccepted(e.target.checked)}
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-sm border-2 border-[var(--accent)] bg-white transition-all checked:bg-[var(--text)] checked:border-[var(--text)] disabled:cursor-not-allowed"
                                    />
                                    <Check
                                        className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="text-sm text-[var(--text-soft)] leading-snug select-none">
                                    I acknowledge I have read, understood, and agree to the terms above.
                                </span>
                            </label>
                        </section>

                        {/* 3. Signature */}
                        <section aria-labelledby="sec-signature" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <SectionHeader number={3} title="Digital Signature" id="sec-signature" />
                                {hasSignature && (
                                    <button
                                        type="button"
                                        onClick={clearSignature}
                                        className="btn-ghost"
                                        aria-label="Clear signature"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="relative rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)] overflow-hidden">
                                {/* Watermark logo */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/logo.png" alt="" aria-hidden="true" className="w-36 h-auto" />
                                </div>

                                {/* Signature baseline + X marker */}
                                <div className="absolute bottom-9 left-6 right-6 pointer-events-none" aria-hidden="true">
                                    <div className="flex items-center gap-2">
                                        <span className="font-display text-lg text-[var(--text-subtle)] leading-none">×</span>
                                        <span className="flex-1 border-b border-dashed border-[var(--border-strong)]" />
                                    </div>
                                </div>

                                <SignatureCanvas
                                    ref={sigPad}
                                    canvasProps={{
                                        className: 'w-full h-52 relative z-10 cursor-crosshair touch-none',
                                        'aria-label': 'Signature area — sign with your finger or mouse',
                                    }}
                                    backgroundColor="rgba(0,0,0,0)"
                                    onBegin={() => setHasSignature(true)}
                                />

                                <div className="absolute top-2 right-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] pointer-events-none flex items-center gap-1">
                                    <Lock className="w-3 h-3" aria-hidden="true" /> Secured
                                </div>
                            </div>
                        </section>

                        {/* Error */}
                        <AnimatePresence>
                            {submitError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    role="alert"
                                    className="text-sm p-3 rounded-lg border"
                                    style={{
                                        background: 'var(--danger-soft)',
                                        borderColor: 'var(--danger)',
                                        color: 'var(--danger)',
                                    }}
                                >
                                    {submitError}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Sticky submit */}
                        <div className="pt-4 sticky bottom-0 -mx-5 md:-mx-8 -mb-5 md:-mb-8 px-5 md:px-8 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-white)]/85 backdrop-blur-md">
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="btn-primary btn-shine w-full h-12 text-[0.95rem]"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Processing…
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4" aria-hidden="true" /> Submit Release
                                    </>
                                )}
                            </button>
                            <p className="mt-2.5 text-[11px] text-center text-[var(--text-subtle)] leading-snug">
                                By submitting, you acknowledge this digital signature is legally binding.
                            </p>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </div>
    );
}

/* -------- small presentational helpers -------- */

function SectionHeader({ number, title, id }: { number: number; title: string; id: string }) {
    return (
        <h2 id={id} className="flex items-baseline gap-2.5">
            <span
                className="font-display text-[var(--accent)] text-lg font-semibold tabular-nums"
                style={{ fontVariationSettings: '"opsz" 48' }}
            >
                {String(number).padStart(2, '0')}
            </span>
            <span className="display-md">{title}</span>
        </h2>
    );
}

function StatusChip({ reviewed }: { reviewed: boolean }) {
    return (
        <motion.span
            key={reviewed ? 'done' : 'pending'}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full border ${reviewed
                ? 'text-[var(--success)] bg-[var(--success-soft)] border-[var(--success)]/30'
                : 'text-[var(--accent)] bg-[var(--gold-soft)] border-[var(--border-strong)]'
                }`}
        >
            {reviewed ? (<><Check className="w-3 h-3" /> Reviewed</>) : (<><ChevronDown className="w-3 h-3" /> Scroll to end</>)}
        </motion.span>
    );
}

function StepIndicator({ current }: { current: number }) {
    const steps = ['Details', 'Review', 'Sign'];
    return (
        <div className="mb-5 px-1" aria-label={`Step ${current} of 3`}>
            <div className="flex items-center gap-2">
                {steps.map((label, i) => {
                    const stepNum = i + 1;
                    const state = stepNum < current ? 'done' : stepNum === current ? 'current' : 'pending';
                    return (
                        <div key={label} className="flex items-center gap-2 flex-1">
                            <motion.div
                                animate={{
                                    backgroundColor:
                                        state === 'done' ? 'var(--accent)' : state === 'current' ? 'var(--text)' : 'var(--border)',
                                    scale: state === 'current' ? 1 : 0.85,
                                }}
                                className="h-1 flex-1 rounded-full origin-left"
                                transition={{ duration: 0.4 }}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between mt-2 px-0.5">
                {steps.map((label, i) => (
                    <span
                        key={label}
                        className={`text-[10px] font-semibold uppercase tracking-widest ${i + 1 <= current ? 'text-[var(--text)]' : 'text-[var(--text-subtle)]'}`}
                    >
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
}
