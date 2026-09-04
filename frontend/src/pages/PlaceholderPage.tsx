import React from 'react';
import { Settings } from 'lucide-react';

interface PlaceholderProps { title: string; description?: string; }

export const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-16 h-16 rounded-full bg-[#FFEBEE] border-2 border-[#D32F2F]/20 flex items-center justify-center mb-5">
      <Settings className="w-7 h-7 text-[#D32F2F]" />
    </div>
    <h1 className="font-bold text-[#1E293B] mb-3" style={{ fontSize: '22px' }}>{title}</h1>
    <p className="text-[#64748B] max-w-md leading-relaxed" style={{ fontSize: '15px' }}>
      {description ?? 'This module is under active development and will be available shortly.'}
    </p>
    <div className="mt-6 px-4 py-2 bg-[#FFF7ED] border border-[#FFCC80] rounded text-[#92400E]" style={{ fontSize: '13px' }}>
      Prototype Environment — Synthetic Data Only
    </div>
  </div>
);
