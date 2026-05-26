'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, ChevronRight, FileJson } from 'lucide-react';

interface PayloadViewerProps {
  payloadStr: string;
}

export function PayloadViewer({ payloadStr }: PayloadViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  let formattedJson = payloadStr;
  try {
    formattedJson = JSON.stringify(JSON.parse(payloadStr), null, 2);
  } catch (e) {
    // leave as is
  }

  return (
    <div className="mt-4 rounded-md border border-white/10 bg-black/40 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <FileJson className="h-4 w-4 text-emerald-400" />
        Raw Payload (MinIO)
      </button>
      
      {isOpen && (
        <div className="p-0 text-sm overflow-x-auto">
          <SyntaxHighlighter 
            language="json" 
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          >
            {formattedJson}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
