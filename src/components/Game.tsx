import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

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

export const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const keysRef = useRef<Set<string>>(new Set());
  
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Game objects
  const kitty = useRef<GameObject>({
    x: 100,
    y: 300,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0
  });

  const platforms = useRef<Platform[]>([
    { x: 0, y: 580, width: 800, height: 20 }, // Ground
    { x: 200, y: 450, width: 150, height: 20 },
    { x: 450, y: 350, width: 120, height: 20 },
    { x: 100, y: 250, width: 100, height: 20 },
    { x: 600, y: 200, width: 120, height: 20 },
    { x: 350, y: 150, width: 100, height: 20 },
  ]);

  const fishes = useRef<Fish[]>([
    { x: 250, y: 420, width: 25, height: 20, collected: false },
    { x: 500, y: 320, width: 25, height: 20, collected: false },
    { x: 130, y: 220, width: 25, height: 20, collected: false },
    { x: 650, y: 170, width: 25, height: 20, collected: false },
    { x: 380, y: 120, width: 25, height: 20, collected: false },
  ]);

  const GRAVITY = 0.5;
  const JUMP_FORCE = -12;
  const MOVE_SPEED = 5;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

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
    if (!canvasRef.current || gameOver) return;

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
        toast('🐟 Peixinho coletado! +10 pontos');
      }
    });

    // Draw platforms
    ctx.fillStyle = '#a16207';
    platforms.current.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

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

    // Check win condition
    const allFishCollected = fishes.current.every(fish => fish.collected);
    if (allFishCollected && !gameOver) {
      setGameOver(true);
      toast('🎉 Parabéns! Você coletou todos os peixinhos!');
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver]);

  // Timer effect
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          toast('⏰ Tempo esgotado!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameOver]);

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
    setTimeLeft(60);
    setGameOver(false);
    
    // Reset kitty position
    kitty.current = {
      x: 100,
      y: 300,
      width: 40,
      height: 40,
      vx: 0,
      vy: 0
    };

    // Reset fishes
    fishes.current.forEach(fish => fish.collected = false);
    
    toast('🎮 Jogo iniciado! Use WASD ou setas para mover');
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setTimeLeft(60);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2 text-foreground">🐱 Kitty Madness</h1>
        <p className="text-muted-foreground">Colete todos os peixinhos antes do tempo acabar!</p>
      </div>

      <div className="flex gap-6 text-lg font-semibold">
        <div className="text-primary">Score: {score}</div>
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

      <div className="flex gap-4">
        {!gameStarted && !gameOver && (
          <button
            onClick={startGame}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-md"
          >
            🎮 Iniciar Jogo
          </button>
        )}
        
        {gameOver && (
          <button
            onClick={resetGame}
            className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-semibold hover:bg-accent/90 transition-colors shadow-md"
          >
            🔄 Jogar Novamente
          </button>
        )}
      </div>

      {gameStarted && (
        <div className="text-center text-sm text-muted-foreground">
          <p>🎮 Use WASD ou setas para mover</p>
          <p>⬆️ Pule nas plataformas para alcançar os peixinhos!</p>
        </div>
      )}
    </div>
  );
};