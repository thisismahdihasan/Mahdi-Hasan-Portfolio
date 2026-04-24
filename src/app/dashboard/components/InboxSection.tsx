'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toContactMessage } from '@/types/contact'
import type { ContactMessage } from '@/types/contact'
import ConfirmDialog from './ConfirmDialog'

// ── Helpers ──────────────────────────────────────────────────────────────────

type Tab = 'all' | 'unread' | 'archived'

async function fetchMessages(tab: Tab): Promise<ContactMessage[]> {
  let query = supabase
    .from('contact_messages')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(50)

  if (tab !== 'all') {
    query = query.eq('status', tab)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toContactMessage)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Status dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: ContactMessage['status'] }) {
  if (status === 'unread') {
    return <span className="w-2 h-2 rounded-full bg-[#D4AF37] flex-shrink-0 mt-0.5" />
  }
  if (status === 'archived') {
    return <span className="w-2 h-2 rounded-full bg-white/20 flex-shrink-0 mt-0.5" />
  }
  return <span className="w-2 h-2 rounded-full bg-white/10 flex-shrink-0 mt-0.5" />
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ContactMessage['status'] }) {
  const styles: Record<ContactMessage['status'], string> = {
    unread: 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30',
    read: 'bg-white/[0.06] text-white/35 border border-white/[0.08]',
    archived: 'bg-white/[0.04] text-white/25 border border-white/[0.06]',
  }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${styles[status]}`}>
      {status}
    </span>
  )
}

// ── Detail Panel ─────────────────────────────────────────────────────────────
interface DetailPanelProps {
  message: ContactMessage
  onClose: () => void
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  isArchiving: boolean
  isDeleting: boolean
}

function DetailPanel({
  message,
  onClose,
  onArchive,
  onUnarchive,
  onDelete,
  isArchiving,
  isDeleting,
}: DetailPanelProps) {
  const [metaExpanded, setMetaExpanded] = useState(false)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-white/90 truncate pr-4">{message.name}</h3>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
          aria-label="Close detail panel"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Sender info */}
      <div className="space-y-2 mb-5 pb-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-white/30">mail</span>
          <a
            href={`mailto:${message.email}`}
            className="text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors truncate"
          >
            {message.email}
          </a>
        </div>
        {message.phone && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-white/30">phone</span>
            <span className="text-sm text-white/60">{message.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-white/30">schedule</span>
          <span className="text-xs text-white/40">{formatDate(message.submittedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={message.status} />
          <StatusBadge status={message.status} />
        </div>
      </div>

      {/* Message body */}
      <div className="flex-1 overflow-y-auto mb-5">
        <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{message.message}</p>
      </div>

      {/* Secondary metadata (collapsed by default) */}
      {(message.sourcePage || message.userAgent) && (
        <div className="mb-5 pb-5 border-b border-white/[0.07]">
          <button
            onClick={() => setMetaExpanded(v => !v)}
            className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/45 transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">
              {metaExpanded ? 'expand_less' : 'expand_more'}
            </span>
            Source metadata
          </button>
          {metaExpanded && (
            <div className="mt-2 space-y-1.5 pl-1">
              {message.sourcePage && (
                <p className="text-[11px] text-white/30">
                  <span className="text-white/20">Page:</span> {message.sourcePage}
                </p>
              )}
              {message.userAgent && (
                <p className="text-[11px] text-white/30 break-all">
                  <span className="text-white/20">UA:</span> {message.userAgent}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        {/* Reply */}
        <a
          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(message.email)}&su=${encodeURIComponent('Re: Portfolio Inquiry')}&body=${encodeURIComponent(`Hi ${message.name},\n\n`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-medium hover:bg-[#D4AF37]/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">reply</span>
          Reply
        </a>

        {/* Archive / Unarchive */}
        {message.status !== 'archived' ? (
          <button
            onClick={onArchive}
            disabled={isArchiving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs font-medium hover:bg-white/[0.08] hover:text-white/70 transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[14px]">archive</span>
            {isArchiving ? 'Archiving…' : 'Archive'}
          </button>
        ) : (
          <button
            onClick={onUnarchive}
            disabled={isArchiving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs font-medium hover:bg-white/[0.08] hover:text-white/70 transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[14px]">unarchive</span>
            {isArchiving ? 'Unarchiving…' : 'Unarchive'}
          </button>
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-40 ml-auto"
        >
          <span className="material-symbols-outlined text-[14px]">delete</span>
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Main InboxSection ─────────────────────────────────────────────────────────
export default function InboxSection() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey: ['dashboard-contact-messages', activeTab],
    queryFn: () => fetchMessages(activeTab),
  })

  // Unread count for the tab badge (derived from 'all' cache when available)
  const { data: allMessages = [] } = useQuery({
    queryKey: ['dashboard-contact-messages', 'all'],
    queryFn: () => fetchMessages('all'),
  })
  const unreadCount = allMessages.filter(m => m.status === 'unread').length

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-contact-messages'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-contact-messages-count'] })
  }

  // ── Mark read mutation ─────────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSettled: invalidateAll,
  })

  // ── Archive mutation ───────────────────────────────────────────────────
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSettled: invalidateAll,
  })

  // ── Unarchive mutation ─────────────────────────────────────────────────
  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'read', archived_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSettled: invalidateAll,
  })

  // ── Delete mutation ────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setSelectedId(null)
      setDeleteTarget(null)
    },
    onSettled: invalidateAll,
  })

  // ── Open message ───────────────────────────────────────────────────────
  const handleOpen = (msg: ContactMessage) => {
    setSelectedId(msg.id)
    if (msg.status === 'unread') {
      markReadMutation.mutate(msg.id)
    }
  }

  const selectedMessage = messages.find(m => m.id === selectedId) ?? null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'archived', label: 'Archived' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 w-full">
      {/* Page header */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#D4AF37] mb-1">Inbox</p>
        <h2 className="text-xl font-semibold text-white/90">Contact Messages</h2>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.07] pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedId(null) }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              ${activeTab === tab.id
                ? 'text-[#D4AF37] border-[#D4AF37]'
                : 'text-white/40 border-transparent hover:text-white/70'
              }`}
          >
            {tab.label}
            {tab.id === 'unread' && unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className={`flex gap-5 ${selectedMessage ? 'lg:flex-row' : ''}`}>

        {/* Message list */}
        <div className={`flex-1 min-w-0 ${selectedMessage ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-5 h-5 border-2 border-white/20 border-t-[#D4AF37]/70 rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-8 text-center">
              <p className="text-sm text-red-400/80">Failed to load messages.</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard-contact-messages', activeTab] })}
                className="mt-3 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-12 text-center">
              <span className="material-symbols-outlined text-[40px] text-white/10 block mb-3">inbox</span>
              <p className="text-sm text-white/30">
                {activeTab === 'unread' && 'No unread messages.'}
                {activeTab === 'archived' && 'No archived messages.'}
                {activeTab === 'all' && 'No messages yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop list (sm+) */}
              <div className="hidden sm:block rounded-2xl border border-white/[0.07] bg-[#141414] overflow-hidden">
                {messages.map((msg, i) => (
                  <button
                    key={msg.id}
                    onClick={() => handleOpen(msg)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]
                      ${selectedId === msg.id ? 'bg-[#D4AF37]/[0.06] border-l-2 border-[#D4AF37]' : ''}
                      ${i !== 0 ? 'border-t border-white/[0.05]' : ''}
                    `}
                  >
                    <StatusDot status={msg.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm truncate ${msg.status === 'unread' ? 'font-semibold text-white' : 'font-medium text-white/75'}`}>
                          {msg.name}
                        </p>
                      </div>
                      <p className="text-xs text-white/35 truncate">{msg.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <p className="text-[11px] text-white/30">{timeAgo(msg.submittedAt)}</p>
                      <StatusBadge status={msg.status} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Mobile cards (<sm) */}
              <div className="sm:hidden space-y-3">
                {messages.map(msg => (
                  <button
                    key={msg.id}
                    onClick={() => handleOpen(msg)}
                    className={`w-full text-left p-4 rounded-2xl border bg-[#141414] transition-colors
                      ${selectedId === msg.id ? 'border-[#D4AF37]/30' : 'border-white/[0.07]'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <StatusDot status={msg.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-sm truncate ${msg.status === 'unread' ? 'font-semibold text-white' : 'font-medium text-white/75'}`}>
                            {msg.name}
                          </p>
                          <p className="text-[11px] text-white/30 flex-shrink-0">{timeAgo(msg.submittedAt)}</p>
                        </div>
                        <p className="text-xs text-white/40 truncate mb-2">{msg.email}</p>
                        <p className="text-xs text-white/30 line-clamp-2 leading-relaxed">{msg.message}</p>
                        <div className="mt-2">
                          <StatusBadge status={msg.status} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 50-message limit notice */}
              {messages.length === 50 && (
                <p className="text-[11px] text-white/30 text-center mt-3 flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Showing latest 50 messages. Older messages are stored but not displayed.
                </p>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedMessage && (
          <div className="flex-1 lg:max-w-[45%] rounded-2xl border border-white/[0.07] bg-[#141414] p-6 lg:sticky lg:top-24 lg:self-start">
            <DetailPanel
              message={selectedMessage}
              onClose={() => setSelectedId(null)}
              onArchive={() => archiveMutation.mutate(selectedMessage.id)}
              onUnarchive={() => unarchiveMutation.mutate(selectedMessage.id)}
              onDelete={() => setDeleteTarget(selectedMessage.id)}
              isArchiving={archiveMutation.isPending || unarchiveMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
          </div>
        )}

        {/* Mobile detail overlay */}
        {selectedMessage && (
          <div className="lg:hidden fixed inset-0 z-50 bg-[#111111] overflow-y-auto p-6">
            <DetailPanel
              message={selectedMessage}
              onClose={() => setSelectedId(null)}
              onArchive={() => archiveMutation.mutate(selectedMessage.id)}
              onUnarchive={() => unarchiveMutation.mutate(selectedMessage.id)}
              onDelete={() => setDeleteTarget(selectedMessage.id)}
              isArchiving={archiveMutation.isPending || unarchiveMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete message"
          description="This will permanently delete the message. This action cannot be undone."
          confirmLabel="Delete"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
