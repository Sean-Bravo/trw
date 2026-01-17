interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container component that wraps content with consistent max-width and padding
 * Standardized to max-w-7xl for consistency across the app
 */
export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 md:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}


