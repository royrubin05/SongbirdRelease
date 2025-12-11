'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function DownloadClient({ filename, apiPath }: { filename: string, apiPath: string }) {
    const [started, setStarted] = useState(false);

    useEffect(() => {
        // Auto-trigger download on mount with a slight delay for UX
        const timer = setTimeout(() => {
            const separator = apiPath.includes('?') ? '&' : '?';
            const link = document.createElement('a');
            link.href = apiPath + separator + 't=' + Date.now(); // Cache bust
            // link.download = filename; // Removed to rely on Content-Disposition
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setStarted(true);
        }, 800);

        return () => clearTimeout(timer);
    }, [apiPath, filename]);

    return (
        <div className="flex flex-col items-center gap-4">
            {!started ? (
                <div className="flex items-center gap-2 text-[#8B5E3C] animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium text-sm">Starting download...</span>
                </div>
            ) : (
                <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-[#2C1810] bg-[#F9F7F2] px-3 py-1 rounded border border-[#E6DCC3]">
                        {filename}
                    </p>
                    <a
                        href={apiPath + (apiPath.includes('?') ? '&' : '?') + 't=' + Date.now()}
                        target="_blank"
                        className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#6D482D] text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-md"
                    >
                        <Download className="w-5 h-5" />
                        Download Again
                    </a>
                </div>
            )}
        </div>
    );
}
