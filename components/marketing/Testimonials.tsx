'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StarRating } from '../ui/StarRating';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    rating: 5,
    quote: 'Finally, a tool that actually works. Fixed my Coinbase CSV in seconds and exported directly to Koinly. Worth every penny.',
    author: 'Alex Chen',
    role: 'Crypto Trader',
    company: 'Independent',
    verified: true,
    date: '2 weeks ago',
    source: 'ProductHunt',
    avatar: 'AC',
    avatarColor: 'bg-gradient-to-br from-[#3b82f6] to-[#2563eb]',
  },
  {
    rating: 5,
    quote: 'I was stuck with broken CSV files from multiple exchanges. TaxReadyWallet saved me hours of manual work. Highly recommend!',
    author: 'Sarah Martinez',
    role: 'Day Trader',
    company: 'Trading Firm',
    verified: true,
    date: '1 month ago',
    source: 'Twitter',
    avatar: 'SM',
    avatarColor: 'bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]',
  },
  {
    rating: 5,
    quote: 'Simple, fast, and reliable. No more fighting with tax software formats. This is exactly what the crypto community needed.',
    author: 'Michael Park',
    role: 'DeFi Investor',
    company: 'Crypto Fund',
    verified: true,
    date: '3 weeks ago',
    source: 'ProductHunt',
    avatar: 'MP',
    avatarColor: 'bg-gradient-to-br from-[#059669] to-[#047857]',
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of manual interaction
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section className="bg-slate-50 py-24 sm:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Trusted by Crypto Traders
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Real feedback from the community
          </p>
        </div>

        {/* Carousel */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="relative">
            {/* Navigation Arrows */}
            <button
              onClick={goToPrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-[#e5e7eb] flex items-center justify-center hover:bg-[#3b82f6] hover:text-white hover:border-[#3b82f6] transition-all duration-300 group"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-6 w-6 text-[#1a365d] group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-[#e5e7eb] flex items-center justify-center hover:bg-[#3b82f6] hover:text-white hover:border-[#3b82f6] transition-all duration-300 group"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-6 w-6 text-[#1a365d] group-hover:text-white transition-colors" />
            </button>

            {/* Carousel Content */}
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <Card className="group hover:shadow-[0_12px_48px_rgba(26,54,93,0.15)] transition-all duration-300 max-w-4xl mx-auto">
                      <div className="flex items-start justify-between mb-4">
                        <StarRating rating={testimonial.rating} size="lg" />
                        <span className="text-xs text-[#9ca3af]">{testimonial.date}</span>
                      </div>
                      <p className="font-sohne text-xl text-[#1a365d] italic mb-8 leading-relaxed">
                        "{testimonial.quote}"
                      </p>
                      <div className="border-t border-[#e5e7eb] pt-6">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className={`flex-shrink-0 w-16 h-16 rounded-full ${testimonial.avatarColor} flex items-center justify-center shadow-lg`}>
                            <span className="text-white font-bold text-lg">{testimonial.avatar}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-lg text-[#1a365d] mb-1">
                                  {testimonial.author}
                                </p>
                                <p className="text-sm text-[#6b7280] mb-2">
                                  {testimonial.role}
                                </p>
                                <p className="text-sm text-[#9ca3af]">
                                  {testimonial.company} · via {testimonial.source}
                                </p>
                              </div>
                              {testimonial.verified && (
                                <Badge variant="success" showIcon className="flex-shrink-0">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots Navigation */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? 'w-8 h-2 bg-[#3b82f6]'
                      : 'w-2 h-2 bg-[#d1d5db] hover:bg-[#9ca3af]'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Static Grid for Desktop - Hidden on mobile */}
        <div className="max-w-6xl mx-auto hidden lg:grid grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="group hover:shadow-[0_12px_48px_rgba(26,54,93,0.15)] hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <StarRating rating={testimonial.rating} size="md" />
                <span className="text-xs text-[#9ca3af]">{testimonial.date}</span>
              </div>
              <p className="font-sohne text-base text-[#1a365d] italic mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="border-t border-[#e5e7eb] pt-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full ${testimonial.avatarColor} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-white font-bold text-sm">{testimonial.avatar}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#1a365d] mb-0.5 truncate">
                          {testimonial.author}
                        </p>
                        <p className="text-xs text-[#6b7280] mb-1">
                          {testimonial.role}
                        </p>
                        <p className="text-xs text-[#9ca3af]">
                          {testimonial.company} · {testimonial.source}
                        </p>
                      </div>
                      {testimonial.verified && (
                        <Badge variant="success" showIcon className="flex-shrink-0">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-12">
            <div className="grid grid-cols-2 divide-x divide-[#e5e7eb]">
              <div className="text-center pr-6">
                <div className="font-poppins text-4xl font-bold text-[#1a365d] mb-2">
                  10K+
                </div>
                <div className="text-sm text-[#4b5563]">
                  Files Repaired
                </div>
              </div>
              <div className="text-center pl-6">
                <div className="font-poppins text-4xl font-bold text-[#1a365d] mb-2">
                  99.9%
                </div>
                <div className="text-sm text-[#4b5563]">
                  Success Rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

