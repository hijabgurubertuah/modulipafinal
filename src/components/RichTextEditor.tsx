import React, { useState, useRef, useEffect } from 'react';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Minus,
  Indent,
  Outdent,
  Link2,
  Unlink,
  Smile,
  Image as ImageIcon,
  Video,
  Eye,
  PenTool,
  X,
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';
import { MediaUploaderModal, insertImageHtmlToEditor, InsertImageData } from './MediaUploaderModal';

export interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: string;
  webAppUrl?: string;
  defaultFolderId?: string;
}

// Convert YouTube and Google Drive links for video iframe embeds
const normalizeVideoUrl = (url: string): { embedUrl: string; type: 'youtube' | 'drive' | 'mp4' | 'other' } => {
  if (!url) return { embedUrl: '', type: 'other' };
  const trimmed = url.trim();

  // YouTube
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    let videoId = '';
    if (trimmed.includes('youtu.be/')) {
      videoId = trimmed.split('youtu.be/')[1]?.split(/[?&#]/)[0] || '';
    } else if (trimmed.includes('/shorts/')) {
      videoId = trimmed.split('/shorts/')[1]?.split(/[?&#]/)[0] || '';
    } else if (trimmed.includes('/embed/')) {
      videoId = trimmed.split('/embed/')[1]?.split(/[?&#]/)[0] || '';
    } else if (trimmed.includes('v=')) {
      videoId = trimmed.split('v=')[1]?.split(/[?&#]/)[0] || '';
    }
    if (videoId) {
      return { embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0`, type: 'youtube' };
    }
  }

  // Google Drive Video
  if (trimmed.includes('drive.google.com')) {
    const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return { embedUrl: `https://drive.google.com/file/d/${idMatch[1]}/preview`, type: 'drive' };
    }
  }

  if (trimmed.endsWith('.mp4') || trimmed.includes('.mp4?')) {
    return { embedUrl: trimmed, type: 'mp4' };
  }

  return { embedUrl: trimmed, type: 'other' };
};

// Convert markdown syntax like **bold** or *italic* into live HTML elements so asterisks never appear as raw text
export const convertMarkdownToRichHtml = (val: string): string => {
  if (!val) return '';
  let html = val;
  // Convert markdown **bold** or __bold__ -> <strong>bold</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Convert markdown *italic* or _italic_ -> <em>italic</em>
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  html = html.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');

  // Convert markdown ~~strikethrough~~ -> <del>strikethrough</del>
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // If text contains no HTML tags, wrap double linebreaks into paragraphs
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs
      .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  return html;
};

const POPULAR_EMOJIS = [
  '😊', '👍', '⭐', '🏆', '📚', '📌', '🔥', '💡',
  '🧪', '🔬', '🌱', '🌍', '⚡', '🎯', '🚀', '📝',
  '❤️', '🎉', '🧠', '✏️', '✨', '🔍', '📊', '🔔',
  '❓', '❗', '✅', '❌', '📖', '🧬', '⚛️', '🌞'
];

const TEXT_COLORS = [
  { name: 'Default (Hitam)', color: '#1e293b' },
  { name: 'Biru', color: '#2563eb' },
  { name: 'Hijau', color: '#16a34a' },
  { name: 'Merah', color: '#dc2626' },
  { name: 'Ungu', color: '#9333ea' },
  { name: 'Oranye', color: '#ea580c' },
  { name: 'Teal', color: '#0d9488' },
  { name: 'Abu-Abu', color: '#64748b' }
];

const HIGHLIGHT_COLORS = [
  { name: 'Kuning', color: '#fef08a' },
  { name: 'Hijau', color: '#bbf7d0' },
  { name: 'Merah Muda', color: '#fbcfe8' },
  { name: 'Biru Muda', color: '#bae6fd' },
  { name: 'Oranye', color: '#fed7aa' },
  { name: 'Ungu Muda', color: '#e9d5ff' },
  { name: 'Abu-Abu', color: '#e2e8f0' }
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label = 'Teks Konten Materi Lengkap',
  placeholder = 'Mulai ketik isi materi pembelajaran yang lengkap, terstruktur, dan interaktif di sini...',
  minHeight = '350px',
  webAppUrl = '',
  defaultFolderId = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  // Dropdowns / Popovers State (Protected against off-screen overflow on mobile)
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#059669');

  // Modals State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoCaption, setVideoCaption] = useState('');

  // Auto-resolve Web App URL from localStorage if not passed directly via props
  const resolvedWebAppUrl = webAppUrl || (() => {
    try {
      const rawSettings = localStorage.getItem('ipa_firestore_cache_settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        return parsed.driveUploadScriptUrl || parsed.googleAppsScriptUrl || '';
      }
    } catch {}
    return '';
  })();

  const resolvedFolderId = defaultFolderId || (() => {
    try {
      const rawSettings = localStorage.getItem('ipa_firestore_cache_settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        return parsed.driveFolderId || '';
      }
    } catch {}
    return '';
  })();

  // Sync internal editor content with prop value safely and convert any markdown asterisks to live HTML
  useEffect(() => {
    if (editorRef.current) {
      const formatted = convertMarkdownToRichHtml(value || '');
      if (editorRef.current.innerHTML !== formatted) {
        const currentClean = editorRef.current.innerHTML.trim();
        if (!currentClean || currentClean === '<br>' || (value && value.includes('**'))) {
          editorRef.current.innerHTML = formatted;
          if (value && value.includes('**')) {
            onChange(formatted);
          }
        }
      }
    }
  }, [value]);

  // Save current user selection before opening modals / popovers
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleEditorInput();
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // Clean Paste Filter: Strips hostile MS Word / Google Docs styles while keeping rich tags
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    let html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    if (html) {
      let cleanHtml = html
        .replace(/<!--[\s\S]*?-->/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/class="[^"]*"/gi, '')
        .replace(/style="[^"]*mso-[^"]*"/gi, '')
        .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
        .replace(/<xml>[\s\S]*?<\/xml>/gi, '');
      
      document.execCommand('insertHTML', false, cleanHtml);
    } else if (text) {
      const formatted = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, `<p>${formatted}</p>`);
    }
    handleEditorInput();
  };

  // -------------------------------------------------------------
  // Heading & Font Formatting
  // -------------------------------------------------------------
  const handleHeadingChange = (headingTag: string) => {
    if (headingTag === 'p') {
      executeCommand('formatBlock', '<p>');
    } else {
      executeCommand('formatBlock', `<${headingTag}>`);
    }
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    if (fontFamily === 'default') {
      executeCommand('fontName', 'sans-serif');
    } else {
      executeCommand('fontName', fontFamily);
    }
  };

  const handleFontSizeChange = (sizePx: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      const range = sel.getRangeAt(0);
      span.appendChild(range.extractContents());
      range.insertNode(span);
      handleEditorInput();
    } else {
      executeCommand('fontSize', '3');
    }
  };

  // -------------------------------------------------------------
  // Custom Color & Highlight
  // -------------------------------------------------------------
  const applyTextColor = (color: string) => {
    restoreSelection();
    executeCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const applyHighlightColor = (color: string) => {
    restoreSelection();
    executeCommand('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  // -------------------------------------------------------------
  // Link Operations
  // -------------------------------------------------------------
  const openLinkModal = () => {
    saveSelection();
    const sel = window.getSelection();
    const selected = sel ? sel.toString() : '';
    setLinkText(selected);
    setLinkUrl('');
    setIsLinkModalOpen(true);
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) return;
    restoreSelection();
    let finalUrl = linkUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:') && !finalUrl.startsWith('#')) {
      finalUrl = 'https://' + finalUrl;
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const textToUse = linkText.trim() || finalUrl;
      const targetAttr = linkOpenInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
      const linkHtml = `<a href="${finalUrl}"${targetAttr} class="text-emerald-600 font-bold underline hover:text-emerald-700 decoration-emerald-400">${textToUse}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
      handleEditorInput();
    }
    setIsLinkModalOpen(false);
  };

  const handleRemoveLink = () => {
    executeCommand('unlink');
  };

  // -------------------------------------------------------------
  // Emoji Insertion
  // -------------------------------------------------------------
  const insertEmoji = (emoji: string) => {
    restoreSelection();
    executeCommand('insertText', emoji);
    setShowEmojiPicker(false);
  };

  // -------------------------------------------------------------
  // Image Insertion (via MediaUploaderModal)
  // -------------------------------------------------------------
  const openImageModal = () => {
    saveSelection();
    setIsMediaModalOpen(true);
  };

  const handleInsertImageData = (imageData: InsertImageData) => {
    restoreSelection();
    const snippetHtml = insertImageHtmlToEditor(imageData);

    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand('insertHTML', false, snippetHtml);
    handleEditorInput();
  };

  // -------------------------------------------------------------
  // Video Insertion (Responsive 16:9 YouTube / Drive Live Embed)
  // -------------------------------------------------------------
  const openVideoModal = () => {
    saveSelection();
    setVideoUrlInput('');
    setVideoCaption('');
    setIsVideoModalOpen(true);
  };

  const handleInsertVideo = () => {
    if (!videoUrlInput.trim()) return;
    restoreSelection();
    const { embedUrl, type } = normalizeVideoUrl(videoUrlInput);
    if (!embedUrl) return;

    const captionHtml = videoCaption.trim()
      ? `<figcaption class="text-center text-xs font-semibold text-slate-500 mt-2 px-3 py-1 bg-slate-100 rounded-full inline-block mx-auto">${videoCaption.trim()}</figcaption>`
      : '';

    let videoElementHtml = '';
    if (type === 'mp4') {
      videoElementHtml = `
        <figure contenteditable="false" class="my-5 max-w-2xl mx-auto text-center select-none">
          <div class="rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg bg-black">
            <video src="${embedUrl}" controls class="w-full h-auto max-h-[420px]"></video>
          </div>
          ${captionHtml}
        </figure>
        <p><br></p>
      `;
    } else {
      videoElementHtml = `
        <figure contenteditable="false" class="my-5 max-w-2xl mx-auto text-center select-none">
          <div class="relative pb-[56.25%] h-0 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg bg-slate-950">
            <iframe 
              src="${embedUrl}" 
              title="${videoCaption || 'Video Pembelajaran'}" 
              class="absolute top-0 left-0 w-full h-full border-0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen
            ></iframe>
          </div>
          ${captionHtml}
        </figure>
        <p><br></p>
      `;
    }

    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand('insertHTML', false, videoElementHtml);
    handleEditorInput();
    setIsVideoModalOpen(false);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-300 bg-white shadow-xs overflow-hidden flex flex-col transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 relative">
      {/* ----------------------------------------------------------- */}
      {/* TOP HEADER: Label & Live Preview Badge                      */}
      {/* ----------------------------------------------------------- */}
      <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <PenTool size={14} className="text-emerald-600" />
          <span>{label}</span>
        </label>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* STICKY RICH TOOLBAR                                         */}
      {/* ----------------------------------------------------------- */}
      <div className="sticky top-0 z-20 px-3 py-2 bg-slate-100/95 backdrop-blur-md border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-slate-700 select-none">
        {/* GROUP 1: Heading Dropdown */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
          <select
            aria-label="Format Paragraf & Judul"
            onChange={(e) => handleHeadingChange(e.target.value)}
            defaultValue="p"
            className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="p">Paragraf (Normal)</option>
            <option value="h1">Heading 1 (Besar)</option>
            <option value="h2">Heading 2 (Sedang)</option>
            <option value="h3">Heading 3 (Kecil)</option>
            <option value="h4">Heading 4</option>
          </select>
        </div>

        {/* GROUP 2: Font Family Dropdown */}
        <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
          <select
            aria-label="Jenis Font"
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            defaultValue="default"
            className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="default">Sans-Serif (Standar)</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Playfair Display', serif">Playfair Serif</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Courier New', monospace">Courier (Kode)</option>
            <option value="Impact, fantasy">Impact</option>
            <option value="'Comic Sans MS', cursive">Comic Sans</option>
          </select>
        </div>

        {/* GROUP 3: Font Size Dropdown */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
          <select
            aria-label="Ukuran Huruf"
            onChange={(e) => handleFontSizeChange(e.target.value)}
            defaultValue="16px"
            className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px (Standar)</option>
            <option value="18px">18px</option>
            <option value="22px">22px</option>
            <option value="28px">28px</option>
            <option value="36px">36px</option>
          </select>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-0.5" />

        {/* GROUP 4: Character Formatting (Bold, Italic, Underline, Strike, Sub, Super, Clear) */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Tebal (Bold)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Miring (Italic)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Garis Bawah (Underline)"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Coret (Strikethrough)"
          >
            <Strikethrough size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('subscript')}
            className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Teks Bawah (Subscript misal: H₂O)"
          >
            <Subscript size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('superscript')}
            className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Teks Atas (Superscript misal: m²)"
          >
            <Superscript size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('removeFormat')}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
            title="Hapus Format (Clear Formatting)"
          >
            <RemoveFormatting size={15} />
          </button>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-0.5" />

        {/* GROUP 5: Colors & Highlights Popovers (Safely Anchored on Mobile) */}
        <div className="flex items-center gap-1 relative">
          {/* Text Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                saveSelection();
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
                setShowEmojiPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold shadow-2xs cursor-pointer"
              title="Warna Teks"
            >
              <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: customColor }} />
              <span className="hidden sm:inline">Warna</span>
            </button>

            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-40 bg-black/10 sm:hidden" onClick={() => setShowColorPicker(false)} />
                <div className="fixed inset-x-4 top-24 sm:top-full sm:inset-x-auto sm:left-0 mt-1.5 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 w-auto sm:w-60 space-y-2.5 max-w-xs mx-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">Pilih Warna Teks</p>
                    <button type="button" onClick={() => setShowColorPicker(false)} className="p-1 text-slate-400 hover:text-slate-700 sm:hidden">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => applyTextColor(c.color)}
                        className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-2xs"
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={e => setCustomColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => applyTextColor(customColor)}
                      className="flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Highlight / Stabilo Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                saveSelection();
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
                setShowEmojiPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold shadow-2xs cursor-pointer"
              title="Stabilo / Latar Teks (Highlight)"
            >
              <span className="w-3.5 h-3.5 rounded-md bg-amber-300 border border-amber-400" />
              <span className="hidden sm:inline">Stabilo</span>
            </button>

            {showHighlightPicker && (
              <>
                <div className="fixed inset-0 z-40 bg-black/10 sm:hidden" onClick={() => setShowHighlightPicker(false)} />
                <div className="fixed inset-x-4 top-24 sm:top-full sm:inset-x-auto sm:left-0 mt-1.5 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 w-auto sm:w-60 space-y-2.5 max-w-xs mx-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">Warna Stabilo</p>
                    <button type="button" onClick={() => setShowHighlightPicker(false)} className="p-1 text-slate-400 hover:text-slate-700 sm:hidden">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {HIGHLIGHT_COLORS.map(c => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => applyHighlightColor(c.color)}
                        className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-2xs"
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => applyHighlightColor('transparent')}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Hapus Stabilo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-0.5" />

        {/* GROUP 6: Paragraph Alignments */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Rata Kiri"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Rata Tengah"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Rata Kanan"
          >
            <AlignRight size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyFull')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Rata Kanan Kiri (Justify)"
          >
            <AlignJustify size={15} />
          </button>
        </div>

        {/* GROUP 7: Lists, Quotes & Indentation */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Daftar Simbol (Bullet List)"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Daftar Bernomor (Numbered List)"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<blockquote>')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Kutipan Khusus (Blockquote)"
          >
            <Quote size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertHorizontalRule')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Garis Pembatas (Divider)"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('outdent')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Kurangi Indent"
          >
            <Outdent size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('indent')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Tambah Indent"
          >
            <Indent size={15} />
          </button>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-0.5" />

        {/* GROUP 8: Links, Emoji, Image, Video Embeds */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openLinkModal}
            className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Sisipkan Tautan (Link)"
          >
            <Link2 size={15} />
          </button>
          <button
            type="button"
            onClick={handleRemoveLink}
            className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Hapus Tautan (Unlink)"
          >
            <Unlink size={15} />
          </button>

          {/* Emoji Picker Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                saveSelection();
                setShowEmojiPicker(!showEmojiPicker);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
              }}
              className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
              title="Sisipkan Emoji"
            >
              <Smile size={15} className="text-amber-500" />
            </button>

            {showEmojiPicker && (
              <>
                <div className="fixed inset-0 z-40 bg-black/10 sm:hidden" onClick={() => setShowEmojiPicker(false)} />
                <div className="fixed inset-x-4 top-24 sm:top-full sm:inset-x-auto sm:right-0 mt-1.5 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 w-auto sm:w-72 space-y-2.5 max-w-sm mx-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">Koleksi Emoji Populer</p>
                    <button type="button" onClick={() => setShowEmojiPicker(false)} className="p-1 text-slate-400 hover:text-slate-700 sm:hidden">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5 max-h-52 overflow-y-auto p-1">
                    {POPULAR_EMOJIS.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => insertEmoji(em)}
                        className="w-7 h-7 text-base rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Image Embed Button (Opens MediaUploaderModal) */}
          <button
            type="button"
            onClick={openImageModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Unggah / Sisipkan Gambar Google Drive"
          >
            <ImageIcon size={14} />
            <span className="hidden sm:inline">Gambar / Drive</span>
          </button>

          {/* Video Embed Button */}
          <button
            type="button"
            onClick={openVideoModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Sisipkan Video YouTube atau Google Drive"
          >
            <Video size={14} />
            <span className="hidden sm:inline">Video</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* MAIN CONTENT AREA: Pure Live Editor Canvas                  */}
      {/* ----------------------------------------------------------- */}
      <div className="relative flex-1 bg-white">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleEditorInput}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className="w-full p-4 sm:p-5 outline-hidden overflow-y-auto text-slate-800 text-sm sm:text-base leading-relaxed font-sans empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none focus:ring-0 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-slate-900 [&_h1]:my-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:my-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:my-2 [&_p]:my-2.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3 [&_blockquote]:bg-emerald-50/40 [&_blockquote]:py-1.5 [&_blockquote]:rounded-r-xl [&_hr]:my-4 [&_hr]:border-slate-200 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:shadow-md [&_img]:my-3 [&_iframe]:w-full [&_iframe]:rounded-xl [&_iframe]:shadow-md"
          style={{ minHeight }}
        />
      </div>

      {/* ----------------------------------------------------------- */}
      {/* MODAL 1: MEDIA UPLOADER & DRIVE GALLERY MODAL               */}
      {/* ----------------------------------------------------------- */}
      <MediaUploaderModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onInsertImage={handleInsertImageData}
        webAppUrl={resolvedWebAppUrl}
        defaultFolderId={resolvedFolderId}
      />

      {/* ----------------------------------------------------------- */}
      {/* MODAL 2: LINK INSERTION MODAL                               */}
      {/* ----------------------------------------------------------- */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <Link2 size={16} className="text-emerald-600" />
                <span>Sisipkan Tautan (Link)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teks Tautan</label>
                <AutoResizeTextarea
                  rows={1}
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  placeholder="Contoh: Klik untuk baca jurnal"
                  className="w-full max-w-full min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Target</label>
                <AutoResizeTextarea
                  rows={1}
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://contoh.com/materi"
                  className="w-full max-w-full min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={linkOpenInNewTab}
                  onChange={e => setLinkOpenInNewTab(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700">Buka di tab baru (New Tab)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Terapkan Tautan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* MODAL 3: VIDEO INSERTION MODAL (YouTube / Drive Video)      */}
      {/* ----------------------------------------------------------- */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <Video size={16} className="text-rose-600" />
                <span>Sisipkan Video Pembelajaran</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  URL Video (YouTube / Google Drive / MP4)
                </label>
                <AutoResizeTextarea
                  rows={1}
                  value={videoUrlInput}
                  onChange={e => setVideoUrlInput(e.target.value)}
                  placeholder="https://youtu.be/... atau https://drive.google.com/file/d/.../view"
                  className="w-full max-w-full min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Mendukung link YouTube (termasuk Shorts) & Google Drive Video secara otomatis.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan Video (Opsional)</label>
                <AutoResizeTextarea
                  rows={1}
                  value={videoCaption}
                  onChange={e => setVideoCaption(e.target.value)}
                  placeholder="Contoh: Video Praktik Pembuatan Pupuk Kompos"
                  className="w-full max-w-full min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertVideo}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Sisipkan Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
