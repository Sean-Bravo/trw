import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-24">
      <Container>
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon Wrapper */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-8">
            <FileQuestion className="h-10 w-10 text-[#3b82f6]" />
          </div>

          {/* Text Content */}
          <h1 className="text-4xl font-bold text-[#1a365d] font-poppins mb-4">
            Page not found
          </h1>

          <p className="text-lg text-[#6b7280] mb-8">
            Sorry, we couldn't find the page you're looking for. It might have been moved, 
            renamed, or the CSV file you are looking for has expired.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" href="/">
              Go back home
            </Button>
            <Button variant="secondary" href="/#contact">
              Contact support
            </Button>
          </div>
          
          {/* Helper Link */}
          <div className="mt-12 pt-8 border-t border-gray-100">
             <p className="text-sm text-[#9ca3af]">
               Looking for documentation? <Link href="/#docs" className="text-[#3b82f6] hover:underline">Browse the docs</Link>
             </p>
          </div>
        </div>
      </Container>
    </div>
  );
}