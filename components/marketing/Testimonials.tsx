'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    rating: 5,
    quote: 'Fixed my CSV in seconds and exported to Koinly. Worth every penny.',
    author: 'Alex Chen',
    role: 'Crypto Trader',
    avatar: 'AC',
    avatarColor: 'bg-gradient-to-br from-[#3b82f6] to-[#2563eb]',
  },
  {
    rating: 5,
    quote: 'Saved me hours of manual work. Exactly what the crypto community needed.',
    author: 'Sarah Martinez',
    role: 'Day Trader',
    avatar: 'SM',
    avatarColor: 'bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]',
  },
  {
    rating: 5,
    quote: 'Simple, fast, and reliable. No more fighting with tax software formats.',
    author: 'Michael Park',
    role: 'DeFi Investor',
    avatar: 'MP',
    avatarColor: 'bg-gradient-to-br from-[#059669] to-[#047857]',
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section className="bg-white py-16 sm:py-20">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-2">
            Trusted by Crypto Traders
          </h2>
        </div>

        {/* Mobile Carousel */}
        <div className="max-w-4xl mx-auto mb-8 lg:hidden">
          <div className="relative">
            {/* Navigation Arrows */}
            <button
              onClick={goToPrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-[#e5e7eb] flex items-center justify-center hover:bg-[#3b82f6] hover:text-white transition-all duration-300"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-[#e5e7eb] flex items-center justify-center hover:bg-[#3b82f6] hover:text-white transition-all duration-300"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Carousel */}
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <Card className="p-6">
                      <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-lg">⭐</span>
                        ))}
                      </div>
                      <p className="text-base text-[#1a365d] italic mb-6 leading-relaxed">
                        "{testimonial.quote}"
                      </p>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full ${testimonial.avatarColor} flex items-center justify-center shadow-lg`}>
                          <span className="text-white font-bold text-sm">{testimonial.avatar}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#1a365d]">{testimonial.author}</p>
                          <p className="text-xs text-[#6b7280]">{testimonial.role}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsAutoPlaying(false);
                    setTimeout(() => setIsAutoPlaying(true), 10000);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? 'w-6 h-2 bg-[#3b82f6]'
                      : 'w-2 h-2 bg-[#d1d5db] hover:bg-[#9ca3af]'
                  }`}
                  aria-label={`Go to ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Grid - 3 Cards */}
        <div className="max-w-6xl mx-auto hidden lg:grid grid-cols-3 gap-6 mb-12">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-base">⭐</span>
                ))}
              </div>
              <p className="text-sm text-[#1a365d] italic mb-4 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-[#e5e7eb]">
                <div className={`w-10 h-10 rounded-full ${testimonial.avatarColor} flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-bold text-xs">{testimonial.avatar}</span>
                </div>
                <div>
                  <p className="font-semibold text-xs text-[#1a365d]">{testimonial.author}</p>
                  <p className="text-xs text-[#6b7280]">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-[#3b82f6] to-[#2563eb] rounded-xl p-8 text-white text-center">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-4xl font-bold mb-1">10K+</div>
              <div className="text-sm font-semibold text-blue-100">Files Repaired</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-1">99.9%</div>
              <div className="text-sm font-semibold text-blue-100">Success Rate</div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}