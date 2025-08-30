import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Fish {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

interface Scratcher {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Level {
  platforms: Platform[];
  fishes: Fish[];
  scratcher: Scratcher;
  playerStart: { x: number; y: number };
}

interface GameProps {
  user?: any;
  onBackToProfile?: () => void;
}

export const Game = ({ user, onBackToProfile }: GameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const keysRef = useRef<Set<string>>(new Set());
  
  const [score, setScore] = useState(0);
  const [fishCount, setFishCount] = useState(0);
  const [carriedFish, setCarriedFish] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [gameStarted, setGameStarted] = useState(false);
  const [hasReachedScratcher, setHasReachedScratcher] = useState(false);
  const { toast } = useToast();

  // Game objects
  const kitty = useRef<GameObject>({
    x: 100,
    y: 300,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0
  });

  // Game levels configuration
  const levels = useRef<Level[]>([
    // Nível 1 - Básico
    {
      platforms: [
        { x: 0, y: 580, width: 800, height: 20 }, // Ground
        { x: 200, y: 450, width: 150, height: 20 },
        { x: 500, y: 400, width: 100, height: 20 },
        { x: 150, y: 300, width: 120, height: 20 },
      ],
      fishes: [
        { x: 250, y: 420, width: 25, height: 20, collected: false },
        { x: 530, y: 370, width: 25, height: 20, collected: false },
      ],
      scratcher: { x: 700, y: 530, width: 60, height: 50 },
      playerStart: { x: 50, y: 530 }
    },
    // Nível 2 - Torres altas
    {
      platforms: [
        { x: 0, y: 580, width: 800, height: 20 }, // Ground
        { x: 100, y: 450, width: 80, height: 20 },
        { x: 300, y: 350, width: 80, height: 20 },
        { x: 150, y: 250, width: 80, height: 20 },
        { x: 400, y: 150, width: 80, height: 20 },
        { x: 600, y: 200, width: 120, height: 20 },
      ],
      fishes: [
        { x: 430, y: 120, width: 25, height: 20, collected: false },
        { x: 180, y: 220, width: 25, height: 20, collected: false },
        { x: 630, y: 170, width: 25, height: 20, collected: false },
      ],
      scratcher: { x: 720, y: 530, width: 60, height: 50 },
      playerStart: { x: 30, y: 530 }
    },
    // Nível 3 - Labirinto complexo
    {
      platforms: [
        { x: 0, y: 580, width: 800, height: 20 }, // Ground
        { x: 100, y: 500, width: 100, height: 20 },
        { x: 300, y: 450, width: 100, height: 20 },
        { x: 500, y: 400, width: 100, height: 20 },
        { x: 650, y: 350, width: 100, height: 20 },
        { x: 100, y: 350, width: 80, height: 20 },
        { x: 300, y: 250, width: 80, height: 20 },
        { x: 500, y: 200, width: 80, height: 20 },
        { x: 200, y: 150, width: 100, height: 20 },
        { x: 450, y: 100, width: 80, height: 20 },
      ],
      fishes: [
        { x: 530, y: 170, width: 25, height: 20, collected: false },
        { x: 230, y: 120, width: 25, height: 20, collected: false },
        { x: 480, y: 70, width: 25, height: 20, collected: false },
        { x: 680, y: 320, width: 25, height: 20, collected: false },
      ],
      scratcher: { x: 50, y: 530, width: 60, height: 50 },
      playerStart: { x: 720, y: 530 }
    }
  ]);

  const currentLevelData = levels.current[currentLevel];
  const platforms = useRef<Platform[]>(currentLevelData?.platforms || []);
  const fishes = useRef<Fish[]>(currentLevelData?.fishes || []);
  const scratcher = useRef<Scratcher>(currentLevelData?.scratcher || { x: 0, y: 0, width: 0, height: 0 });

  const GRAVITY = 0.5;
  const JUMP_FORCE = -12;
  const MOVE_SPEED = 5;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  const saveGameResult = useCallback(async () => {
    if (!user) {
      console.log('Modo demo - progresso não salvo');
      return;
    }
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Save individual game
      await supabase.from('games').insert({
        user_id: user.id,
        fish_collected: fishCount,
        score: score,
        time_taken: 60 - timeLeft
      });

      // Update user stats
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (currentStats) {
        await supabase
          .from('user_stats')
          .update({
            total_fish: currentStats.total_fish + fishCount,
            games_played: currentStats.games_played + 1,
            best_score: Math.max(currentStats.best_score, score)
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            total_fish: fishCount,
            games_played: 1,
            best_score: score
          });
      }
    } catch (error) {
      console.error('Error saving game:', error);
    }
  }, [user, fishCount, score, timeLeft]);

  const nextLevel = useCallback(() => {
    if (currentLevel < levels.current.length - 1) {
      setCurrentLevel(prev => prev + 1);
      setTimeLeft(prev => prev + 30); // Bonus time for completing level
      setCarriedFish(0);
      setHasReachedScratcher(false);
      
      // Update level data references
      const newLevelData = levels.current[currentLevel + 1];
      platforms.current = newLevelData.platforms;
      fishes.current = newLevelData.fishes.map(f => ({ ...f, collected: false }));
      scratcher.current = newLevelData.scratcher;
      
      // Reset kitty position to level start
      kitty.current.x = newLevelData.playerStart.x;
      kitty.current.y = newLevelData.playerStart.y;
      kitty.current.vx = 0;
      kitty.current.vy = 0;
      
      toast({
        title: `🎯 Nível ${currentLevel + 2}!`,
        description: "Novo desafio desbloqueado!",
      });
    } else {
      // All levels completed
      setGameStatus('won');
      saveGameResult();
      toast({
        title: "🏆 Jogo Completo!",
        description: `Você completou todos os níveis! Score Final: ${score}`,
      });
    }
  }, [currentLevel, score, saveGameResult, toast]);

  const checkWinCondition = useCallback(() => {
    const currentLevelFishes = levels.current[currentLevel].fishes;
    const allFishCollected = currentLevelFishes.every((_, index) => 
      fishes.current[index]?.collected
    );
    
    console.log('Checking win condition:', {
      allFishCollected,
      hasReachedScratcher,
      currentLevelFishes: currentLevelFishes.length,
      fishesState: fishes.current.map(f => f.collected),
      carriedFish
    });
    
    // Complete level when all fish are collected AND player reaches scratcher
    if (allFishCollected && hasReachedScratcher) {
      console.log('LEVEL COMPLETED!');
      // Level completed - delivered fish to scratcher
      setScore(prev => prev + carriedFish * 50); // Bonus for delivery
      nextLevel();
    }
  }, [currentLevel, carriedFish, hasReachedScratcher, nextLevel]);

  // Timer effect
  useEffect(() => {
    if (!gameStarted || gameStatus !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameStatus('lost');
          saveGameResult();
          toast({
            title: "⏰ Tempo esgotado!",
            description: `Você coletou ${fishCount} peixinhos. Score: ${score}`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameStatus, saveGameResult, fishCount, score, toast]);

  useEffect(() => {
    checkWinCondition();
  }, [fishCount, hasReachedScratcher, checkWinCondition]);

  // Key handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.key.toLowerCase());
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase());
  }, []);

  // Collision detection
  const checkCollision = (rect1: GameObject | Fish, rect2: Platform): boolean => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (!canvasRef.current || gameStatus !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#fef7f7';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Handle input
    if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) {
      kitty.current.vx = -MOVE_SPEED;
    } else if (keysRef.current.has('d') || keysRef.current.has('arrowright')) {
      kitty.current.vx = MOVE_SPEED;
    } else {
      kitty.current.vx *= 0.8; // Friction
    }

    // Jump
    if ((keysRef.current.has('w') || keysRef.current.has(' ') || keysRef.current.has('arrowup')) && 
        Math.abs(kitty.current.vy) < 0.1) {
      // Check if on ground/platform
      const kittyBottom = kitty.current.y + kitty.current.height;
      const onPlatform = platforms.current.some(platform => 
        kitty.current.x < platform.x + platform.width &&
        kitty.current.x + kitty.current.width > platform.x &&
        Math.abs(kittyBottom - platform.y) < 5
      );
      
      if (onPlatform) {
        kitty.current.vy = JUMP_FORCE;
      }
    }

    // Apply gravity
    kitty.current.vy += GRAVITY;

    // Update position
    kitty.current.x += kitty.current.vx;
    kitty.current.y += kitty.current.vy;

    // Platform collisions
    platforms.current.forEach(platform => {
      if (checkCollision(kitty.current, platform)) {
        // Coming from above
        if (kitty.current.vy > 0 && kitty.current.y < platform.y) {
          kitty.current.y = platform.y - kitty.current.height;
          kitty.current.vy = 0;
        }
      }
    });

    // Boundary check
    if (kitty.current.x < 0) kitty.current.x = 0;
    if (kitty.current.x + kitty.current.width > CANVAS_WIDTH) {
      kitty.current.x = CANVAS_WIDTH - kitty.current.width;
    }
    if (kitty.current.y > CANVAS_HEIGHT) {
      // Reset position if falling off
      kitty.current.x = 100;
      kitty.current.y = 300;
      kitty.current.vx = 0;
      kitty.current.vy = 0;
    }

    // Fish collection
    fishes.current.forEach(fish => {
      if (!fish.collected && checkCollision(kitty.current, fish)) {
        fish.collected = true;
        setScore(prev => prev + 10);
        setFishCount(prev => prev + 1);
        setCarriedFish(prev => prev + 1);
        toast({
          title: "🐟 Peixinho coletado!",
          description: `+10 pontos | Carregando: ${carriedFish + 1} peixe(s)`,
        });
      }
    });

    // Scratcher collision - delivery point
    if (checkCollision(kitty.current, scratcher.current)) {
      console.log('Touching scratcher! hasReachedScratcher:', hasReachedScratcher, 'carriedFish:', carriedFish);
      if (!hasReachedScratcher && carriedFish > 0) {
        setHasReachedScratcher(true);
        setScore(prev => prev + carriedFish * 20); // Bonus for reaching scratcher with fish
        toast({
          title: "🪚 Arranhador alcançado!",
          description: `Entregue ${carriedFish} peixe(s) - Bônus: +${carriedFish * 20} pontos!`,
        });
      } else if (!hasReachedScratcher) {
        setHasReachedScratcher(true);
      }
    } else {
      setHasReachedScratcher(false);
    }

    // Draw platforms
    ctx.fillStyle = '#a16207';
    platforms.current.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw scratcher (goal)
    ctx.fillStyle = hasReachedScratcher ? '#22c55e' : '#8b5cf6';
    ctx.fillRect(scratcher.current.x, scratcher.current.y, scratcher.current.width, scratcher.current.height);
    ctx.font = '20px Arial';
    ctx.fillText('🪚', scratcher.current.x + 20, scratcher.current.y + 30);

    // Draw fishes
    fishes.current.forEach(fish => {
      if (!fish.collected) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(fish.x, fish.y, fish.width, fish.height);
        // Fish emoji
        ctx.font = '16px Arial';
        ctx.fillText('🐟', fish.x, fish.y + 15);
      }
    });

    // Draw kitty
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(kitty.current.x, kitty.current.y, kitty.current.width, kitty.current.height);
    // Kitty emoji
    ctx.font = '24px Arial';
    ctx.fillText('🐱', kitty.current.x + 8, kitty.current.y + 25);

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameStatus, toast]);

  // Setup and cleanup
  useEffect(() => {
    if (!gameStarted) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, gameLoop, handleKeyDown, handleKeyUp]);

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setFishCount(0);
    setCarriedFish(0);
    setCurrentLevel(0);
    setTimeLeft(90);
    setGameStatus('playing');
    setHasReachedScratcher(false);
    
    // Initialize first level
    const firstLevel = levels.current[0];
    platforms.current = firstLevel.platforms;
    fishes.current = firstLevel.fishes.map(f => ({ ...f, collected: false }));
    scratcher.current = firstLevel.scratcher;
    
    // Reset kitty position to level start
    kitty.current = {
      x: firstLevel.playerStart.x,
      y: firstLevel.playerStart.y,
      width: 40,
      height: 40,
      vx: 0,
      vy: 0
    };
    
    toast({
      title: "🎮 Nível 1 iniciado!",
      description: "Colete peixes e leve-os ao arranhador 🪚",
    });
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameStatus('playing');
    setScore(0);
    setFishCount(0);
    setTimeLeft(60);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-background flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            🐱 Kitty Madness
          </h1>
          <p className="text-muted-foreground">Colete todos os peixinhos antes do tempo acabar!</p>
          {!user && (
            <p className="text-sm text-muted-foreground mt-2">
              ⚠️ Modo demo - progresso não será salvo
            </p>
          )}
        </div>

        <Button 
          onClick={startGame}
          className="bg-gradient-primary hover:opacity-90"
          size="lg"
        >
          🎮 Iniciar Jogo
        </Button>

        {onBackToProfile && (
          <Button 
            onClick={onBackToProfile}
            variant="outline"
          >
            Voltar ao Perfil
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          🐱 Kitty Madness
        </h1>
        <p className="text-muted-foreground">Colete todos os peixinhos antes do tempo acabar!</p>
      </div>

      <div className="flex gap-4 text-lg font-semibold flex-wrap justify-center">
        <div className="text-primary">Score: {score}</div>
        <div className="text-accent">Nível: {currentLevel + 1}/{levels.current.length}</div>
        <div className="text-accent">Coletados: {fishCount}</div>
        <div className="text-orange-500">Carregando: {carriedFish} 🐟</div>
        <div className="text-accent">Tempo: {timeLeft}s</div>
      </div>

      <Card className="p-2 shadow-lg">
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-border rounded-lg"
          style={{ background: 'linear-gradient(180deg, #e0f2fe 0%, #fef7f7 100%)' }}
        />
      </Card>

      {gameStatus !== 'playing' && (
        <Card className="p-6 text-center">
          <div className="text-2xl font-bold mb-4">
            {gameStatus === 'won' ? '🎉 Parabéns!' : '⏰ Tempo Esgotado!'}
          </div>
          <div className="mb-4 text-muted-foreground">
            Score Final: {score} | Peixinhos: {fishCount}/5
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={resetGame}
              className="bg-gradient-primary hover:opacity-90"
            >
              Jogar Novamente
            </Button>
            {onBackToProfile && (
              <Button 
                onClick={onBackToProfile}
                variant="outline"
              >
                Perfil
              </Button>
            )}
          </div>
        </Card>
      )}

      {gameStarted && gameStatus === 'playing' && (
        <div className="text-center text-sm text-muted-foreground">
          <p>🎮 Use WASD ou setas para mover</p>
          <p>⬆️ Pule nas plataformas para alcançar os peixinhos!</p>
        </div>
      )}
    </div>
  );
};