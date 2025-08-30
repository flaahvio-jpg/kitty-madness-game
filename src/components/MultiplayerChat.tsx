import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  user_id: string;
  player_name: string;
  message: string;
  message_type: 'chat' | 'system' | 'game';
  created_at: string;
}

interface Player {
  id: string;
  user_id: string;
  player_name: string;
  position_x: number;
  position_y: number;
  fish_collected: number;
  is_ready: boolean;
  is_online: boolean;
}

interface MultiplayerChatProps {
  roomId: string;
  user: any;
  players: Player[];
}

export const MultiplayerChat = ({ roomId, user, players }: MultiplayerChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load messages and subscribe to real-time updates
  useEffect(() => {
    loadMessages();
    
    const messagesChannel = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('New message:', payload);
          setMessages(prev => [...prev, payload.new as ChatMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [roomId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          player_name: user.user_metadata?.display_name || user.email || 'Jogador',
          message: messageText,
          message_type: 'chat'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      });
      setNewMessage(messageText); // Restore message on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStyle = (messageType: string, isOwn: boolean) => {
    switch (messageType) {
      case 'system':
        return 'bg-secondary/50 text-secondary-foreground border-l-4 border-secondary';
      case 'game':
        return 'bg-accent/50 text-accent-foreground border-l-4 border-accent';
      default:
        return isOwn 
          ? 'bg-primary/20 text-primary-foreground border-l-4 border-primary ml-4' 
          : 'bg-muted/50 text-muted-foreground border-l-4 border-muted mr-4';
    }
  };

  return (
    <Card className="h-[600px] flex flex-col game-ui-card">
      {/* Players List */}
      <div className="p-4 border-b">
        <h3 className="font-bold mb-3 text-primary">👥 Jogadores ({players.length}/4)</h3>
        <div className="space-y-2">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${player.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={player.user_id === user.id ? 'font-bold text-primary' : ''}>
                  {player.player_name}
                  {player.user_id === user.id && ' (Você)'}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                🐟 {player.fish_collected}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((message) => {
            const isOwn = message.user_id === user.id;
            const isSystemMessage = message.message_type !== 'chat';
            
            return (
              <div key={message.id} className={`rounded-lg p-3 ${getMessageStyle(message.message_type, isOwn)}`}>
                {!isSystemMessage && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">
                      {isOwn ? 'Você' : message.player_name}
                    </span>
                    <span className="text-xs opacity-60">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                )}
                <div className={`${isSystemMessage ? 'text-center font-medium' : ''}`}>
                  {message.message}
                </div>
                {isSystemMessage && (
                  <div className="text-xs opacity-60 text-center mt-1">
                    {formatTime(message.created_at)}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            maxLength={500}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size="sm"
            className="bg-gradient-primary hover:opacity-90"
          >
            📤
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Pressione Enter para enviar
        </div>
      </div>
    </Card>
  );
};