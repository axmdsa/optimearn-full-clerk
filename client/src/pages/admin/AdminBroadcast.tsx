import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Bell, Users, Megaphone } from "lucide-react";

export default function AdminBroadcast() {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'achievement'>('info');
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [mode, setMode] = useState<'broadcast' | 'targeted'>('broadcast');

  const broadcast = trpc.admin.notifications.broadcast.useMutation({
    onSuccess: () => { toast.success("Notification broadcast sent!"); setTitle(""); setContent(""); }
  });
  const sendToUser = trpc.admin.notifications.sendToUser.useMutation({
    onSuccess: () => { toast.success("Notification sent to user!"); setTitle(""); setContent(""); setTargetUserId(""); }
  });

  const handleSend = () => {
    if (!title.trim() || !content.trim()) return toast.error("Title and content are required");
    if (mode === 'broadcast') {
      broadcast.mutate({ title, content, type });
    } else {
      if (!targetUserId) return toast.error("User ID is required for targeted notification");
      sendToUser.mutate({ userId: Number(targetUserId), title, content, type });
    }
  };

  const isPending = broadcast.isPending || sendToUser.isPending;

  const typeColors = {
    info: 'border-blue-500/30 bg-blue-500/5',
    success: 'border-primary/30 bg-primary/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    achievement: 'border-purple-500/30 bg-purple-500/5',
  };

  return (
    <AdminLayout title="Broadcast" subtitle="Send notifications to users">
      <div className="max-w-2xl space-y-6">
        {/* Mode toggle */}
        <div className="flex gap-3">
          <button onClick={() => setMode('broadcast')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'broadcast' ? 'bg-primary text-black' : 'bg-secondary text-gray-400 hover:bg-secondary/80'}`}>
            <Megaphone className="w-4 h-4" /> Broadcast to All
          </button>
          <button onClick={() => setMode('targeted')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'targeted' ? 'bg-primary text-black' : 'bg-secondary text-gray-400 hover:bg-secondary/80'}`}>
            <Users className="w-4 h-4" /> Send to User
          </button>
        </div>

        {/* Form */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-white font-semibold">{mode === 'broadcast' ? 'Broadcast Notification' : 'Targeted Notification'}</h3>
          </div>

          {mode === 'targeted' && (
            <div>
              <label className="text-gray-400 text-xs mb-1 block">User ID</label>
              <input type="number" value={targetUserId} onChange={e => setTargetUserId(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="Enter user ID..." />
            </div>
          )}

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Notification Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['info', 'success', 'warning', 'achievement'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`py-2 rounded-lg text-xs font-medium capitalize transition-all border ${type === t ? typeColors[t] + ' text-white' : 'border-border bg-secondary text-gray-400 hover:bg-secondary/80'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="Notification title..." />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Content *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" placeholder="Notification message..." />
          </div>

          {/* Preview */}
          {(title || content) && (
            <div className={`border rounded-xl p-4 ${typeColors[type]}`}>
              <div className="text-xs text-gray-400 mb-2">Preview:</div>
              <div className="text-white font-semibold text-sm">{title || 'Title...'}</div>
              <div className="text-gray-300 text-sm mt-1">{content || 'Content...'}</div>
            </div>
          )}

          <button onClick={handleSend} disabled={isPending || !title || !content}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
            {isPending ? 'Sending...' : mode === 'broadcast' ? 'Send to All Users' : 'Send to User'}
          </button>

          {mode === 'broadcast' && (
            <p className="text-gray-500 text-xs text-center">This will send a notification to every registered user on the platform.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
