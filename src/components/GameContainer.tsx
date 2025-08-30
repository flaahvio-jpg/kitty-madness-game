import { useState, useEffect } from 'react';
import { Auth } from '@/components/Auth';
import { UserProfile } from '@/components/UserProfile';
import { Game } from '@/components/Game';
import { supabase } from '@/integrations/supabase/client';

export const GameContainer = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'profile' | 'game'>('profile');

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
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