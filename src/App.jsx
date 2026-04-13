import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Book, History, Edit, ChevronRight, ChevronDown, Folder, FileText, Save, X, Trash2, 
  User, LogOut, Lock, Plus, ArrowLeftRight, ChevronUp, MoreVertical, ArrowUp, ArrowDown, 
  ChevronLeft
} from 'lucide-react';
import VisualEditor from './components/VisualEditor';
import { supabase } from './lib/supabase';
import WIKI_DATA from './data/wiki-data.json';

// カテゴリーツリーを動的に構築する関数
const buildCategoryTree = (wikiData) => {
  if (!wikiData) return [];
  const root = [];

  const getCleanLabel = (label) => label.replace(/^\[\d+\]\s*/, '');
  const getSortWeight = (label) => {
    const match = label.match(/^\[(\d+)\]/);
    return match ? parseInt(match[1], 10) : 999;
  };

  Object.entries(wikiData).forEach(([title, data]) => {
    if (title === "メインページ") return;
    const categoryPath = data.category || "未分類";
    const parts = categoryPath.split(" > ").map(p => p.trim());
    
    let currentLevel = root;
    parts.forEach((part, index) => {
      let existingNode = currentLevel.find(n => n.rawLabel === part);
      
      if (!existingNode) {
        const fullPath = parts.slice(0, index + 1).join(' > ');
        existingNode = {
          id: `cat-${parts.slice(0, index + 1).join('-')}`,
          rawLabel: part,
          label: getCleanLabel(part),
          sortWeight: getSortWeight(part),
          path: fullPath,
          children: [],
          items: []
        };
        currentLevel.push(existingNode);
      }
      
      if (index === parts.length - 1) {
        if (!existingNode.items.includes(title)) {
          existingNode.items.push(title);
        }
      } else {
        currentLevel = existingNode.children;
      }
    });
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => a.sortWeight - b.sortWeight || a.label.localeCompare(b.label));
    nodes.forEach(node => {
      if (node.children?.length > 0) sortNodes(node.children);
    });
  };
  sortNodes(root);
  
  return root;
};

// 記事データは外部JSONから取得します (src/data/wiki-data.json)

