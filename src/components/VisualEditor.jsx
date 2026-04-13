import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, List, ListOrdered, 
  Quote, Link as LinkIcon, Image as ImageIcon, Table as TableIcon, Highlighter,
  Undo, Redo, Code, Link2Off, X
} from 'lucide-react';
import './VisualEditor.css';

import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import { supabase } from '../lib/supabase';

// カスタム行間拡張機能
const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem', 'blockquote', 'tableCell', 'tableHeader'],
      defaultLineHeight: '1.75',
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) {
                return {}
              }
              return { style: `line-height: ${attributes.lineHeight}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight: (lineHeight) => ({ commands }) => {
        return this.options.types.every(type => commands.updateAttributes(type, { lineHeight }))
      },
    }
  },
});

const VisualEditor = ({ content, onChange }) => {
  const [images, setImages] = React.useState([]);
  const [showImagePicker, setShowImagePicker] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 以下の機能が重複しないように明示的に設定（環境によってStarterKitに含まれる場合があるため）
        history: true,
      }),
      TextStyle,
      Underline,
      Highlight,
      LineHeight,
      BubbleMenuExtension,
      FloatingMenuExtension,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: '記事の内容を入力してください...',
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase.storage.from('wiki-images').list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
      if (error) throw error;
      if (data) {
        const urls = data.map(fileobj => {
          const { data: { publicUrl } } = supabase.storage.from('wiki-images').getPublicUrl(fileobj.name);
          return publicUrl;
        });
        setImages(urls);
      }
    } catch (err) { console.error("Error fetching images:", err); }
  };

  React.useEffect(() => {
    if (showImagePicker) {
      fetchImages();
    }
  }, [showImagePicker]);

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('wiki-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('wiki-images').getPublicUrl(filePath);
      editor.chain().focus().setImage({ src: publicUrl }).run();
      setShowImagePicker(false);
    } catch (error) {
      alert('アップロードに失敗しました: ' + error.message);
    } finally {
      setUploading(false);
      fetchImages();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URLを入力してください:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImageFromUrl = () => {
    const url = window.prompt('画像のURLを入力してください:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
      setShowImagePicker(false);
    }
  };

  const selectImage = (url) => {
    editor.chain().focus().setImage({ src: url }).run();
    setShowImagePicker(false);
  };

  return (
    <div className="editor-container">
      {showImagePicker && (
        <div className="image-picker-overlay" onClick={() => setShowImagePicker(false)}>
          <div className="image-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="image-picker-header">
              <h3>画像を選択</h3>
              <button className="close-btn" onClick={() => setShowImagePicker(false)}><X size={20} /></button>
            </div>
            <div className="image-picker-content">
              <div className="image-picker-section">
                <h4>画像をアップロード</h4>
                <div className="url-input-group">
                  <input
                    type="file"
                    id="image-upload"
                    hidden
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  <label htmlFor="image-upload" className={`action-btn ${uploading ? 'uploading' : ''}`} style={{cursor: 'pointer'}}>
                    {uploading ? 'アップロード中...' : 'ファイルを選択してアップロード'}
                  </label>
                  <button className="action-btn secondary" onClick={addImageFromUrl}>URLで指定</button>
                </div>
              </div>
              
              <div className="image-picker-section">
                <h4>ストレージ内の画像 (Supabase Storage)</h4>
                {images.length === 0 ? (
                  <p className="no-images">画像がまだありません。上のボタンからアップロードしてください。</p>
                ) : (
                  <div className="image-grid">
                    {images.map(url => (
                      <div key={url} className="image-item" onClick={() => selectImage(url)}>
                        <img src={url} alt="" />
                        <span className="image-label">{url.split('/').pop().split('?')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="toolbar-btn"><Undo size={18} /></button>
          <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="toolbar-btn"><Redo size={18} /></button>
        </div>

        <div className="toolbar-group">
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
          >
            <Heading1 size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
          >
            <Heading2 size={18} />
          </button>
        </div>

        <div className="toolbar-group">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          >
            <Bold size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          >
            <Italic size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
          >
            <UnderlineIcon size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleStrike().run()} 
            className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
          >
            <Strikethrough size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleHighlight().run()} 
            className={`toolbar-btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
          >
            <Highlighter size={18} />
          </button>
        </div>

        <div className="toolbar-group">
          <button 
            onClick={() => editor.chain().focus().setLineHeight('1.2').run()} 
            className={`toolbar-btn ${editor.getAttributes('paragraph').lineHeight === '1.2' || editor.getAttributes('heading').lineHeight === '1.2' ? 'is-active' : ''}`}
            title="行間：狭い"
          >
            <span style={{fontSize: '11px', fontWeight: 'bold'}}>狭</span>
          </button>
          <button 
            onClick={() => editor.chain().focus().setLineHeight('1.75').run()} 
            className={`toolbar-btn ${editor.getAttributes('paragraph').lineHeight === '1.75' || editor.getAttributes('heading').lineHeight === '1.75' ? 'is-active' : ''}`}
            title="行間：標準"
          >
            <span style={{fontSize: '11px', fontWeight: 'bold'}}>準</span>
          </button>
          <button 
            onClick={() => editor.chain().focus().setLineHeight('2.5').run()} 
            className={`toolbar-btn ${editor.getAttributes('paragraph').lineHeight === '2.5' || editor.getAttributes('heading').lineHeight === '2.5' ? 'is-active' : ''}`}
            title="行間：広い"
          >
            <span style={{fontSize: '11px', fontWeight: 'bold'}}>広</span>
          </button>
        </div>

        <div className="toolbar-group">
          <button 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          >
            <List size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          >
            <ListOrdered size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
          >
            <Quote size={18} />
          </button>
        </div>

        <div className="toolbar-group">
          <button onClick={setLink} className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}><LinkIcon size={18} /></button>
          {editor.isActive('link') && (
            <button onClick={() => editor.chain().focus().unsetLink().run()} className="toolbar-btn"><Link2Off size={18} /></button>
          )}
          <button onClick={() => setShowImagePicker(true)} className="toolbar-btn"><ImageIcon size={18} /></button>
          <button 
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
            className="toolbar-btn"
          >
            <TableIcon size={18} />
          </button>
        </div>
      </div>

      {editor && <BubbleMenu className="bubble-menu" editor={editor}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}><Bold size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}><Italic size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}><UnderlineIcon size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}><Strikethrough size={14} /></button>
        <button onClick={setLink} className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}><LinkIcon size={14} /></button>
        
        <div style={{width: '1px', background: '#444', margin: '0 4px'}}></div>
        
        <button onClick={() => editor.chain().focus().setLineHeight('1.2').run()} className="toolbar-btn" title="行間：狭い"><span style={{fontSize: '10px'}}>狭</span></button>
        <button onClick={() => editor.chain().focus().setLineHeight('1.75').run()} className="toolbar-btn" title="行間：標準"><span style={{fontSize: '10px'}}>準</span></button>
        <button onClick={() => editor.chain().focus().setLineHeight('2.5').run()} className="toolbar-btn" title="行間：広い"><span style={{fontSize: '10px'}}>広</span></button>
      </BubbleMenu>}

      {editor && <FloatingMenu className="floating-menu" editor={editor}>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}><Heading1 size={16} /></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}><Heading2 size={16} /></button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}><List size={16} /></button>
      </FloatingMenu>}

      <EditorContent editor={editor} />
    </div>
  );
};

export default VisualEditor;
