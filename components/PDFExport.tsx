'use client';

import { useState } from 'react';
import type { UIFilePart } from '@/types';

interface PDFExportProps {
  slides: UIFilePart[];
}

export function PDFExport({ slides }: PDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    if (slides.length === 0) return;

    setIsGenerating(true);
    try {
      const slideUrls = slides.map((slide) => slide.url);

      const response = await fetch('/api/slides/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideUrls }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presentation.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (slides.length === 0) {
    return null;
  }

  return (
    <button
      onClick={handleExport}
      disabled={isGenerating}
      className="px-4 py-2 bg-fox-orange text-white rounded-lg hover:bg-fox-orange-light transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {isGenerating ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Generating...
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export PDF
        </>
      )}
    </button>
  );
}
