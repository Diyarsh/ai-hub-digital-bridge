import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Edit2, Trash2, Timer, Copy, Check, CheckCircle2, AlertCircle, XCircle, CheckCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatChatTime } from "@/lib/chat-time";
import skaiAvatar from "@/assets/skai-ava.png";

interface MessageBubbleProps {
  text: string;
  role: 'user' | 'assistant';
  messageId?: string;
  isLoading?: boolean;
  streaming?: boolean;
  createdAt?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  files?: { name: string; url?: string; type?: string }[];
  durationMs?: number;
  feedback?: 'correct' | 'partially-correct' | 'incorrect';
  feedbackDetails?: string;
  onFeedbackChange?: (value: 'correct' | 'partially-correct' | 'incorrect' | null, reasons?: string[], details?: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  role,
  messageId,
  isLoading,
  streaming,
  createdAt,
  onEdit,
  onDelete,
  onCopy,
  files = [],
  durationMs,
  feedback,
  feedbackDetails,
  onFeedbackChange,
}) => {
  const OTHER_TAG = "Другое";
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [comment, setComment] = useState(feedbackDetails || "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCommentField, setShowCommentField] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const feedbackContainerRef = useRef<HTMLDivElement>(null);
  const commentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedComment = feedbackDetails || "";
    setComment(savedComment);
    if (savedComment.trim().length > 0) {
      setShowCommentField(true);
      setSelectedTags((prev) => (prev.includes(OTHER_TAG) ? prev : [...prev, OTHER_TAG]));
    }
  }, [feedbackDetails]);

  // Reset copied state after 3 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      onCopy?.();
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      onCopy?.();
    });
  };

  const handleFeedbackClick = (value: 'correct' | 'partially-correct' | 'incorrect') => {
    if (feedback === value) {
      // Если кликнули на уже выбранную оценку, снимаем её
      onFeedbackChange?.(null, [], "");
      setComment("");
      setSelectedTags([]);
      setShowCommentField(false);
      setSubmitted(false);
    } else {
      // Выбираем новую оценку
      onFeedbackChange?.(value, selectedTags, comment.trim());
      if (value === 'correct') {
        setComment("");
        setSelectedTags([]);
        setShowCommentField(false);
        setSubmitted(true);
      } else {
        setShowCommentField(true);
        setSubmitted(false);
      }
    }
  };

  const handleCommentChange = (newComment: string) => {
    setComment(newComment);
    if (feedback && (feedback === 'partially-correct' || feedback === 'incorrect')) {
      onFeedbackChange?.(feedback, selectedTags, newComment);
    }
  };

  const completeFeedback = () => {
    if (feedback) {
      onFeedbackChange?.(feedback, selectedTags, comment.trim());
      setSubmitted(true);
    }
  };

  const handleSave = () => {
    completeFeedback();
  };

  const handleSkip = () => {
    completeFeedback();
  };

  const needsComment = (feedback === 'partially-correct' || feedback === 'incorrect') && showCommentField && !submitted;

  const hasFeedback = role === 'assistant' && onFeedbackChange && !isLoading;
  const hasComment = role === 'assistant' && !isLoading && needsComment && !submitted;

  // Синхронизация ширины контейнера комментария с контейнером отзывов
  
  return (
    <div className={cn(
      role === "user" ? "max-w-[85%] ml-auto" : "w-full max-w-3xl",
      "relative rounded-2xl px-4 py-3 text-sm",
      needsComment && !submitted ? "mb-[420px]" : (hasFeedback || hasComment ? "mb-20" : "mb-2"),
      role === "user"
        ? "bg-muted text-foreground border border-border/50 shadow-sm"
        : "bg-card border border-border/50 shadow-sm"
    )}>
      {/* Message Actions - only for user messages */}
      {role === 'user' && (onEdit || onDelete) && (
      <div className="flex gap-2 mb-1 justify-end text-muted-foreground">
        {onEdit && <button title="Edit" onClick={onEdit} className="hover:text-foreground transition-colors"><Edit2 size={16} /></button>}
        {onDelete && <button title="Delete" onClick={onDelete} className="hover:text-destructive transition-colors"><Trash2 size={16} /></button>}
      </div>
      )}
      {/* Message Content */}
      {role === "assistant" && isLoading ? (
        <div className="flex items-center gap-2 py-1">
          <img src={skaiAvatar} alt="SKAI" className="h-6 w-6 rounded-full object-cover animate-pulse" />
          <span className="text-xs text-muted-foreground">Генерирую ответ…</span>
        </div>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || '');
              const inline = !match;
              return !inline && match ? (
                <SyntaxHighlighter style={atomDark as any} language={match[1]} PreTag="div">
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>{children}</code>
              );
            },
            a({href, children, ...props}) {
              return <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
            }
          }}
        >
          {isLoading && streaming ? `${text}▍` : text}
        </ReactMarkdown>
      )}
      {/* File Previews */}
      {files?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((file, i) => (
            <div key={i} className="rounded border p-2 bg-muted text-xs">
              <span className="font-medium">{file.name}</span>
              {/* Add preview based on file type here if needed */}
            </div>
          ))}
        </div>
      )}

      {/* Telegram-style time (and status for user) */}
      {!isLoading && createdAt && (
        <div
          className={cn(
            "mt-1.5 flex items-center justify-end gap-1 select-none",
            role === "user" ? "text-muted-foreground/80" : "text-muted-foreground/70"
          )}
        >
          <span className="text-[11px] tabular-nums leading-none">
            {formatChatTime(createdAt)}
          </span>
          {role === "user" && (
            <CheckCheck className="h-3.5 w-3.5 opacity-80" aria-hidden />
          )}
        </div>
      )}

      {/* Message Actions for assistant messages */}
      {role === 'assistant' && !isLoading && onCopy && (
        <div className="mt-2 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={handleCopyClick}
              >
                {copied ? <Check size={14} className="text-muted-foreground" /> : <Copy size={14} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{copied ? t('message.copied') || 'Скопировано' : t('message.copy')}</p>
            </TooltipContent>
          </Tooltip>
          {durationMs !== undefined && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Timer size={14} className="text-muted-foreground" />
              {(durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}
      
      {/* Feedback container positioned on the border */}
      {role === 'assistant' && !isLoading && onFeedbackChange && (
        <div ref={feedbackContainerRef} className="absolute -bottom-3 right-4 flex items-center gap-0 flex-wrap border border-border/50 rounded-xl overflow-hidden bg-background divide-x divide-border/50 shadow-md">
          <button
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-l-lg text-sm font-medium transition-all",
              feedback === 'correct'
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-green-100/60 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300"
            )}
            onClick={() => handleFeedbackClick('correct')}
          >
            <CheckCircle2 size={16} />
            <span>Верно</span>
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium transition-all",
              feedback === 'partially-correct'
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-yellow-100/60 dark:hover:bg-yellow-900/30 hover:text-yellow-700 dark:hover:text-yellow-300"
            )}
            onClick={() => handleFeedbackClick('partially-correct')}
          >
            <AlertCircle size={16} />
            <span>Частично верно</span>
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-r-lg text-sm font-medium transition-all",
              feedback === 'incorrect'
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-pink-100/60 dark:hover:bg-pink-900/30 hover:text-pink-700 dark:hover:text-pink-300"
            )}
            onClick={() => handleFeedbackClick('incorrect')}
          >
            <XCircle size={16} />
            <span>Неверно</span>
          </button>
        </div>
      )}

      {/* Блок отзыва: теги + поле комментария + Сохранить / Пропустить */}
      {role === 'assistant' && !isLoading && needsComment && !submitted && (
        <div ref={commentContainerRef} className="absolute left-0 right-0 -bottom-3 translate-y-full mt-4 bg-card border border-border rounded-xl px-4 py-3 shadow-lg space-y-3 z-50 ring-1 ring-black/5">
          <p className="text-xs font-medium text-muted-foreground">Выберите причины</p>
          {/* Quick feedback tags */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Выбран нерелевантный источник', hint: 'документ не соответствует вопросу' },
              { label: 'Ответ содержит неполную информацию', hint: 'упущены важные детали' },
              { label: 'Ответ общий', hint: 'нет конкретики по вопросу' },
              { label: 'Ответ содержит информацию, отсутствующую в источниках', hint: 'галлюцинация' },
              { label: 'Ответ основан на устаревшей или неактуальной информации' },
              { label: OTHER_TAG },
            ].map((tagItem) => {
              const tag = tagItem.label;
              const tagButton = (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Тоггл нескольких тегов, не записываем их в текстовое поле
                    setSelectedTags(prev => {
                      const exists = prev.includes(tag);
                      const next = exists ? prev.filter(t => t !== tag) : [...prev, tag];
                      if (exists && tag === OTHER_TAG) {
                        setComment("");
                      }
                      if (feedback && (feedback === 'partially-correct' || feedback === 'incorrect')) {
                        onFeedbackChange?.(feedback, next, exists && tag === OTHER_TAG ? "" : comment.trim());
                      }
                      return next;
                    });
                  }}
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-full border transition-colors",
                    selectedTags.includes(tag)
                      ? "bg-primary/80 text-primary-foreground border-primary/80"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {tag}
                </button>
              );

              if (!tagItem.hint) {
                return <React.Fragment key={tag}>{tagButton}</React.Fragment>;
              }

              return (
                <div key={tag} className="relative group">
                  {tagButton}
                  <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[calc(100%+8px)] hidden group-hover:block z-[120]">
                    <div className="w-max max-w-[360px] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md text-center whitespace-normal break-words">
                      {tagItem.hint}
                    </div>
                  </div>
                </div>
              );

            })}
          </div>
          {(selectedTags.includes(OTHER_TAG) || comment.trim().length > 0) && (
            <Textarea
              value={comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Другое — опишите своими словами..."
              rows={2}
              className="text-xs focus-visible:ring-0 focus-visible:ring-offset-0 resize-none bg-background/50 w-full"
              maxLength={500}
              onFocus={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {(selectedTags.includes(OTHER_TAG) || comment.trim().length > 0) ? `${comment.length}/500` : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSkip}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-background/50 transition-colors"
              >
                Пропустить
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="text-[11px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-2 py-1 rounded-md transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
