import { Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function LibraryAction() {
  const navigate = useNavigate();

  return (
    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/library')}>
      <Library className="w-4 h-4" />
      <span className="hidden sm:inline">Library</span>
    </Button>
  );
}
