import { useState, useEffect } from 'react';
import { Auth } from '@/components/Auth';
import { UserProfile } from '@/components/UserProfile';
import { Game } from '@/components/Game';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Mock user for development when Supabase is not configured
const mockUser = {
  id: 'mock-user-id',
  email: 'player@kittymadness.com'
};

export const GameContainer = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'profile' | 'game'>('profile');
  const [useMockMode, setUseMockMode] = useState(false);

  useEffect(() => {
    // Check if Supabase is properly configured
    const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && 
                             import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!hasSupabaseConfig) {
      console.log('Supabase não configurado - usando modo de demonstração');
      setUseMockMode(true);
      setLoading(false);
      return;
    }

    // Only import and use Supabase if it's configured
    import('@/integrations/supabase/client').then(({ supabase }) => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  // Demo mode when Supabase is not configured
  if (useMockMode) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur border-border/30">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              🐱 Kitty Madness
            </CardTitle>
            <CardDescription>
              Modo demonstração - Para salvar progresso, conecte ao Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>⚠️ Supabase não configurado</p>
              <p>Seu progresso não será salvo</p>
            </div>
            
            <Button 
              onClick={() => setCurrentView('game')}
              className="w-full bg-gradient-primary hover:opacity-90"
              size="lg"
            >
              🎮 Jogar sem Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (currentView === 'game') {
    return (
      <Game 
        user={user} 
        onBackToProfile={() => setCurrentView('profile')} 
      />
    );
  }

  return (
    <UserProfile 
      user={user} 
      onStartGame={() => setCurrentView('game')} 
    />
  );
};