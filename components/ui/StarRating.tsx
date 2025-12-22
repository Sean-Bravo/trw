import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = false,
  className = '',
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const stars = Array.from({ length: maxRating }, (_, index) => {
    const starValue = index + 1;
    const isFilled = starValue <= rating;
    const isHalf = starValue === Math.ceil(rating) && rating % 1 !== 0;

    return (
      <Star
        key={index}
        className={`${sizeClasses[size]} ${
          isFilled
            ? 'fill-[#f59e0b] text-[#f59e0b]'
            : isHalf
            ? 'fill-[#f59e0b]/50 text-[#f59e0b]'
            : 'fill-none text-[#d1d5db]'
        }`}
        aria-hidden="true"
      />
    );
  });

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`${rating} out of ${maxRating} stars`}
      >
        {stars}
      </div>
      {showValue && (
        <span className="ml-1 text-sm text-[#4b5563] font-medium">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
