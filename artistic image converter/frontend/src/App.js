import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("pencil");
  const [isLoading, setIsLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [pencilBlurKernelSize, setPencilBlurKernelSize] = useState(21);
  const [cartoonBrightnessFactor, setCartoonBrightnessFactor] = useState(1.0);
  const [cartoonDenoisingStrength, setCartoonDenoisingStrength] = useState(0.75);
  const [watercolorSigmaS, setWatercolorSigmaS] = useState(60);
  const [watercolorSigmaR, setWatercolorSigmaR] = useState(0.6);
  const [neonCannyLowThreshold, setNeonCannyLowThreshold] = useState(100);
  const [neonCannyHighThreshold, setNeonCannyHighThreshold] = useState(200);
  const [neonDilationKernelSize, setNeonDilationKernelSize] = useState(3);
  const [oilPaintBrightnessFactor, setOilPaintBrightnessFactor] = useState(1.0);
  const [oilPaintIntensity, setOilPaintIntensity] = useState(50);

  const API_BASE_URL = "https://artistic-image-converter.onrender.com";

  const resetParameters = useCallback((newStyle) => {
    switch (newStyle) {
      case 'pencil':
        setPencilBlurKernelSize(21);
        break;
      case 'cartoon':
        setCartoonBrightnessFactor(1.0);
        setCartoonDenoisingStrength(0.75);
        break;
      case 'watercolor':
        setWatercolorSigmaS(60);
        setWatercolorSigmaR(0.6);
        break;
      case 'neon':
        setNeonCannyLowThreshold(100);
        setNeonCannyHighThreshold(200);
        setNeonDilationKernelSize(3);
        break;
      case 'oil_paint':
        setOilPaintBrightnessFactor(1.0);
        setOilPaintIntensity(50);
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    resetParameters(selectedStyle);
  }, [selectedStyle, resetParameters]);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setFileName(file.name);
      setPreviewUrl(URL.createObjectURL(file));
      setConvertedUrl(null);
      setMessage(null);
    } else {
      setSelectedFile(null);
      setFileName("");
      setPreviewUrl(null);
      setMessage({ type: 'error', text: "Please select a valid image file." });
    }
  };

  const handleFileChange = (event) => {
    handleFile(event.target.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: "Please select an image file first." });
      return;
    }

    setIsLoading(true);
    setProcessing(true);
    setMessage(null);
    setConvertedUrl(null);

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("style", selectedStyle);

    switch (selectedStyle) {
      case 'pencil':
        const actualKernelSize = pencilBlurKernelSize % 2 === 0 ? pencilBlurKernelSize + 1 : pencilBlurKernelSize;
        formData.append("blur_kernel_size", actualKernelSize);
        break;
      case 'cartoon':
        formData.append("brightness_factor", cartoonBrightnessFactor);
        formData.append("denoising_strength", cartoonDenoisingStrength);
        break;
      case 'oil_paint':
        formData.append("brightness_factor", oilPaintBrightnessFactor);
        formData.append("oil_paint_intensity", oilPaintIntensity);
        break;
      case 'watercolor':
        formData.append("watercolor_sigma_s", watercolorSigmaS);
        formData.append("watercolor_sigma_r", watercolorSigmaR);
        break;
      case 'neon':
        formData.append("neon_canny_low_threshold", neonCannyLowThreshold);
        formData.append("neon_canny_high_threshold", neonCannyHighThreshold);
        formData.append("neon_dilation_kernel_size", neonDilationKernelSize);
        break;
      default:
        break;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/convert`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorText = "An unknown error occurred during conversion.";
        try {
          const errorData = await response.json();
          errorText = errorData.error || `HTTP error! status: ${response.status}`;
        } catch {
          errorText = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorText);
      }

      const data = await response.json();
      if (data.converted_image_data) {
        setConvertedUrl(`data:image/jpeg;base64,${data.converted_image_data}`);
        setMessage({ type: 'success', text: "Image converted successfully!" });
      } else {
        throw new Error("Backend did not return converted image data.");
      }
    } catch (err) {
      console.error("Conversion error:", err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileName("");
    setPreviewUrl(null);
    setConvertedUrl(null);
    setSelectedStyle("pencil");
    setIsLoading(false);
    setProcessing(false);
    setMessage(null);
    const fileInput = document.getElementById("file-upload");
    if (fileInput) fileInput.value = "";
    resetParameters("pencil");
  };

  return (
    <div className="container">
      <h1>Artistic Image Converter 🎨</h1>

      <div
        className={`upload-section ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/jpg, image/gif, image/bmp, image/tiff, image/webp"
          disabled={isLoading || processing}
        />
        <label
          htmlFor="file-upload"
          className="custom-file-upload"
          style={{ opacity: (isLoading || processing) ? 0.7 : 1, cursor: (isLoading || processing) ? 'not-allowed' : 'pointer' }}
        >
          {fileName ? "Change Image" : "Drag & Drop or Click to Select Image"}
        </label>
        {fileName && <p className="file-name">Selected: {fileName}</p>}
      </div>

      <div className="options-section">
        <label htmlFor="style-select">Choose Style:</label>
        <select
          id="style-select"
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          disabled={isLoading || processing}
        >
          <option value="pencil">Pencil Sketch</option>
          <option value="cartoon">Cartoon</option>
          <option value="watercolor">Watercolor</option>
          <option value="neon">Neon Glow</option>
          <option value="oil_paint">Oil Paint</option>
        </select>

        <div className="parameters-group">
          {selectedStyle === "pencil" && (
            <div className="param-slider">
              <label htmlFor="pencil-blur">Blur Kernel Size ({pencilBlurKernelSize})</label>
              <input
                type="range"
                id="pencil-blur"
                min="3"
                max="99"
                step="2"
                value={pencilBlurKernelSize}
                onChange={(e) => setPencilBlurKernelSize(Number(e.target.value))}
                disabled={isLoading || processing}
              />
            </div>
          )}

          {selectedStyle === "cartoon" && (
            <>
              <div className="param-slider">
                <label htmlFor="cartoon-brightness">Brightness Factor ({cartoonBrightnessFactor.toFixed(1)})</label>
                <input
                  type="range"
                  id="cartoon-brightness"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={cartoonBrightnessFactor}
                  onChange={(e) => setCartoonBrightnessFactor(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
              <div className="param-slider">
                <label htmlFor="cartoon-denoising">Denoising Strength ({cartoonDenoisingStrength.toFixed(2)})</label>
                <input
                  type="range"
                  id="cartoon-denoising"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={cartoonDenoisingStrength}
                  onChange={(e) => setCartoonDenoisingStrength(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
            </>
          )}

          {selectedStyle === "oil_paint" && (
            <>
              <div className="param-slider">
                <label htmlFor="oil-paint-brightness">Brightness Factor ({oilPaintBrightnessFactor.toFixed(1)})</label>
                <input
                  type="range"
                  id="oil-paint-brightness"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={oilPaintBrightnessFactor}
                  onChange={(e) => setOilPaintBrightnessFactor(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
              <div className="param-slider">
                <label htmlFor="oil-paint-intensity">Oil Paint Intensity ({oilPaintIntensity})</label>
                <input
                  type="range"
                  id="oil-paint-intensity"
                  min="10"
                  max="100"
                  step="10"
                  value={oilPaintIntensity}
                  onChange={(e) => setOilPaintIntensity(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
            </>
          )}

          {selectedStyle === "watercolor" && (
            <>
              <div className="param-slider">
                <label htmlFor="watercolor-sigma-s">Spatial Sigma ({watercolorSigmaS})</label>
                <input
                  type="range"
                  id="watercolor-sigma-s"
                  min="10"
                  max="100"
                  step="5"
                  value={watercolorSigmaS}
                  onChange={(e) => setWatercolorSigmaS(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
              <div className="param-slider">
                <label htmlFor="watercolor-sigma-r">Color Sigma ({watercolorSigmaR.toFixed(2)})</label>
                <input
                  type="range"
                  id="watercolor-sigma-r"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={watercolorSigmaR}
                  onChange={(e) => setWatercolorSigmaR(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
            </>
          )}

          {selectedStyle === "neon" && (
            <>
              <div className="param-slider">
                <label htmlFor="neon-canny-low">Canny Low Threshold ({neonCannyLowThreshold})</label>
                <input
                  type="range"
                  id="neon-canny-low"
                  min="0"
                  max="255"
                  step="5"
                  value={neonCannyLowThreshold}
                  onChange={(e) => setNeonCannyLowThreshold(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
              <div className="param-slider">
                <label htmlFor="neon-canny-high">Canny High Threshold ({neonCannyHighThreshold})</label>
                <input
                  type="range"
                  id="neon-canny-high"
                  min="0"
                  max="255"
                  step="5"
                  value={neonCannyHighThreshold}
                  onChange={(e) => setNeonCannyHighThreshold(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
              <div className="param-slider">
                <label htmlFor="neon-dilation-k">Dilation Kernel Size ({neonDilationKernelSize})</label>
                <input
                  type="range"
                  id="neon-dilation-k"
                  min="1"
                  max="7"
                  step="1"
                  value={neonDilationKernelSize}
                  onChange={(e) => setNeonDilationKernelSize(Number(e.target.value))}
                  disabled={isLoading || processing}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="button-group">
        <button onClick={handleConvert} disabled={isLoading || !selectedFile}>
          {processing ? "Processing..." : "Convert Image"}
        </button>
        <button onClick={handleReset} className="reset-button" disabled={isLoading || processing}>
          Reset
        </button>
      </div>

      {message && <p className={`message ${message.type}`}>{message.text}</p>}

      <div className="image-display-section">
        {processing ? (
          <p className="message">Processing image, please wait...</p>
        ) : (
          <div className="image-cards-wrapper">
            {previewUrl && (
              <div className="image-card">
                <h3>Original Image</h3>
                <img src={previewUrl} alt="Original" />
              </div>
            )}
            {convertedUrl && (
              <div className="image-card">
                <h3>Converted Image</h3>
                <img src={convertedUrl} alt="Converted Art" />
              </div>
            )}
          </div>
        )}

        {convertedUrl && !processing && (
          <a
            href={convertedUrl}
            download={`converted_image_${selectedStyle}.jpeg`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="download-button download-after-slider">Download Converted Image</button>
          </a>
        )}
      </div>
    </div>
  );
}

export default App;
