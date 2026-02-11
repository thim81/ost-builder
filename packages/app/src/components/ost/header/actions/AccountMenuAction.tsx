import { useEffect, useMemo, useState } from 'react';
import { LogIn, LogOut, User, FolderOpen, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAuthMe, logout, type AuthUser } from '@/lib/storedShareApi';
import { toast } from '@/components/ui/use-toast';

export function AccountMenuAction() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const initials = useMemo(() => {
    const source = user?.name || user?.email || '';
    return source.trim().slice(0, 1).toUpperCase();
  }, [user?.email, user?.name]);

  const refreshSession = async () => {
    setLoading(true);
    try {
      const data = await getAuthMe();
      setFeatureEnabled(data.featureEnabled);
      setUser(data.user);
    } catch {
      setFeatureEnabled(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const handleLogin = () => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/api/auth/login?provider=github&returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      toast({ title: 'Signed out', description: 'You have been logged out.' });
    } catch (error) {
      toast({
        title: 'Logout failed',
        description: error instanceof Error ? error.message : 'Could not log out.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Account menu">
          <Avatar className="h-8 w-8 border border-border">
            {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name || 'User avatar'} /> : null}
            <AvatarFallback className="text-xs">
              {user ? initials || <User className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {loading
            ? 'Checking account...'
            : user
              ? user.name || user.email || 'Signed in'
              : 'Not signed in'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!featureEnabled && (
          <DropdownMenuItem disabled>
            <User className="w-4 h-4 mr-2" />
            Stored share disabled
          </DropdownMenuItem>
        )}

        {featureEnabled && !user && (
          <DropdownMenuItem onClick={handleLogin}>
            <LogIn className="w-4 h-4 mr-2" />
            Login with GitHub
          </DropdownMenuItem>
        )}

        {featureEnabled && user && (
          <>
            <DropdownMenuItem onClick={() => navigate('/shares')}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Manage shares
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
