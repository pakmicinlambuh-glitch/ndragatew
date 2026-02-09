import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, MessageCircle, User, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  message_type: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

interface ChatConversation {
  user_id: string;
  user_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export default function AdminLiveChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    subscribeToMessages();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchConversations = async () => {
    try {
      // Get all unique users who have sent messages
      const { data: chatMessages, error } = await supabase
        .from('chat_messages')
        .select('sender_id, message, created_at, is_read')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by sender and get latest message
      const userMap = new Map<string, ChatConversation>();
      
      for (const msg of chatMessages || []) {
        if (!userMap.has(msg.sender_id)) {
          // Fetch user email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', msg.sender_id)
            .single();

          userMap.set(msg.sender_id, {
            user_id: msg.sender_id,
            user_email: profile?.email || 'Unknown',
            last_message: msg.message,
            last_message_at: msg.created_at,
            unread_count: msg.is_read ? 0 : 1,
          });
        } else if (!msg.is_read) {
          const conv = userMap.get(msg.sender_id)!;
          conv.unread_count++;
        }
      }

      setConversations(Array.from(userMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      const unreadIds = data
        ?.filter(m => m.sender_id === userId && !m.is_read)
        .map(m => m.id);

      if (unreadIds && unreadIds.length > 0) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('admin-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Update conversations
          fetchConversations();
          
          // Update messages if viewing this conversation
          if (selectedUser && (newMsg.sender_id === selectedUser || newMsg.receiver_id === selectedUser)) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user?.id,
        receiver_id: selectedUser,
        message: newMessage.trim(),
        message_type: 'text',
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Gagal Mengirim',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Chat</h1>
        <p className="text-muted-foreground">Kelola chat dengan merchant</p>
      </div>

      <div className="grid h-[600px] gap-4 lg:grid-cols-3">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Percakapan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px]">
              {conversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tidak ada percakapan
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <button
                      key={conv.user_id}
                      onClick={() => setSelectedUser(conv.user_id)}
                      className={`w-full p-4 text-left transition-colors hover:bg-muted ${
                        selectedUser === conv.user_id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="truncate font-medium">{conv.user_email}</p>
                            {conv.unread_count > 0 && (
                              <Badge className="bg-primary">{conv.unread_count}</Badge>
                            )}
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {conv.last_message}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="flex flex-col lg:col-span-2">
          {selectedUser ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {conversations.find(c => c.user_id === selectedUser)?.user_email}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[440px] p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isAdmin = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              isAdmin
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <div
                              className={`mt-1 flex items-center gap-1 text-xs ${
                                isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            >
                              <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                              {isAdmin && (
                                msg.is_read ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>

              <div className="border-t p-4">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ketik pesan..."
                    disabled={sending}
                  />
                  <Button type="submit" disabled={sending || !newMessage.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CardContent className="flex h-full items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Pilih percakapan untuk memulai chat
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
