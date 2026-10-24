import React, { useState, useRef } from 'react';
import axios from 'axios';
import { ReactCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [compression, setCompression] = useState("Low");
  const [colorMode, setColorMode] = useState("bw");
  const [removeNoise, setRemoveNoise] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);

  const [cropIndex, setCropIndex] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 10) return alert("Max 10 images allowed.");
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const applyCrop = () => {
    if (!completedCrop || !imgRef.current) {
      setCropIndex(null);
      return;
    }
    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, completedCrop.width, completedCrop.height
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], files[cropIndex].name, { type: 'image/jpeg' });
      const newFiles = [...files];
      newFiles[cropIndex] = croppedFile;
      setFiles(newFiles);
      setCropIndex(null);
    }, 'image/jpeg');
  };

  const processFiles = async (analyze) => {
    if (files.length === 0) return alert("Upload at least one image.");
    setLoading(true);
    setAiData(null);
    
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("analyze", analyze);
    formData.append("rotation", rotation);
    formData.append("compression", compression);
    formData.append("color_mode", colorMode);
    formData.append("remove_noise", removeNoise);
    formData.append("custom_prompt", ""); // Explicitly send empty to trigger summary

    try {
      const response = await axios.post("http://127.0.0.1:8000/process-batch/", formData, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Processed_Document.pdf');
      document.body.appendChild(link);
      link.click();

      const rawAiResult = response.headers['x-ai-analysis'];
      if (analyze) {
        setAiData(rawAiResult ? decodeURIComponent(rawAiResult) : "ERROR");
      } else {
        setAiData("SUCCESS_NO_AI");
      }
    } catch (error) {
      console.error(error);
      setAiData("ERROR");
    }
    setLoading(false);
  };

  return (
    <div className="app-wrapper">
      <nav className="top-nav">
        <div className="nav-brand">
          <h1>DocuScan <span>Pro</span></h1>
        </div>
      </nav>

      <main className="main-container">
        <div className="workspace-card">
          <div className="toolbar" style={{flexWrap: 'wrap'}}>
            <div className="tool-group">
              <label>Color</label>
              <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
                <option value="bw">Black & White</option>
                <option value="color">Color</option>
              </select>
            </div>
            <div className="divider"></div>
            <div className="tool-group">
              <label>Rotation</label>
              <select value={rotation} onChange={(e) => setRotation(Number(e.target.value))}>
                <option value={0}>0°</option>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </div>
            <div className="divider"></div>
            <div className="tool-group">
              <label>Size</label>
              <select value={compression} onChange={(e) => setCompression(e.target.value)}>
                <option value="Low">Best Quality</option>
                <option value="High">Smallest</option>
              </select>
            </div>
            <div className="divider"></div>
            <div className="tool-group">
              <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                <input type="checkbox" checked={removeNoise} onChange={(e) => setRemoveNoise(e.target.checked)} />
                Denoise
              </label>
            </div>
          </div>

          <div className="dropzone-container">
            <input type="file" accept="image/*" multiple onChange={handleFileChange} id="file-upload" className="hidden-input"/>
            <label htmlFor="file-upload" className="dropzone">
              <h3>Drag & drop images here</h3>
            </label>
          </div>

          {files.length > 0 && (
            <div className="preview-section">
              <div className="preview-grid">
                {files.map((file, index) => (
                  <div key={index} className="preview-item">
                    <img src={URL.createObjectURL(file)} alt={`Page ${index + 1}`} />
                    <div className="preview-overlay">
                      <button className="crop-btn" onClick={() => { setCropIndex(index); setCrop({ unit: '%', width: 50, height: 50, x: 25, y: 25 }); }}>✂️ Crop</button>
                      <button className="delete-btn" onClick={() => removeFile(index)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="action-footer">
              <button className="btn-secondary" onClick={() => processFiles(false)} disabled={loading}>
                PDF Only
              </button>
              <button className="btn-primary" onClick={() => processFiles(true)} disabled={loading}>
                Generate PDF & AI Summary
              </button>
            </div>
          )}
        </div>

        {aiData && (
          <div className="result-banner success-alert" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            <div className="result-text">
              <h3>AI Document Summary:</h3>
              <p>{aiData === "SUCCESS_NO_AI" ? "PDF generated successfully." : aiData}</p>
            </div>
          </div>
        )}
      </main>

      {cropIndex !== null && (
        <div className="crop-modal">
          <div className="crop-modal-content">
            <h3>Crop Image</h3>
            <div className="crop-container">
              <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)}>
                <img ref={imgRef} src={URL.createObjectURL(files[cropIndex])} alt="Crop preview" style={{ maxHeight: '60vh' }} />
              </ReactCrop>
            </div>
            <div className="crop-actions">
              <button className="btn-secondary" onClick={() => setCropIndex(null)}>Cancel</button>
              <button className="btn-primary" onClick={applyCrop}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;