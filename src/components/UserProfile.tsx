import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  total_fish: number;
  games_played: number;
  best_score: number;
}

export const UserProfile = ({ user, onStartGame }: { 
  user: any; 
  onStartGame: () => void;
}) => {
  const [stats, setStats] = useState<UserStats>({ total_fish: 0, games_played: 0, best_score: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUserStats();
  }, [user]);

  const loadUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setStats(data);
      }
    } catch (error: any) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/90 backdrop-blur border-border/30">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            🐱 Kitty Madness
          </CardTitle>
          <CardDescription>
            Bem-vindo, {user.email}!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center">Carregando estatísticas...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gradient-subtle p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">🐟 {stats.total_fish}</div>
                <div className="text-sm text-muted-foreground">Peixinhos Coletados</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-subtle p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-accent">🎮 {stats.games_played}</div>
                  <div className="text-xs text-muted-foreground">Jogos</div>
                </div>
                <div className="bg-gradient-subtle p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-accent">🏆 {stats.best_score}</div>
                  <div className="text-xs text-muted-foreground">Melhor Score</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              onClick={onStartGame}
              className="w-full bg-gradient-primary hover:opacity-90"
              size="lg"
            >
              🎮 Jogar Agora
            </Button>
            
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};