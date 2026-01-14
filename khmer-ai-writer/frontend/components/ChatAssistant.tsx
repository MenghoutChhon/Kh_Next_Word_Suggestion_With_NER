import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Bot, Building2, Crown, MessageSquare, Send, User, Zap } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatAssistantProps {
  userTier: string;
}

function ChatAssistant({ userTier }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Welcome to Khmer AI Writer. Ask for drafting, rewriting, tone, or Khmer suggestions. As a ${userTier} user, you have tailored assistance.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getTierIcon = () => {
    switch (userTier) {
      case 'premium':
        return <Crown className="h-4 w-4 text-warning" />;
      case 'business':
        return <Building2 className="h-4 w-4 text-primary" />;
      default:
        return <Zap className="h-4 w-4 text-primary" />;
    }
  };

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('upgrade') || lowerMessage.includes('pricing') || lowerMessage.includes('plan')) {
      return `Upgrade Options

Free - $0/month
- Core writing and chat
- Standard speed

Premium - $29/month
- Longer context
- Higher quality generations
- API access

Business - $99/month
- Team workspaces
- Usage analytics
- Priority support

Use the Upgrade page to change your plan, or contact sales for enterprise terms.`;
    }

    if (lowerMessage.includes('terms') || lowerMessage.includes('condition') || lowerMessage.includes('legal')) {
      return `Terms & Conditions

- You own your content and are responsible for what you submit.
- We provide AI writing assistance as-is.
- We may suspend accounts for abuse or policy violations.
- Data retention and export options are available in Settings.`;
    }

    if (lowerMessage.includes('writing') || lowerMessage.includes('prompt') || lowerMessage.includes('suggest')) {
      return `Writing Tips

- Give a clear goal and audience.
- Provide a short outline or bullets.
- Specify tone (formal, friendly, persuasive).
- Ask for alternatives or shorter/longer versions.

${
  userTier === 'business' || userTier === 'premium'
    ? 'Premium and Business users can save team prompts and templates.'
    : 'Upgrade for advanced writing features and faster generations.'
}`;
    }

    if (lowerMessage.includes('report') || lowerMessage.includes('compliance') || lowerMessage.includes('insight')) {
      return `Usage & Insights

- Usage summaries (tokens, generations, active users)
- Quality and style metrics
- Team and workspace activity

${
  userTier === 'business'
    ? 'Business tier includes team insights and advanced analytics.'
    : userTier === 'premium'
    ? 'Premium tier includes team insights and usage analytics.'
    : 'Basic usage summaries are available. Upgrade for more detail.'
}`;
    }

    if (lowerMessage.includes('api') || lowerMessage.includes('integration')) {
      return `API Integration

Endpoints:
- POST /api/lm/suggest
- POST /api/ner/extract

Rate limits depend on plan. Business plans include higher limits and priority support.`;
    }

    if (lowerMessage.includes('privacy') || lowerMessage.includes('data')) {
      return `Privacy & Data

- Your prompts and outputs belong to you.
- You can export or delete your data from Settings.
- Enterprise plans can request custom retention policies.`;
    }

    return `Khmer AI Writer Assistant

I can help with:
- Drafting and rewriting
- Tone and style changes
- Summaries and outlines
- API usage and integration
- Plan and billing questions

${
  userTier === 'business'
    ? 'Business users get team tools and priority support.'
    : userTier === 'premium'
    ? 'Premium users get team tools and higher quality.'
    : 'Free users get core features. Upgrade for advanced options.'
}

What would you like to do?`;
  };

  const handleSend = (messageText?: string) => {
    const textToSend = typeof messageText === 'string' ? messageText : input.trim();
    if (!textToSend) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(textToSend),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">AI Chat</h2>
        <Badge className="flex items-center gap-1">
          {getTierIcon()}
          {userTier.toUpperCase()}
        </Badge>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Quick Questions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <Button variant="outline" className="justify-start text-left" onClick={() => handleQuickQuestion('How can you help me write in Khmer?')}>
              Writing Help
            </Button>
            <Button variant="outline" className="justify-start text-left" onClick={() => handleQuickQuestion('How do I upgrade my plan?')}>
              Upgrade Plans
            </Button>
            <Button variant="outline" className="justify-start text-left" onClick={() => handleQuickQuestion('Show me your terms and conditions')}>
              Terms & Conditions
            </Button>
            <Button variant="outline" className="justify-start text-left" onClick={() => handleQuickQuestion('What API endpoints are available?')}>
              API Integration
            </Button>
            <Button variant="outline" className="justify-start text-left" onClick={() => handleQuickQuestion('How is my data protected?')}>
              Privacy & Data
            </Button>
            <Button variant="outline" className="justify-start text-left" onClick={() => handleQuickQuestion('What insights are available?')}>
              Insights
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-[600px] flex flex-col glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Khmer AI Writer Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-muted text-foreground border border-border'
                      : 'bg-card text-foreground border border-border'
                  }`}
                >
                  <div
                    className={`whitespace-pre-wrap text-sm ${
                      message.role === 'user' ? 'text-foreground' : 'text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-muted-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="glass-card p-3 rounded-lg border border-border">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask for writing help, summaries, or API usage..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { ChatAssistant };
export default ChatAssistant;
