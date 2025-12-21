import React, { useState } from 'react';
import { UserProfile, InboxMessage } from './types';
import { Mail, Trash2, Check, Star, AlertCircle, Sparkles } from 'lucide-react';
import { translations, Language } from './translations';

interface InboxProps {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
  lang?: Language;
}

const Inbox: React.FC<InboxProps> = ({ user, setUser, lang = 'sk' }) => {
  const t = (key: string) => translations[lang][key] || key;
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);

  const markAsRead = (msgId: string) => {
    const updatedMessages = user.messages.map(m => 
      m.id === msgId ? { ...m, read: true } : m
    );
    setUser({ ...user, messages: updatedMessages });
  };

  const deleteMessage = (msgId: string) => {
    const updatedMessages = user.messages.filter(m => m.id !== msgId);
    setUser({ ...user, messages: updatedMessages });
    if (selectedMessage?.id === msgId) {
      setSelectedMessage(null);
    }
  };

  const handleSelect = (msg: InboxMessage) => {
    setSelectedMessage(msg);
    if (!msg.read) {
      markAsRead(msg.id);
    }
  };

  // Sort messages by date descending
  const sortedMessages = [...(user.messages || [])].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const unreadCount = sortedMessages.filter(m => !m.read).length;

  return (
    <div className="h-[calc(100vh-140px)] bg-surface rounded-2xl shadow-sm border border-txt-light/10 flex overflow-hidden animate-fade-in dark:bg-dark-surface dark:border-white/10">
      
      {/* Sidebar List */}
      <div className={`${selectedMessage ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-1/3 border-r border-txt-light/10 bg-canvas dark:bg-dark-canvas dark:border-white/10`}>
        <div className="p-4 border-b border-txt-light/10 flex justify-between items-center bg-surface dark:bg-dark-surface dark:border-white/10">
          <h2 className="font-bold text-txt flex items-center gap-2 dark:text-txt-dark">
            <Mail size={20} className="text-primary" />
            {t('inbox.title')}
          </h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} {t('inbox.new')}
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {sortedMessages.length === 0 ? (
            <div className="p-8 text-center text-txt-muted dark:text-txt-dark-muted">
              <Mail size={40} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">{t('inbox.empty')}</p>
            </div>
          ) : (
            sortedMessages.map(msg => (
              <button
                key={msg.id}
                onClick={() => handleSelect(msg)}
                className={`w-full text-left p-4 border-b border-txt-light/10 hover:bg-surface transition-colors relative dark:border-white/5 dark:hover:bg-white/5
                  ${selectedMessage?.id === msg.id ? 'bg-surface border-l-4 border-l-primary shadow-sm dark:bg-white/5' : 'border-l-4 border-l-transparent'}
                  ${!msg.read ? 'bg-primary-50/20 dark:bg-primary/10' : ''}
                `}
              >
                {!msg.read && (
                  <span className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full"></span>
                )}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm ${!msg.read ? 'font-bold text-txt dark:text-white' : 'font-medium text-txt-muted dark:text-txt-dark-muted'}`}>
                    {msg.sender}
                  </span>
                  <span className="text-[10px] text-txt-light dark:text-gray-500">
                    {new Date(msg.date).toLocaleDateString()}
                  </span>
                </div>
                <h4 className={`text-sm truncate mb-1 ${!msg.read ? 'font-semibold text-txt dark:text-txt-dark' : 'text-txt-muted dark:text-gray-400'}`}>
                  {msg.subject}
                </h4>
                <p className="text-xs text-txt-light truncate dark:text-gray-500">
                  {msg.body.replace(/<[^>]*>?/gm, '')}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div className={`${!selectedMessage ? 'hidden md:flex' : 'flex'} flex-col flex-1 bg-surface relative min-w-0 dark:bg-dark-surface`}>
        {selectedMessage ? (
          <>
            {/* Mobile Back Button */}
            <div className="md:hidden p-4 border-b border-txt-light/10 flex items-center gap-2 text-txt-muted dark:border-white/10 dark:text-gray-400" onClick={() => setSelectedMessage(null)}>
               ← {t('inbox.back')}
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                   <h1 className="text-xl font-bold text-txt mb-2 dark:text-txt-dark">{selectedMessage.subject}</h1>
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold dark:bg-primary/20 dark:text-primary">
                       {selectedMessage.sender[0]}
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-txt dark:text-txt-dark">{selectedMessage.sender}</p>
                       <p className="text-xs text-txt-muted dark:text-gray-400">{new Date(selectedMessage.date).toLocaleString()}</p>
                     </div>
                   </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => deleteMessage(selectedMessage.id)} className="p-2 text-txt-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400" title="Vymazať">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-txt leading-relaxed border-t border-txt-light/10 pt-6 dark:border-white/10 dark:text-gray-300">
                 {selectedMessage.type === 'achievement' && (
                   <div className="flex items-center gap-2 bg-habit/10 text-habit p-3 rounded-lg mb-4 not-prose border border-habit/20 dark:bg-habit/5 dark:border-habit/10">
                     <Star className="text-habit" size={20} />
                     <span className="font-semibold text-sm">Gratulujeme k dosiahnutému úspechu!</span>
                   </div>
                 )}
                 {selectedMessage.type === 'welcome' && (
                   <div className="flex items-center gap-2 bg-primary-50 text-primary p-3 rounded-lg mb-4 not-prose border border-primary-50 dark:bg-primary/10 dark:border-primary/20 dark:text-primary">
                     <Sparkles className="text-primary" size={20} />
                     <span className="font-semibold text-sm">Vitaj na palube!</span>
                   </div>
                 )}
                 <div dangerouslySetInnerHTML={{ __html: selectedMessage.body }} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-txt-light dark:text-txt-dark-muted">
            <div className="w-20 h-20 bg-canvas rounded-full flex items-center justify-center mb-4 dark:bg-dark-canvas">
               <Mail size={40} />
            </div>
            <p className="text-txt-muted font-medium dark:text-gray-400">{t('inbox.select')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;