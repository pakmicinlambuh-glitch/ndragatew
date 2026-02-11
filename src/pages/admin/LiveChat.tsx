import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Send, Loader2, MessageCircle, User, Check, CheckCheck,
  Search, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

const QUICK_REPLIES = [
  'Terima kasih atas laporannya!',
  'Mohon tunggu sebentar.',
  'Apakah ada hal lain yang bisa dibantu?',
  'Masalah sudah kami proses.',
];

export default function AdminLiveChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    const cleanup = subscribeToMessages();
    return cleanup;
  }, []);

  useEffect(() => {
    if (selectedUser) fetchMessages(selectedUser);
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      setFilteredConversations(
        conversations.filter(c => c.user_email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  }, [searchQuery, conversations]);

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const fetchConversations = async () => {
    try {
      const { data: chatMessages, error } = await supabase
        .from('chat_messages')
        .select('sender_id, receiver_id, message, created_at, is_read')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Collect unique non-admin user IDs
      const userIds = new Set<string>();
      for (const msg of chatMessages || []) {
        if (msg.sender_id !== user?.id) userIds.add(msg.sender_id);
        if (msg.receiver_id && msg.receiver_id !== user?.id) userIds.add(msg.receiver_id);
      }

      // Batch fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);

      const userMap = new Map<string, ChatConversation>();
      for (const msg of chatMessages || []) {
        const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
        if (!otherUserId || otherUserId === user?.id) continue;

        if (!userMap.has(otherUserId)) {
          userMap.set(otherUserId, {
            user_id: otherUserId,
            user_email: profileMap.get(otherUserId) || 'Unknown',
            last_message: msg.message,
            last_message_at: msg.created_at,
            unread_count: (msg.sender_id !== user?.id && !msg.is_read) ? 1 : 0,
          });
        } else if (msg.sender_id !== user?.id && !msg.is_read) {
          userMap.get(otherUserId)!.unread_count++;
        }
      }

      const sorted = Array.from(userMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
      setConversations(sorted);
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

      const unreadIds = data?.filter(m => m.sender_id === userId && !m.is_read).map(m => m.id);
      if (unreadIds && unreadIds.length > 0) {
        await supabase.from('chat_messages').update({ is_read: true }).in('id', unreadIds);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('admin-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        fetchConversations();
        if (selectedUser && (newMsg.sender_id === selectedUser || newMsg.receiver_id === selectedUser)) {
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.sender_id === selectedUser) {
            supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const sendMessage = async (e?: React.FormEvent, text?: string) => {
    e?.preventDefault();
    const msgText = text || newMessage.trim();
    if (!msgText || !selectedUser || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user?.id,
        receiver_id: selectedUser,
        message: msgText,
        message_type: 'text',
      });
      if (error) throw error;
      if (!text) setNewMessage('');
    } catch (error: any) {
      toast({ title: 'Gagal Mengirim', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const markResolved = async () => {
    if (!selectedUser) return;
    const msgIds = messages.filter(m => m.sender_id === selectedUser).map(m => m.id);
    if (msgIds.length > 0) {
      await supabase.from('chat_messages').update({ is_resolved: true }).in('id', msgIds);
      toast({ title: 'Percakapan ditandai selesai' });
    }
  };

  const selectConversation = (userId: string) => {
    setSelectedUser(userId);
    setMobileView('chat');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedConv = conversations.find(c => c.user_id === selectedUser);

  const ConversationList = () => (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari percakapan..."
            className="pl-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">Tidak ada percakapan</p>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <button
              key={conv.user_id}
              onClick={() => selectConversation(conv.user_id)}
              className={cn(
                'w-full border-b p-3 text-left transition-colors hover:bg-muted/50',
                selectedUser === conv.user_id && 'bg-muted'
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {conv.user_email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{conv.user_email}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: idLocale })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs text-muted-foreground">{conv.last_message}</p>
                    {conv.unread_count > 0 && (
                      <Badge className="ml-2 shrink-0 bg-primary text-primary-foreground text-[10px] h-5 min-w-5 px-1.5">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );

  const ChatWindow = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileView('list')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {selectedConv?.user_email?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{selectedConv?.user_email}</p>
          <p className="text-xs text-muted-foreground">Merchant</p>
        </div>
        <Button variant="outline" size="sm" onClick={markResolved} className="shrink-0 gap-1.5 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Selesai</span>
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map(msg => {
            const isAdmin = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                {!isAdmin && (
                  <Avatar className="mr-2 mt-1 h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5',
                    isAdmin ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted'
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <div className={cn(
                    'mt-1 flex items-center gap-1 text-[10px]',
                    isAdmin ? 'justify-end text-primary-foreground/60' : 'text-muted-foreground'
                  )}>
                    <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                    {isAdmin && (msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Quick Replies */}
      <div className="flex gap-2 overflow-x-auto border-t px-3 py-2">
        {QUICK_REPLIES.map(reply => (
          <Button
            key={reply}
            variant="outline"
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => sendMessage(undefined, reply)}
            disabled={sending}
          >
            {reply}
          </Button>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Ketik pesan..."
            disabled={sending}
            className="rounded-full"
          />
          <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="shrink-0 rounded-full">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Live Chat</h1>
        <p className="text-muted-foreground">Kelola chat dengan merchant</p>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Desktop: side-by-side */}
        <div className="hidden w-80 shrink-0 border-r lg:block">
          <ConversationList />
        </div>
        <div className="hidden flex-1 lg:flex lg:flex-col">
          {selectedUser ? (
            <ChatWindow />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto rounded-full bg-muted p-4 w-fit">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="mt-4 text-muted-foreground">Pilih percakapan untuk memulai</p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile: toggle between list and chat */}
        <div className="flex flex-1 flex-col lg:hidden">
          {mobileView === 'list' ? (
            <ConversationList />
          ) : selectedUser ? (
            <ChatWindow />
          ) : (
            <ConversationList />
          )}
        </div>
      </div>
    </div>
  );
}
