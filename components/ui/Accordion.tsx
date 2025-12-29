'use client';

import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const sentences = item.answer.split('. ').filter(s => s.trim());

        return (
          <div
            key={index}
            className="border border-[#e5e7eb] dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex justify-between items-center py-6 px-6 text-left hover:bg-[#f9fafb] dark:hover:bg-gray-700 transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-[#059669] focus-visible:outline-offset-[-2px]"
              aria-expanded={isOpen}
            >
              <span className="font-poppins text-base font-semibold text-[#1a365d] dark:text-gray-100 pr-4">
                {item.question}
              </span>
              <div className="flex-shrink-0 ml-6">
                {isOpen ? (
                  <Minus className="h-5 w-5 text-[#1a365d] dark:text-gray-100" />
                ) : (
                  <Plus className="h-5 w-5 text-[#9ca3af] dark:text-gray-400" />
                )}
              </div>
            </button>
            {isOpen && (
              <div
                className="bg-[#f9fafb] dark:bg-gray-900 py-4 px-6 border-t border-[#e5e7eb] dark:border-gray-700 -mx-6 px-6"
                style={{
                  animation: 'slideDown 300ms ease-out',
                }}
              >
                <div className="space-y-3 text-[#374151] dark:text-gray-300 text-base leading-relaxed">
                  {sentences.map((sentence, i) => (
                    <p key={i}>
                      {sentence}
                      {i < sentences.length - 1 ? '.' : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }
      `}</style>
    </div>
  );
}


