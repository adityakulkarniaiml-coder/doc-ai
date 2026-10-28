import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Home, FileText, Settings, Zap, Sun, Moon, UploadCloud,
  Trash2, Plus, Sparkles, Copy, CheckCircle, ChevronDown, Eye, Download
} from 'lucide-react';
import './App.css';

const DOCUMENT_DB_NAME = 'docuscan-documents';
const DOCUMENT_STORE_NAME = 'recent-documents';
const MAX_RECENT_DOCUMENTS = 10;
const DEFAULT_CROP = { unit: '%', x: 10, y: 10, width: 80, height: 80 };

function openDocumentDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DOCUMENT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DOCUMENT_STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getRecentDocuments() {
  return openDocumentDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE_NAME, 'readonly');
    const request = transaction.objectStore(DOCUMENT_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_RECENT_DOCUMENTS));
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  }));
}

function saveRecentDocument(blob) {
  return openDocumentDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(DOCUMENT_STORE_NAME);
    const request = store.add({
      name: `Processed_Document_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`,
      blob,
      createdAt: Date.now(),
    });
    let recentDocuments = [];

    request.onsuccess = () => {
      const savedId = request.result;
      const allDocumentsRequest = store.getAll();
      allDocumentsRequest.onsuccess = () => {
        const documents = allDocumentsRequest.result.sort((a, b) => b.createdAt - a.createdAt);
        documents.slice(MAX_RECENT_DOCUMENTS).forEach((document) => store.delete(document.id));
        recentDocuments = documents.slice(0, MAX_RECENT_DOCUMENTS);
        if (!recentDocuments.some((document) => document.id === savedId)) {
          recentDocuments.unshift({ ...documents.find((document) => document.id === savedId), id: savedId });
        }
      };
      allDocumentsRequest.onerror = () => reject(allDocumentsRequest.error);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      database.close();
      resolve(recentDocuments);
    };
    transaction.onerror = () => reject(transaction.error);
  }));
}

