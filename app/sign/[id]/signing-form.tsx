'use client';

import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { submitSignedAgreement } from '../../actions';
import { motion } from 'framer-motion';
import { Check, ChevronDown, PenTool } from 'lucide-react';

export default function SigningForm({ sessionId, agreementText, initialData }: { sessionId: string, agreementText: string, initialData?: { name: string, email: string } }) {
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        address: '',
        email: initialData?.email || '',
        phone: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sigPad = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 30) {
                setScrolledToBottom(true);
            }
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            if (scrollHeight <= clientHeight) {
                setScrolledToBottom(true);
            }
        }
    }, [agreementText]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scrolledToBottom) return;
        if (sigPad.current?.isEmpty()) {
            alert("Please sign the agreement.");
            return;
        }

        setSubmitting(true);
        try {
            const signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
            const result = await submitSignedAgreement(sessionId, {
                ...formData,
                signatureData,
                agreementSnapshot: agreementText
            });

            if (result.success) {
                window.location.reload();
            } else {
                alert("Error submitting agreement: " + result.error);
                setSubmitting(false);
            }
        } catch (err) {
            console.error(err);
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto bg-[#FDFBF7] shadow-2xl rounded-2xl overflow-hidden font-sans border border-[#E6DCC3]"
        >
            <div className="bg-white px-8 py-8 text-center border-b border-[#E6DCC3]">
                <div className="flex justify-center mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Songbird Terrace" className="h-16 w-auto object-contain" />
                </div>
                <h2 className="text-2xl font-serif text-[#2C1810] tracking-tight">Liability Release</h2>
                <p className="text-[#8B6E4E] text-sm mt-1 uppercase tracking-widest font-medium">Songbird Terrace</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                {/* Personal Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#2C1810] uppercase tracking-wider border-b border-[#E6DCC3] pb-2 font-serif">
                        1. Your Details
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-[#8B6E4E] uppercase mb-1 block">Full Name</label>
                            <input
                                required
                                type="text"
                                className="modern-input"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                readOnly={!!initialData?.name}
                                disabled={!!initialData?.name}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-[#8B6E4E] uppercase mb-1 block">Phone</label>
                                <input required type="tel" className="modern-input" placeholder="(555) 000-0000"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#8B6E4E] uppercase mb-1 block">Email</label>
                                <input
                                    required
                                    type="email"
                                    className="modern-input"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    readOnly={!!initialData?.email}
                                    disabled={!!initialData?.email}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[#8B6E4E] uppercase mb-1 block">Full Address</label>
                            <input required type="text" className="modern-input" placeholder="123 Main St, City, State"
                                value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Agreement Reader */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#2C1810] uppercase tracking-wider border-b border-[#E6DCC3] pb-2 flex justify-between items-center font-serif">
                        2. Review Agreement
                        {!scrolledToBottom && <span className="text-[10px] text-[#8B5E3C] bg-[#F5E6D3] px-2 py-1 rounded-full flex items-center gap-1"><ChevronDown className="w-3 h-3" /> Scroll to end</span>}
                        {scrolledToBottom && <span className="text-[10px] text-green-800 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Reviewed</span>}
                    </h3>
                    <div className="bg-white rounded-lg border border-[#E6DCC3] relative group shadow-inner">
                        <div
                            ref={scrollRef}
                            onScroll={handleScroll}
                            className="h-64 overflow-y-auto p-5 text-sm text-[#4A3B32] leading-7 whitespace-pre-wrap scroll-smooth font-serif"
                        >
                            {agreementText}
                            <div className="h-8"></div>
                        </div>
                        {!scrolledToBottom && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#F9F7F2] to-transparent pointer-events-none flex justify-center items-end pb-2">
                                <ChevronDown className="w-5 h-5 text-[#8B5E3C] animate-bounce" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#F5E6D3]/30 rounded-lg border border-[#E6DCC3]">
                        <div className="relative flex items-center">
                            <input
                                id="accept"
                                type="checkbox"
                                required
                                disabled={!scrolledToBottom}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-sm border border-[#8B5E3C] bg-white transition-all checked:bg-[#2C1810] checked:border-[#2C1810] disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <Check className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" />
                        </div>
                        <label htmlFor="accept" className={`text-sm font-medium text-[#4A3B32] cursor-pointer select-none ${!scrolledToBottom ? 'opacity-50' : ''}`}>
                            I acknowledge that I have read and agree to the terms above.
                        </label>
                    </div>
                </div>

                {/* Signature */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-[#E6DCC3] pb-2">
                        <h3 className="text-sm font-bold text-[#2C1810] uppercase tracking-wider font-serif">
                            3. Digital Signature
                        </h3>
                        <button type="button" onClick={() => sigPad.current?.clear()} className="text-xs text-[#8B5E3C] hover:text-[#2C1810] font-medium uppercase tracking-wide">
                            Clear
                        </button>
                    </div>
                    <div className="border border-[#E6DCC3] rounded-xl bg-white relative overflow-hidden group shadow-sm">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                            <img src="/logo.png" alt="watermark" className="w-32 h-auto grayscale" />
                        </div>
                        <SignatureCanvas
                            ref={sigPad}
                            canvasProps={{
                                className: 'w-full h-48 rounded-xl cursor-crosshair z-10 relative'
                            }}
                            backgroundColor="rgba(0,0,0,0)"
                        />
                        <div className="absolute bottom-2 left-4 text-[10px] text-[#9C8C74] pointer-events-none uppercase tracking-wide">
                            Sign here
                        </div>
                    </div>
                </div>

                <div className="pt-4 sticky bottom-0 bg-[#FDFBF7]/90 backdrop-blur-sm p-4 -mx-4 md:-mx-8 border-t border-[#E6DCC3]">
                    <button
                        type="submit"
                        disabled={submitting || !scrolledToBottom}
                        className="w-full btn-primary h-12 text-base shadow-lg shadow-[#2C1810]/20 font-serif tracking-wide"
                    >
                        {submitting ? 'Processing...' : 'Submit Final Release'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
