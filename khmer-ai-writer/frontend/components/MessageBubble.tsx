import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Bot className="size-5 text-white" />
        </div>
      )}
      <div
        className={`inline-block p-4 rounded-2xl max-w-[80%] ${
          message.role === 'assistant'
            ? 'bg-card border border-border'
            : 'bg-muted border border-border'
        }`}
      >
        <div className="text-sm text-foreground leading-relaxed wrap-break-word">{message.content}</div>
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-muted-foreground' : 'text-muted-foreground'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
      {isUser && (
        <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="size-5 text-foreground" />
        </div>
      )}
    </div>
  );
}