function App() {
  const [files, setFiles] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [compression, setCompression] = useState("Low");
  const [colorMode, setColorMode] = useState("bw");
  const [removeNoise, setRemoveNoise] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [activePage, setActivePage] = useState('home');
  const [theme, setTheme] = useState(() => localStorage.getItem('docuscan-theme') || 'light');
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [documentError, setDocumentError] = useState('');
  const [cropSelection, setCropSelection] = useState({});
  const [cropDialogIndex, setCropDialogIndex] = useState(null);
  const [cropDraft, setCropDraft] = useState(DEFAULT_CROP);
  const [cropPreviewUrl, setCropPreviewUrl] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('docuscan-theme', theme);
  }, [theme]);

  useEffect(() => {
    getRecentDocuments()
      .then(setRecentDocuments)
      .catch((error) => {
        console.error('Could not load recent documents:', error);
        setDocumentError('Recent documents could not be loaded from this browser.');
      });
  }, []);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 10) return alert("Max 10 images allowed.");
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles((currentFiles) => currentFiles.filter((_, i) => i !== index));
    setCropSelection((current) => {
      const next = {};
      Object.entries(current).forEach(([key, value]) => {
        const cropIndex = Number(key);
        if (cropIndex < index) {
          next[cropIndex] = value;
        } else if (cropIndex > index) {
          next[cropIndex - 1] = value;
        }
      });
      return next;
    });
  };

  const openCropEditor = (index) => {
    setCropDialogIndex(index);
    setCropDraft(cropSelection[index] || DEFAULT_CROP);
    setCropPreviewUrl(URL.createObjectURL(files[index]));
  };

  const closeCropEditor = () => {
    setCropDialogIndex(null);
    setCropDraft(DEFAULT_CROP);
    setCropPreviewUrl('');
  };

  const saveCropSelection = () => {
    if (cropDialogIndex === null) return;
    setCropSelection((current) => ({
      ...current,
      [cropDialogIndex]: cropDraft,
    }));
    closeCropEditor();
  };

  const clearCropSelection = (index) => {
    setCropSelection((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  const processFiles = async (analyze) => {
    if (files.length === 0) return alert("Upload at least one image.");
    setLoading(true);
    setAiData(null);
    setActiveTab('summary');
    
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("analyze", analyze);
    formData.append("rotation", rotation);
    formData.append("compression", compression);
    formData.append("color_mode", colorMode);
    formData.append("remove_noise", removeNoise);
    formData.append("custom_prompt", "");
    formData.append("crop_data", JSON.stringify(files.map((_, index) => cropSelection[index] || null)));

    try {
      const response = await axios.post("http://127.0.0.1:8000/process-batch/", formData, {
        responseType: 'blob'
      });
      
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Processed_Document_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);

      try {
        setRecentDocuments(await saveRecentDocument(pdfBlob));
        setDocumentError('');
      } catch (error) {
        console.error('Could not save the processed PDF to My Documents:', error);
        setDocumentError('The PDF was downloaded, but could not be saved to My Documents.');
      }

      const rawAiResult = response.headers['x-ai-analysis'];
      if (analyze) {
        setAiData(rawAiResult ? decodeURIComponent(rawAiResult) : "ERROR");
      } else {
        setAiData("SUCCESS_NO_AI");
      }
    } catch (error) {
      console.error(error);
      setAiData("Error: Could not process AI request.");
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-layout" data-theme={theme}>
      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-icon"><FileText size={20} color="white" /></div>
          <h2>DocuScan <span>Pro</span></h2>
        </div>
        <nav className="sidebar-nav">
          <button type="button" className={`nav-item ${activePage === 'home' ? 'active' : ''}`} onClick={() => setActivePage('home')}><Home size={18} /> Home</button>
          <button type="button" className={`nav-item ${activePage === 'documents' ? 'active' : ''}`} onClick={() => setActivePage('documents')}><FileText size={18} /> My Documents</button>
          <button type="button" className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => setActivePage('settings')}><Settings size={18} /> Settings</button>
        </nav>
        <div className="sidebar-footer">
          <div className="ai-badge">
            <Zap size={16} fill="currentColor" />
            <div>
              <strong>AI Powered</strong>
              <p>Turn your documents into smart insights.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* HEADER */}
        <header className="top-header">
          <div className="header-breadcrumbs">Scan • Process • Summarize</div>
          <div className="header-actions">
            <button type="button" className="theme-shortcut" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="user-profile">
              <div className="avatar">A</div>
              <span>Aditya</span>
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        {activePage === 'home' ? <div className="workspace">
          {/* HERO BANNER */}
          <div className="hero-banner">
            <div className="hero-text">
              <h2><Sparkles size={24} color="#4F46E5" /> Transform Your Documents</h2>
              <p>Upload images or scanned documents, optimize them with AI, and get instant PDF & intelligent summaries.</p>
            </div>
            <div className="hero-illustration"></div>
          </div>

          {/* TOOLBAR */}
          <div className="controls-card">
            <div className="control-group">
              <label>Color Mode</label>
              <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
                <option value="bw">Black & White</option>
                <option value="color">Color</option>
              </select>
            </div>
            <div className="control-group">
              <label>Rotation</label>
              <select value={rotation} onChange={(e) => setRotation(Number(e.target.value))}>
                <option value={0}>0°</option>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </div>
            <div className="control-group">
              <label>Compression</label>
              <select value={compression} onChange={(e) => setCompression(e.target.value)}>
                <option value="Low">Best Quality</option>
                <option value="Medium">Standard</option>
                <option value="High">Smallest</option>
              </select>
            </div>
            <div className="control-group toggle-group">
              <label>Denoise</label>
              <button type="button" className={`toggle-switch ${removeNoise ? 'on' : 'off'}`} onClick={() => setRemoveNoise(!removeNoise)} role="switch" aria-checked={removeNoise} aria-label="Denoise">
                <div className="knob"></div>
              </button>
            </div>
          </div>

          {/* DROPZONE */}
          <div className="upload-section">
            <input type="file" accept="image/*" multiple onChange={handleFileChange} id="file-upload" className="hidden-input"/>
            <label htmlFor="file-upload" className="dropzone-area">
              <UploadCloud size={40} color="#4F46E5" />
              <h3>Drag & drop images here</h3>
              <p>or click to browse files</p>
              <span>Supports JPG and PNG images (up to 10 files)</span>
            </label>
          </div>

          {/* UPLOADED FILES GRID */}
          {files.length > 0 && (
            <div className="files-section">
              <div className="files-header">
                <h3>Uploaded Files <span>({files.length}/10)</span></h3>
                <button onClick={() => {
                  setFiles([]);
                  setCropSelection({});
                }} className="clear-btn"><Trash2 size={14} /> Clear All</button>
              </div>
              <div className="files-grid">
                {files.map((file, index) => (
                  <div key={index} className="file-card">
                    <div className="file-badge">{index + 1}</div>
                    <img src={URL.createObjectURL(file)} alt={`Page ${index + 1}`} />
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <div className="file-actions">
                      <button type="button" onClick={() => openCropEditor(index)} className="crop-btn">
                        {cropSelection[index] ? 'Edit Crop' : 'Crop'}
                      </button>
                      {cropSelection[index] && (
                        <button type="button" onClick={() => clearCropSelection(index)} className="crop-clear-btn">
                          Clear
                        </button>
                      )}
                      <button type="button" onClick={() => removeFile(index)} className="delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {files.length < 10 && (
                  <label htmlFor="file-upload" className="add-more-card">
                    <Plus size={24} color="#6B7280" />
                    <span>Add More</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {cropDialogIndex !== null && cropPreviewUrl && (
            <div className="crop-modal-backdrop" onClick={closeCropEditor}>
              <div className="crop-modal" onClick={(event) => event.stopPropagation()}>
                <div className="crop-modal-header">
                  <h3>Crop image</h3>
                  <button type="button" className="close-btn" onClick={closeCropEditor}>Close</button>
                </div>
                <div className="crop-editor">
                  <ReactCrop
                    crop={cropDraft}
                    onChange={(_, percentCrop) => setCropDraft(percentCrop)}
                  >
                    <img src={cropPreviewUrl} alt={`Page ${cropDialogIndex + 1} crop preview`} />
                  </ReactCrop>
                </div>
                <div className="crop-actions">
                  <button type="button" className="btn-outline" onClick={closeCropEditor}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={saveCropSelection}>Apply Crop</button>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="main-footer">
            <button className="advanced-btn"><Settings size={16} /> Advanced Options</button>
            <div className="action-buttons">
              <button className="btn-outline" onClick={() => processFiles(false)} disabled={loading}>
                <FileText size={16} /> PDF Only
              </button>
              <button className="btn-primary" onClick={() => processFiles(true)} disabled={loading}>
                <Sparkles size={16} /> Generate PDF & AI Summary
              </button>
            </div>
          </div>
        </div> : activePage === 'documents' ? <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR LIBRARY</p>
              <h1>My Documents</h1>
              <p className="page-description">Your 10 most recently converted PDFs are saved here on this device.</p>
            </div>
            <FileText size={32} />
          </div>
          {documentError && <p className="notice" role="status">{documentError}</p>}
          {recentDocuments.length ? <div className="document-list">
            {recentDocuments.map((document) => (
              <article className="document-row" key={document.id}>
                <div className="document-icon"><FileText size={20} /></div>
                <div className="document-details">
                  <strong title={document.name}>{document.name}</strong>
                  <span>{new Date(document.createdAt).toLocaleString()} · {(document.blob.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <button className="document-download" type="button" onClick={() => {
                  const url = URL.createObjectURL(document.blob);
                  const link = window.document.createElement('a');
                  link.href = url;
                  link.download = document.name;
                  link.click();
                  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
                }} aria-label={`Download ${document.name}`}>
                  <Download size={18} /><span>Download</span>
                </button>
              </article>
            ))}
          </div> : <div className="empty-documents">
            <FileText size={30} />
            <h2>No converted PDFs yet</h2>
            <p>Once you convert a document, your recent PDFs will appear here.</p>
            <button className="btn-primary" onClick={() => setActivePage('home')}>Create a PDF</button>
          </div>}
        </section> : <section className="page-content settings-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">PREFERENCES</p>
              <h1>Settings</h1>
              <p className="page-description">Personalize how DocuScan looks on this device.</p>
            </div>
            <Settings size={32} />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Appearance</strong>
              <span>Choose a light or dark color theme.</span>
            </div>
            <div className="theme-options" role="group" aria-label="Appearance">
              <button type="button" className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')} aria-pressed={theme === 'light'}>
                <Sun size={18} /> Light
              </button>
              <button type="button" className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}>
                <Moon size={18} /> Dark
              </button>
            </div>
          </div>
        </section>}
      </main>

      {/* RIGHT PANEL (Preview & Summary) */}
      {activePage === 'home' && <aside className="right-panel">
        <div className="panel-tabs">
          <button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}>
            <Eye size={16} /> Preview
          </button>
          <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>
            <Sparkles size={16} /> AI Summary
          </button>
        </div>

        <div className="panel-content">
          {activeTab === 'summary' ? (
            <div className="summary-tab">
              {aiData ? (
                <div className="summary-card">
                  <div className="summary-header">
                    <h4><Sparkles size={16} color="#4F46E5" /> AI Document Summary</h4>
                    <button className="copy-btn"><Copy size={14} /> Copy</button>
                  </div>
                  <div className="summary-body">
                    {aiData === "SUCCESS_NO_AI" ? "PDF generated successfully. No AI summary requested." : aiData}
                  </div>
                  <div className="summary-footer">
                    <span className="success"><CheckCircle size={14} /> PDF generated successfully!</span>
                    <span className="time">Just now</span>
                  </div>
                </div>
              ) : (
                <div className="empty-state">Process a document to see the AI summary here.</div>
              )}
            </div>
          ) : (
            <div className="preview-tab">
              <div className="preview-toolbar">
                <span>100%</span>
              </div>
              <div className="preview-canvas">
                 {files.length > 0 ? (
                   <img src={URL.createObjectURL(files[0])} alt="Preview" />
                 ) : (
                   <div className="empty-state">Upload a document to preview.</div>
                 )}
              </div>
            </div>
          )}
        </div>
      </aside>}
    </div>
  );
}

export default App;