// カテゴリーツリーコンポーネント
function NavTree({ items, currentTerm, onNavigate, onRenameCategory, onDeleteCategory, onAddSubCategory, onPromoteCategory, onDemoteCategory, onReorderCategory, isAdmin }) {
  const [openStates, setOpenStates] = useState({});
  const [activeMenu, setActiveMenu] = useState(null); // node.path
  const toggle = (id) => setOpenStates(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleActionClick = (e, path) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === path ? null : path);
  };

  const handlePromoteClick = (e, path) => {
    e.stopPropagation();
    onPromoteCategory(path);
    setActiveMenu(null);
  };

  const handleDemoteClick = (e, path, prevSiblingRawLabel) => {
    e.stopPropagation();
    onDemoteCategory(path, prevSiblingRawLabel);
    setActiveMenu(null);
  };

  const handleReorderClick = (e, path, direction) => {
    e.stopPropagation();
    onReorderCategory(path, direction);
    setActiveMenu(null);
  };

  const handleRenameClick = (e, label, path) => {
    e.stopPropagation();
    onRenameCategory(path, label);
    setActiveMenu(null);
  };

  const handleDeleteClick = (e, path) => {
    e.stopPropagation();
    onDeleteCategory(path);
    setActiveMenu(null);
  };

  const handleAddClick = (e, path) => {
    e.stopPropagation();
    onAddSubCategory(path);
    setActiveMenu(null);
  };

  if (!items) return null;

  return (
    <ul className="nav-tree">
      {items.map(node => (
        <li key={node.id} className="nav-tree-node">
          {( (node.children && node.children.length > 0) || (node.items && node.items.length > 0) ) && (
            <div className="nav-tree-label" onClick={() => toggle(node.id)}>
              <div className="label-content">
                {openStates[node.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} style={{ margin: '0 6px' }} />
                <span>{node.label}</span>
              </div>
              {isAdmin && (
                <div className="cat-actions-wrapper">
                  <button className="rename-cat-btn" onClick={(e) => handleActionClick(e, node.path)} style={{ opacity: activeMenu === node.path ? 1 : undefined }}>
                    <MoreVertical size={14} />
                  </button>
                  
                  {activeMenu === node.path && (
                    <div className="category-menu" onClick={e => e.stopPropagation()}>
                      <div className="menu-section-title">ページ</div>
                      <button className="menu-item" onClick={(e) => handleAddClick(e, node.path)}>
                        <Plus size={14} /> 新規記事を追加
                      </button>
                      
                      <div className="menu-divider"></div>
                      <div className="menu-section-title">並べ替え</div>
                      <button className="menu-item" onClick={(e) => handleReorderClick(e, node.path, 'up')} disabled={items.indexOf(node) === 0}>
                        <ArrowUp size={14} /> 上へ移動
                      </button>
                      <button className="menu-item" onClick={(e) => handleReorderClick(e, node.path, 'down')} disabled={items.indexOf(node) === items.length - 1}>
                        <ArrowDown size={14} /> 下へ移動
                      </button>
                      
                      <div className="menu-divider"></div>
                      <div className="menu-section-title">階層移動</div>
                      <button className="menu-item" onClick={(e) => handlePromoteClick(e, node.path)} disabled={!node.path.includes(' > ')}>
                        <ChevronLeft size={14} /> 親階層へ（昇格）
                      </button>
                      <button className="menu-item" onClick={(e) => handleDemoteClick(e, node.path, items[items.indexOf(node)-1]?.rawLabel)} disabled={items.indexOf(node) === 0}>
                        <ChevronRight size={14} /> 子階層へ（降格）
                      </button>
                      
                      <div className="menu-divider"></div>
                      <div className="menu-section-title">管理</div>
                      <button className="menu-item" onClick={(e) => handleRenameClick(e, node.label, node.path)}>
                        <Edit size={14} /> 名称変更
                      </button>
                      <button className="menu-item delete" onClick={(e) => handleDeleteClick(e, node.path)}>
                        <Trash2 size={14} /> カテゴリー削除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {openStates[node.id] && node.children && node.children.length > 0 && (
            <div className="nav-tree-children">
              <NavTree 
                items={node.children} 
                currentTerm={currentTerm} 
                onNavigate={onNavigate} 
                onRenameCategory={onRenameCategory} 
                onDeleteCategory={onDeleteCategory}
                onAddSubCategory={onAddSubCategory}
                onPromoteCategory={onPromoteCategory}
                onDemoteCategory={onDemoteCategory}
                onReorderCategory={onReorderCategory}
                isAdmin={isAdmin} 
              />
            </div>
          )}
          {openStates[node.id] && node.items && node.items.length > 0 && (
            <ul className="nav-tree-items">
              {node.items.map(term => (
                <li key={term}>
                  <a href="#" className={currentTerm === term ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavigate(term); }}>
                    <FileText size={14} style={{ marginRight: '6px' }} />
                    {term}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

// 補助機能
function autoLinkTextToElements(text, titles, currentTitle, onNavigate) {
  if (!text || !titles || titles.length === 0) return text;
  const sortedTitles = titles.filter(t => t !== currentTitle && t.length > 0).sort((a, b) => b.length - a.length);
  if (sortedTitles.length === 0) return text;
  const titleRegex = new RegExp(`(${sortedTitles.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(titleRegex);
  return parts.map((part, i) => sortedTitles.includes(part) ? <span key={i} className="internal-link" onClick={() => onNavigate(part)}>{part}</span> : part);
}

function renderLinks(text, onNavigate, wikiData, titles, currentTitle) {
  if (!text) return "";
  const parts = text.split(/(\[\[.*?\]\]|\*\*.*?\*\*|!\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const term = part.slice(2, -2);
      return <span key={index} className="internal-link" onClick={() => onNavigate(term)} style={!wikiData[term] ? { color: '#ba0000' } : {}}>{term}</span>;
    }
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('![') && part.includes('](')) {
      const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) return <div key={index} className="wiki-image-container"><img src={imgMatch[2]} alt={imgMatch[1]} className="wiki-image" /><p className="wiki-image-caption">{imgMatch[1]}</p></div>;
    }
    return autoLinkTextToElements(part, titles, currentTitle, onNavigate);
  });
}

function WikiContent({ content, onNavigate, wikiData, currentTitle }) {
  if (!content) return null;
  const paragraphs = content.split(/\n\s*\n/);
  const titles = Object.keys(wikiData);
  return (
    <div className="wiki-text">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n');
        if (lines.length === 1) {
          const line = lines[0].trim();
          if (line.startsWith('## ')) return <h2 key={pIdx}>{line.slice(3)}</h2>;
          if (line.startsWith('- ')) return <li key={pIdx} style={{marginLeft: '1.5rem'}}>{renderLinks(line.slice(2), onNavigate, wikiData, titles, currentTitle)}</li>;
        }
        return <p key={pIdx}>{lines.map((line, lIdx) => <React.Fragment key={lIdx}>{renderLinks(line, onNavigate, wikiData, titles, currentTitle)}{lIdx < lines.length - 1 && <br />}</React.Fragment>)}</p>;
      })}
    </div>
  );
}

const autoLink = (text, titles, currentTitle) => {
  if (!text || !titles || titles.length === 0) return text;
  const sortedTitles = [...titles].filter(t => t !== currentTitle && t.length > 0).sort((a, b) => b.length - a.length);
  const titleRegex = new RegExp(`(${sortedTitles.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return text.split(/(<[^>]+>)/g).map(part => part.startsWith('<') ? part : part.replace(titleRegex, '<span class="internal-link">$1</span>')).join('');
};

export default function App() {
  const [wikiData, setWikiData] = useState({});
  const [currentTerm, setCurrentTerm] = useState("メインページ");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setIsAdmin(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setShowLogin(false);
    } catch (err) { alert("ログインに失敗しました: " + err.message); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  useEffect(() => {
    const initData = async () => {
      try {
        const { data, error } = await supabase.from('wiki_pages').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          const dict = {};
          data.forEach(row => dict[row.title] = { 
            title: row.title, 
            category: row.category, 
            content: row.content,
            is_editing_status: row.is_editing_status 
          });
          setWikiData(dict);
        } else {
          const seed = Object.entries(WIKI_DATA).map(([t, d]) => ({ title: t, category: d.category, content: d.content }));
          await supabase.from('wiki_pages').insert(seed);
          setWikiData(WIKI_DATA);
        }
      } catch (err) { console.error("Supabase Error:", err.message); } finally { setLoading(false); }
    };
    initData();
  }, []);

  const article = wikiData[currentTerm] || { title: currentTerm, content: "未作成", category: "未分類", is_editing_status: false };
  const categoryTree = useMemo(() => buildCategoryTree(wikiData), [wikiData]);

  useEffect(() => { window.scrollTo(0, 0); setIsEditing(false); }, [currentTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    const found = Object.keys(wikiData).find(t => t.toLowerCase() === query.toLowerCase());
    setCurrentTerm(found || query);
    setSearchQuery("");
  };

  const createNewPage = async (presetTitle = "") => {
    const title = window.prompt("タイトル:", presetTitle || "")?.trim();
    if (!title || wikiData[title]) return;
    const category = window.prompt("カテゴリー:", "未分類")?.trim() || "未分類";
    const content = `<p>「${title}」の内容を記述してください。</p>`;
    try {
      const { error } = await supabase.from('wiki_pages').insert({ title, category, content });
      if (error) throw error;
      setWikiData(prev => ({ ...prev, [title]: { title, category, content } }));
      setCurrentTerm(title); setEditTitle(title); setEditContent(content); setEditCategory(category); setIsEditing(true);
    } catch (err) { alert("新規作成に失敗しました: " + err.message); }
  };

  const startEditing = () => {
    setEditTitle(article.title);
    setEditContent(article.content);
    setEditCategory(article.category);
    setIsEditing(true);
  };

  const deleteArticle = async () => {
    if (currentTerm === "メインページ" || !window.confirm(`「${currentTerm}」を削除しますか？`)) return;
    try {
      const { error } = await supabase.from('wiki_pages').delete().eq('title', currentTerm);
      if (error) throw error;
      setWikiData(prev => { const next = { ...prev }; delete next[currentTerm]; return next; });
      setCurrentTerm("メインページ");
    } catch (err) { alert("削除に失敗しました: " + err.message); }
  };

  const saveEdit = async () => {
    const finalTitle = editTitle.trim();
    if (!finalTitle) { alert("タイトルを入力してください。"); return; }
    
    // タイトルが変更された場合の重複チェック
    if (finalTitle !== currentTerm && wikiData[finalTitle]) {
      alert("そのタイトルの記事は既に存在します。");
      return;
    }

    try {
      if (finalTitle !== currentTerm) {
        // タイトルが変更された場合：既存レコードのタイトルを更新
        const { error } = await supabase
          .from('wiki_pages')
          .update({ title: finalTitle, category: editCategory, content: editContent })
          .eq('title', currentTerm);
        
        if (error) throw error;

        // ステートの同期
        setWikiData(prev => {
          const next = { ...prev };
          const oldData = next[currentTerm];
          delete next[currentTerm];
          next[finalTitle] = { ...oldData, title: finalTitle, category: editCategory, content: editContent };
          return next;
        });
        setCurrentTerm(finalTitle);
      } else {
        // タイトルが同じ場合：upsert
        const { error } = await supabase.from('wiki_pages').upsert({ title: currentTerm, category: editCategory, content: editContent }, { onConflict: 'title' });
        if (error) throw error;
        setWikiData(prev => ({ ...prev, [currentTerm]: { ...article, category: editCategory, content: editContent } }));
      }
      setIsEditing(false);
    } catch (err) { alert("保存に失敗しました: " + err.message); }
  };

  const toggleEditingStatus = async () => {
    if (!isAdmin) return;
    const newStatus = !article.is_editing_status;
    try {
      const { error } = await supabase
        .from('wiki_pages')
        .update({ is_editing_status: newStatus })
        .eq('title', currentTerm);
      
      if (error) throw error;
      
      setWikiData(prev => ({
        ...prev,
        [currentTerm]: { ...prev[currentTerm], is_editing_status: newStatus }
      }));
    } catch (err) {
      alert("ステータスの更新に失敗しました: " + err.message);
    }
  };

  const renameCategory = async (oldPath, shortName) => {
    const newName = window.prompt(`「${shortName}」の新しい名前:`, shortName)?.trim();
    if (!newName || newName === shortName) return;
    const parts = oldPath.split(' > '); parts[parts.length - 1] = newName;
    const newPath = parts.join(' > ');
    
    try {
      const { data, error } = await supabase.from('wiki_pages').select('title, category');
      if (error) throw error;
      
      const updates = data.filter(item => 
        item.category === oldPath || item.category?.startsWith(oldPath + " > ")
      ).map(item => ({
        title: item.title,
        category: item.category === oldPath ? newPath : item.category.replace(oldPath + " > ", newPath + " > ")
      }));

      for (const update of updates) {
        const { error: updateError } = await supabase.from('wiki_pages').update({ category: update.category }).eq('title', update.title);
        if (updateError) throw updateError;
      }

      setWikiData(prev => {
        const next = { ...prev };
        updates.forEach(u => {
          if (next[u.title]) next[u.title].category = u.category;
        });
        return next;
      });
    } catch (err) { alert(err.message); }
  };

  // 補助関数：一括更新処理
  const bulkUpdateCategories = async (updates) => {
    if (!updates || updates.length === 0) return;
    try {
      const { error } = await supabase.from('wiki_pages').upsert(updates, { onConflict: 'title' });
      if (error) throw error;
      setWikiData(prev => {
        const next = { ...prev };
        updates.forEach(u => {
          if (next[u.title]) next[u.title] = { ...next[u.title], ...u };
        });
        return next;
      });
    } catch (err) { 
      console.error("Bulk Update Error:", err);
      alert("一括更新に失敗しました: " + err.message); 
    }
  };

  // カテゴリーとその配下の全記事のパスを置換する
  const transferCategory = async (oldPath, newPath) => {
    try {
      // 最新のデータを取得（一貫性のため）
      const { data, error } = await supabase.from('wiki_pages').select('*');
      if (error) throw error;

      const updates = data.filter(item => 
        item.category === oldPath || item.category?.startsWith(oldPath + " > ")
      ).map(item => ({
        title: item.title,
        content: item.content,
        category: item.category === oldPath ? newPath : item.category.replace(oldPath + " > ", newPath + " > ")
      }));

      if (updates.length > 0) {
        await bulkUpdateCategories(updates);
      }
    } catch (err) { alert(err.message); }
  };

  const promoteCategory = async (path) => {
    const parts = path.split(' > ');
    if (parts.length < 2) return;
    const shortName = parts.pop();
    parts.pop(); // 親をスキップ
    const newPath = parts.length > 0 ? parts.join(' > ') + ' > ' + shortName : shortName;
    await transferCategory(path, newPath);
  };

  const demoteCategory = async (path, prevSiblingRawLabel) => {
    if (!prevSiblingRawLabel) return;
    const parts = path.split(' > ');
    const shortName = parts.pop();
    const newPath = (parts.length > 0 ? parts.join(' > ') + ' > ' : '') + prevSiblingRawLabel + ' > ' + shortName;
    await transferCategory(path, newPath);
  };

  const reorderCategory = async (path, direction) => {
    const parts = path.split(' > ');
    const currentName = parts.pop();
    const parentPath = parts.join(' > ');
    
    // 現在の階層の兄弟をステートから取得
    const siblings = Array.from(new Set(
      Object.values(wikiData)
        .filter(d => {
          if (!parentPath) return !d.category || !d.category.includes(' > ');
          return d.category === parentPath || d.category?.startsWith(parentPath + " > ");
        })
        .map(d => {
          const p = d.category?.split(' > ') || [];
          if (parentPath) {
            const parentLevel = parentPath.split(' > ').length;
            return p.length > parentLevel ? p[parentLevel] : null;
          }
          return p.length > 0 ? p[0] : null;
        })
        .filter(Boolean)
    )).sort((a, b) => {
      const getWeight = (l) => { const m = l.match(/^\[(\d+)\]/); return m ? parseInt(m[1], 10) : 999; };
      return getWeight(a) - getWeight(b) || a.localeCompare(b);
    });

    const currentIndex = siblings.indexOf(currentName);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    // 接頭辞を付与して入れ替え
    const newSiblings = [...siblings];
    [newSiblings[currentIndex], newSiblings[targetIndex]] = [newSiblings[targetIndex], newSiblings[currentIndex]];

    const getClean = (l) => l.replace(/^\[\d+\]\s*/, '');
    
    // すべての記事データを取得して一括更新用のデータを準備
    const { data: allPages, error } = await supabase.from('wiki_pages').select('*');
    if (error) { alert(error.message); return; }

    const allUpdates = [];
    for (let i = 0; i < newSiblings.length; i++) {
      const oldRaw = newSiblings[i];
      const newRaw = `[${String(i + 1).padStart(2, '0')}] ${getClean(oldRaw)}`;
      
      const oldFull = parentPath ? `${parentPath} > ${oldRaw}` : oldRaw;
      const newFull = parentPath ? `${parentPath} > ${newRaw}` : newRaw;

      if (oldFull !== newFull) {
        allPages.filter(item => 
          item.category === oldFull || item.category?.startsWith(oldFull + " > ")
        ).forEach(item => {
          allUpdates.push({
            title: item.title,
            content: item.content,
            category: item.category === oldFull ? newFull : item.category.replace(oldFull + " > ", newFull + " > ")
          });
        });
      }
    }

    if (allUpdates.length > 0) {
      await bulkUpdateCategories(allUpdates);
    }
  };


  const deleteCategory = async (path) => {
    if (!window.confirm(`カテゴリー「${path}」とその中のすべての記事を削除しますか？`)) return;
    try {
      const { data, error } = await supabase.from('wiki_pages').select('title, category');
      if (error) throw error;
      
      const toDelete = data.filter(item => 
        item.category === path || item.category?.startsWith(path + " > ")
      ).map(item => item.title);

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase.from('wiki_pages').delete().in('title', toDelete);
        if (deleteError) throw deleteError;
      }

      setWikiData(prev => {
        const next = { ...prev };
        toDelete.forEach(t => delete next[t]);
        return next;
      });
      
      if (toDelete.includes(currentTerm)) {
        setCurrentTerm("メインページ");
      }
    } catch (err) { alert(err.message); }
  };

  const addCategory = async (parentPath = "") => {
    const catName = window.prompt(parentPath ? `「${parentPath}」内の新しい子カテゴリー名:` : "新しいトップカテゴリー名:", "")?.trim();
    if (!catName) return;
    const fullPath = parentPath ? `${parentPath} > ${catName}` : catName;
    
    const pageTitle = window.prompt(`カテゴリー「${fullPath}」に作成する最初の記事のタイトル:`, "概要")?.trim();
    if (!pageTitle) return;
    
    if (wikiData[pageTitle]) {
      alert("そのタイトルの記事は既に存在します。");
      return;
    }

    const content = `<p>「${pageTitle}」の内容を記述してください。</p>`;
    try {
      const { error } = await supabase.from('wiki_pages').insert({ title: pageTitle, category: fullPath, content });
      if (error) throw error;
      setWikiData(prev => ({ ...prev, [pageTitle]: { title: pageTitle, category: fullPath, content } }));
      setCurrentTerm(pageTitle);
    } catch (err) { alert("カテゴリー追加に失敗しました: " + err.message); }
  };

  const restoreWikiData = async () => {
    try {
      setShowRestoreConfirm(false); setLoading(true);
      // 現在のステートまたはJSONからデータを準備
      const currentData = Object.keys(wikiData).length > 0 ? wikiData : WIKI_DATA;
      const entries = Object.entries(currentData);
      
      const toUpsert = entries.map(([title, details]) => {
        let category = details.category || "";
        if (title === "メインページ") category = "";
        else if (!category) category = "基本";
        return { title, category, content: details.content };
      });

      const { error } = await supabase.from('wiki_pages').upsert(toUpsert, { onConflict: 'title' });
      if (error) throw error;

      // 最新のデータを再取得
      const { data } = await supabase.from('wiki_pages').select('*');
      const dict = {}; 
      data?.forEach(row => dict[row.title] = { title: row.title, category: row.category, content: row.content });
      setWikiData(dict); 
      
      alert(`${toUpsert.length}件をクラウドに同期しました。`);
    } catch (err) { alert("同期エラー: " + err.message); } finally { setLoading(false); }
  };


  // 旧moveCategoryは削除されました（promote/demoteに統合）

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>読み込み中...</div>;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => setCurrentTerm("メインページ")} style={{ cursor: 'pointer' }}>改変用語まとめWiki</div>
        <div className="nav-section">
          <ul className="nav-links">
            <li className={`nav-item ${currentTerm === "メインページ" ? 'active' : ''}`} onClick={() => setCurrentTerm("メインページ")}><Book size={18} style={{marginRight: '10px'}}/> メインページ</li>
          </ul>
        </div>
        <div className="nav-section">
          <div className="nav-title-row">
            <h3 className="nav-title">カテゴリーツリー</h3>
            {isAdmin && (
              <button className="add-cat-btn" onClick={() => addCategory()} title="トップカテゴリーを追加">
                <Plus size={14} />
              </button>
            )}
          </div>
          <NavTree 
            items={categoryTree} 
            currentTerm={currentTerm} 
            onNavigate={setCurrentTerm} 
            onRenameCategory={renameCategory} 
            onDeleteCategory={deleteCategory}
            onAddSubCategory={addCategory}
            onPromoteCategory={promoteCategory}
            onDemoteCategory={demoteCategory}
            onReorderCategory={reorderCategory}
            isAdmin={isAdmin} 
          />
        </div>
        <div className="nav-section" style={{marginTop: '2rem'}}>
          <h3 className="nav-title">ツール</h3>
          <ul className="nav-links">
            <li><a href="#"><History size={16} style={{marginRight: '8px'}}/> 最近の更新</a></li>
            {isAdmin ? (
              <>
                <li style={{padding: '5px 10px', background: '#e3f2fd', color: '#1976d2', marginBottom: '10px', fontSize: '0.75rem'}}>管理者モード</li>
                <li><a href="#" onClick={startEditing}><Edit size={16} style={{marginRight: '8px'}}/> 編集</a></li>
                <li><a href="#" onClick={createNewPage}><Book size={16} style={{marginRight: '8px'}}/> 新規作成</a></li>
                <li><a href="#" onClick={handleLogout}><LogOut size={16} style={{marginRight: '8px'}}/> ログアウト</a></li>
                <li style={{marginTop: '15px'}}><button className="action-btn" onClick={() => setShowRestoreConfirm(true)} style={{width: '100%', color: '#1976d2'}}>現在の状態をクラウドに保存</button></li>
              </>
            ) : ( <li><a href="#" onClick={() => setShowLogin(true)}><User size={16} style={{marginRight: '8px'}}/> 管理者ログイン</a></li> )}
          </ul>
        </div>
      </aside>

      <main className="main-layout">
        <header className="header">
          <div className="breadcrumb">
            Wiki &gt; {currentTerm === "メインページ" ? "" : article.category + " > "}{currentTerm}
          </div>
          <div className="header-actions">
            {!isEditing ? (
              <div className="header-button-group">
                {isAdmin && ( 
                  <> 
                    <button className={`action-btn ${article.is_editing_status ? 'status-active-btn' : ''}`} onClick={toggleEditingStatus}>
                      <Lock size={16} /> {article.is_editing_status ? '「編集中」を解除' : '「編集中」に設定'}
                    </button>
                    <button className="action-btn" onClick={createNewPage}><Book size={16} /> 新規</button> 
                    <button className="action-btn" onClick={startEditing}><Edit size={16} /> 編集</button> 
                    {currentTerm !== "メインページ" && <button className="action-btn" onClick={deleteArticle}><Trash2 size={16} /> 削除</button>} 
                  </> 
                )}
              </div>
            ) : (
              <div className="edit-controls">
                <button className="action-btn" onClick={() => setIsEditing(false)}>キャンセル</button>
                <button className="action-btn save-btn" onClick={saveEdit}>保存</button>
              </div>
            )}
            <form className="search-box" onSubmit={handleSearch}>
              <Search size={18} color="#666" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="検索" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                list="search-suggestions"
              />
              <datalist id="search-suggestions">
                {Object.keys(wikiData).map(title => (
                  <option key={title} value={title} />
                ))}
              </datalist>
            </form>
          </div>
        </header>

        <div className="content-container">
          <article className="wiki-article">
            {isEditing ? (
              <div className="edit-metadata">
                <div className="metadata-field">
                  <label>タイトル</label>
                  <input 
                    type="text" 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)} 
                    placeholder="タイトルを入力"
                    disabled={currentTerm === "メインページ"}
                    className="title-edit-input"
                  />
                  {currentTerm === "メインページ" && (
                    <p style={{fontSize: '0.75rem', color: '#888', marginTop: '4px'}}>※メインページはタイトルの変更ができません。</p>
                  )}
                </div>
                {currentTerm !== "メインページ" && (
                  <div className="metadata-field">
                    <label>カテゴリー</label>
                    <input 
                      type="text" 
                      value={editCategory} 
                      onChange={(e) => setEditCategory(e.target.value)} 
                      placeholder="カテゴリーを入力 (例: 基本 > ツール)"
                      list="category-suggestions"
                    />
                    <datalist id="category-suggestions">
                      {Array.from(new Set(Object.values(wikiData).map(d => d.category))).filter(Boolean).map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="title-row">
                  <h1>{article.title}</h1>
                  {article.is_editing_status && <span className="editing-badge animate-pulse">編集中</span>}
                </div>
                {currentTerm !== "メインページ" && (
                  <div className="wiki-meta">カテゴリー: <strong>{article.category}</strong></div>
                )}
              </>
            )}
            
            {isEditing ? ( <VisualEditor content={editContent} onChange={setEditContent} /> ) : (
              <div className="wiki-text" dangerouslySetInnerHTML={{ __html: autoLink(article.content, Object.keys(wikiData), currentTerm) }} onClick={(e) => { if (e.target.classList.contains('internal-link')) setCurrentTerm(e.target.innerText); }} />
            )}
          </article>
        </div>
      </main>

      {showRestoreConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{textAlign: 'center', maxWidth: '400px'}}>
            <h3>クラウドへのデータ同期</h3>
            <p>現在のWikiの状態（記事、階層構造）をクラウド（Supabase）に完全に同期しますか？<br/><br/>※ブラウザ上の現在の表示内容がクラウドに上書き保存されます。</p>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px'}}>
              <button className="action-btn" onClick={() => setShowRestoreConfirm(false)}>キャンセル</button>
              <button className="action-btn save-btn" onClick={restoreWikiData}>同期を実行</button>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>ログイン</h3><button onClick={() => setShowLogin(false)}><X /></button></div>
            <form onSubmit={handleLogin} className="login-form">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
              <button type="submit" className="save-btn">ログイン</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
