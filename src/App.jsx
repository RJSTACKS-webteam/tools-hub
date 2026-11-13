
import { useEffect, useState } from "react";
import "./App.css";
import mainLogo from "./assets/mainlogo.png";
import browserIcon from "./assets/logo.jpg";

// IMAGE TOOL COMPONENTS
import ImageCompressor from "./pages/ImageCompressor";
import ImageConverter from "./pages/ImageConverter";
import ImageOCR from "./pages/ImageOCR";

import ImageCropper from "./pages/ImageCropper";
import ImageAdjuster from "./pages/ImageAdjuster";
import ImageFilters from "./pages/ImageFilters";
import ImageBlur from "./pages/ImageBlur";
import ImageText from "./pages/ImageText";
import ImageDraw from "./pages/ImageDraw";
import ImageWatermark from "./pages/ImageWatermark";
import BackgroundRemover from "./pages/BackgroundRemover";
import ImageBase64 from "./pages/ImageBase64";
import ImageMetadata from "./pages/ImageMetadata";

// PDF TOOL COMPONENTS
import PDFMerger from "./pages/PDFMerger";
import PDFSplitter from "./pages/PDFSplitter";
import PDFCompressor from "./pages/PDFCompressor";
import PDFToWord from "./pages/PDFToWord";
import ImageToPDF from "./pages/ImageToPDF";

// VIDEO TOOL COMPONENTS
import VideoCompressor from "./pages/VideoCompressor";
import VideoConverter from "./pages/VideoConverter";
import VideoCutter from "./pages/VideoCutter";
import VideoMerger from "./pages/VideoMerger";

// AUDIO TOOL COMPONENTS
import AudioConverter from "./pages/AudioConverter";
import AudioCutter from "./pages/AudioCutter";
import AudioMerger from "./pages/AudioMerger";
import AudioCompressor from "./pages/AudioCompressor";

// DOCUMENT TOOL COMPONENTS
import WordToPDF from "./pages/WordToPDF";
import ExcelToPDF from "./pages/ExcelToPDF";
import PowerPointToPDF from "./pages/PowerPointToPDF";
import PDFWatermark from "./pages/PDFWatermark";
import PDFPageNumbers from "./pages/PDFPageNumbers";

// DEVELOPER TOOL COMPONENTS
import DeveloperTools from "./pages/DeveloperTools";

//other tools
import OtherTools from "./pages/OtherTools";

// APK TOOL COMPONENTS
import APKTools from "./pages/APKTools";


// MAIN TOOL CATEGORIES
const categories = [
  {
    id: "image",
    icon: "🖼️",
    name: "Image Tools",
    description: "Edit, resize and optimize images",
    tools: [
      "Image Editor",
      "Image Compressor",
      "Image Converter",
      "Image OCR",
    ],
  },
  {
    id: "pdf",
    icon: "📄",
    name: "PDF Tools",
    description: "Manage and edit PDF documents",
    tools: [
      "PDF Merger",
      "PDF Splitter",
      "PDF Compressor",
      "PDF to Word",
      "Image to PDF",
    ],
  },
  {
    id: "video",
    icon: "🎬",
    name: "Video Tools",
    description: "Convert, compress and edit videos",
    tools: [
      "Video Compressor",
      "Video Converter",
      "Video Cutter",
      "Video Merger",
    ],
  },
  {
    id: "audio",
    icon: "🎵",
    name: "Audio Tools",
    description: "Edit and convert audio files",
    tools: [
      "Audio Converter",
      "Audio Cutter",
      "Audio Merger",
      "Audio Compressor",
    ],
  },
  {
    id: "apk",
    icon: "📱",
    name: "APK Tools",
    description: "Inspect and analyze APK files",
    tools: [
      "APK Analyzer",
      "APK Information",
      "Permission Viewer",
      "Icon Extractor",
    ],
  },
  {
    id: "document",
    icon: "📝",
    name: "Document Tools",
    description: "Convert office documents and edit PDFs",
    tools: [
      "Word to PDF",
      "Excel to PDF",
      "PowerPoint to PDF",
      "PDF Watermark",
      "PDF Page Numbers",
    ],
  },
  {
    id: "developer",
    icon: "💻",
    name: "Developer Tools",
    description: "Useful utilities for developers",
    tools: [
      "JSON Formatter",
      "HTML Formatter",
      "Base64 Encoder",
      "URL Encoder",
      "CSS Formatter",
      "JavaScript Formatter & Minifier",
      "JWT Decoder",
      "UUID Generator",
      "Regex Tester",
    ],
  },
  {
    id: "other",
    icon: "🧰",
    name: "Other Tools",
    description: "More useful everyday utilities",
    tools: [
      "QR Generator",
      "ZIP Extractor",
      "Word Counter",
      "Password Generator",
    ],
  },
];

// IMAGE EDITOR OPTIONS
const editorOptions = [
  {
    id: "crop",
    icon: "✂️",
    name: "Image Cropper",
    description: "Crop images and adjust their composition",
  },
  {
    id: "adjust",
    icon: "☀️",
    name: "Brightness & Contrast",
    description: "Adjust brightness, contrast and saturation",
  },
  {
    id: "filters",
    icon: "🎨",
    name: "Filters & Effects",
    description: "Apply different image filters and effects",
  },
  {
    id: "blur",
    icon: "🌫️",
    name: "Blur Image",
    description: "Apply full image and spot blur effects",
  },
  {
    id: "text",
    icon: "🔤",
    name: "Add Text",
    description: "Add custom text to your images",
  },
  {
    id: "draw",
    icon: "✏️",
    name: "Draw on Image",
    description: "Draw, mark and annotate images",
  },
  {
    id: "watermark",
    icon: "©️",
    name: "Add Watermark",
    description: "Add text watermarks to images",
  },
  {
    id: "background",
    icon: "🪄",
    name: "Background Remover",
    description: "Manually remove unwanted backgrounds",
  },
  {
    id: "base64",
    icon: "💻",
    name: "Image to Base64",
    description: "Convert images into Base64 text",
  },
  {
    id: "metadata",
    icon: "🔍",
    name: "Image Metadata Viewer",
    description: "View image dimensions and EXIF details",
  },
];

// IMAGE EDITOR COMPONENT MAPPING
const imageEditorComponents = {
  crop: ImageCropper,
  adjust: ImageAdjuster,
  filters: ImageFilters,
  blur: ImageBlur,
  text: ImageText,
  draw: ImageDraw,
  watermark: ImageWatermark,
  background: BackgroundRemover,
  base64: ImageBase64,
  metadata: ImageMetadata,
};

function App() {
  useEffect(() => {
    let favicon = document.querySelector('link[rel~="icon"]');

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    favicon.type = "image/jpeg";
    favicon.href = browserIcon;
    document.title = "Tools Hub by RJStacks";
  }, []);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedEditorOption, setSelectedEditorOption] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  // CATEGORY AND SEARCH
  const activeCategory = categories.find(
    (category) => category.id === selectedCategory
  );

  const filteredCategories = categories.filter((category) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      category.name.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query) ||
      category.tools.some((tool) => tool.toLowerCase().includes(query))
    );
  });

  // TOOL COMPONENTS
  const toolComponents = {
    "Image Compressor": ImageCompressor,
    "Image Converter": ImageConverter,
    "Image OCR": ImageOCR,
    "PDF Merger": PDFMerger,
    "PDF Splitter": PDFSplitter,
    "PDF Compressor": PDFCompressor,
    "PDF to Word": PDFToWord,
    "Image to PDF": ImageToPDF,
    "Video Compressor": VideoCompressor,
    "Video Converter": VideoConverter,
    "Video Cutter": VideoCutter,
    "Video Merger": VideoMerger,
    "Audio Converter": AudioConverter,
    "Audio Cutter": AudioCutter,
    "Audio Merger": AudioMerger,
    "Audio Compressor": AudioCompressor,
    "Word to PDF": WordToPDF,
    "Excel to PDF": ExcelToPDF,
    "PowerPoint to PDF": PowerPointToPDF,
    "PDF Watermark": PDFWatermark,
    "PDF Page Numbers": PDFPageNumbers,
  };

  const ActiveEditorComponent =
    imageEditorComponents[selectedEditorOption];

  const ActiveToolComponent = toolComponents[selectedTool];

  const showHome = !selectedCategory && !selectedTool && !showDirectory;
  // NAVIGATION HELPERS
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const closeMenu = () => setIsMenuOpen(false);

  const goHome = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedTool(null);
    setSelectedEditorOption(null);
    setShowDirectory(false);
    closeMenu();
    scrollToTop();
  };

  const goToAllTools = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedTool(null);
    setSelectedEditorOption(null);
    setShowDirectory(true);
    closeMenu();
    scrollToTop();
  };

  const navigateToCategory = (categoryId) => {
    setSearch("");
    setSelectedCategory(categoryId);
    setSelectedTool(null);
    setSelectedEditorOption(null);
    setShowDirectory(true);
    closeMenu();
    scrollToTop();
  };

  // Returning from a tool keeps the current category selected.
  // This shows the category's tool list immediately, not the homepage.
  const resetTool = () => {
    setSelectedTool(null);
    setSelectedEditorOption(null);
    closeMenu();
    scrollToTop();
  };

  const openTool = (tool) => {
    setSelectedTool(tool);
    setSelectedEditorOption(null);
    closeMenu();
    scrollToTop();
  };

  const goBackToEditor = () => {
    setSelectedEditorOption(null);
    scrollToTop();
  };

  const goToAbout = () => {
    goHome();
    window.setTimeout(() => {
      document.getElementById("about")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setSelectedCategory(null);
    setSelectedTool(null);
    setSelectedEditorOption(null);
    setShowDirectory(false);
    closeMenu();
  };

  // Special category pages use their existing components.
  const SpecialCategoryComponent =
    selectedCategory === "developer"
      ? DeveloperTools
      : selectedCategory === "other"
        ? OtherTools
        : selectedCategory === "apk"
          ? APKTools
          : null;

  const showEditor = selectedTool === "Image Editor";
  const selectedEditor = editorOptions.find(
    (option) => option.id === selectedEditorOption
  );

  const showToolComponent =
    (showEditor && Boolean(ActiveEditorComponent)) ||
    (!showEditor && Boolean(ActiveToolComponent));

  const showPlaceholder =
    Boolean(selectedTool) && !showEditor && !ActiveToolComponent;

  return (
    <div className="app">
      {/* GLOBAL NAVBAR: available on home, category and tool pages */}
      <header className="navbar">
        <a
          href="#home"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            goHome();
          }}
          aria-label="Tools Hub home"
        >
          <img
            src={mainLogo}
            alt="Tools Hub by RJStacks"
            className="brand-logo"
          />
          
        </a>

        <div className="navbar-actions">
          <button
            type="button"
            className={`hamburger-button ${isMenuOpen ? "is-open" : ""}`}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            aria-controls="tools-navigation-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {isMenuOpen && (
          <>
            <button
              type="button"
              className="menu-backdrop"
              aria-label="Close navigation menu"
              onClick={closeMenu}
            />

            <nav
              className="navigation-menu"
              id="tools-navigation-menu"
              aria-label="Main navigation"
            >
              <div className="navigation-menu-heading">
                <div>
                  <span className="section-label">TOOLS HUB</span>
                  <h2>Quick Navigation</h2>
                </div>
                <button
                  type="button"
                  className="menu-close-button"
                  onClick={closeMenu}
                  aria-label="Close menu"
                >
                  ×
                </button>
              </div>

              <div className="navigation-main-links">
                <button type="button" onClick={goHome}>
                  <span className="navigation-item-icon">⌂</span>
                  <span>Home</span>
                </button>
                <button type="button" onClick={goToAllTools}>
                  <span className="navigation-item-icon">▦</span>
                  <span>All Tools</span>
                </button>
                <button type="button" onClick={goToAbout}>
                  <span className="navigation-item-icon">ⓘ</span>
                  <span>About</span>
                </button>
              </div>

              <div className="navigation-menu-divider" />

              <p className="navigation-menu-label">TOOL CATEGORIES</p>

              <div className="navigation-category-list">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    className={
                      selectedCategory === category.id
                        ? "active-navigation-category"
                        : ""
                    }
                    onClick={() => navigateToCategory(category.id)}
                  >
                    <span className="navigation-category-icon">
                      {category.icon}
                    </span>
                    <span className="navigation-category-name">
                      {category.name}
                    </span>
                    <span className="navigation-category-arrow">→</span>
                  </button>
                ))}
              </div>
            </nav>
          </>
        )}
      </header>

      {/* SPECIAL CATEGORY COMPONENTS */}
      {SpecialCategoryComponent ? (
        <SpecialCategoryComponent onBack={goToAllTools} />
      ) : showToolComponent ? (
        showEditor ? (
          <ActiveEditorComponent onBack={goBackToEditor} />
        ) : (
          <ActiveToolComponent onBack={resetTool} />
        )
      ) : (
        <>
          <main>
            {/* HOMEPAGE HERO: shown only on the actual home page */}
            {showHome && (
              <section className="hero" id="home">
                <span className="hero-badge">
                  ✨ Your All-in-One Utility Platform
                </span>

                <h1>
                  Everything You Need.
                  <br />
                  <span>All in One Place.</span>
                </h1>

                <p>
                  Simple, powerful and free tools to edit, convert,
                  compress and manage your files.
                </p>

                <div className="search-box">
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Search for a tool..."
                    value={search}
                    onChange={handleSearchChange}
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="hero-note">
                  <span>✓ Free to use</span>
                  <span>✓ Easy to use</span>
                  <span>✓ No registration required</span>
                </div>
              </section>
            )}

            {/* CATEGORY DIRECTORY AND CATEGORY TOOL LIST */}
            <section className="categories-section" id="categories">
              {selectedTool ? (
                <div className="section-heading">
                  <div>
                    <span className="section-label">IMAGE EDITOR</span>
                    <h2>{selectedTool}</h2>
                    <p>Choose an editing option to continue.</p>
                  </div>
                  <span className="tool-count">Tools Hub</span>
                </div>
              ) : (
                <>
                  {!activeCategory && (
                    <div className="section-heading">
                      <div>
                        <span className="section-label">OUR COLLECTION</span>
                        <h2>
                          {showHome ? "Explore Our Tools" : "All Tools"}
                        </h2>
                        <p>Choose a category to find the tool you need.</p>
                      </div>
                      <span className="tool-count">
                        {filteredCategories.length} Categories
                      </span>
                    </div>
                  )}

                  {activeCategory && (
                    <div className="section-heading">
                      <div>
                        <span className="section-label">TOOL CATEGORY</span>
                        <h2>{activeCategory.name}</h2>
                        <p>{activeCategory.description}</p>
                      </div>
                      <span className="tool-count">
                        {activeCategory.tools.length} Tools
                      </span>
                    </div>
                  )}

                  {activeCategory ? (
                    <div className="category-details">
                      <button
                        type="button"
                        className="back-button"
                        onClick={goToAllTools}
                      >
                        ← All Categories
                      </button>

                      <h2>
                        {activeCategory.icon} {activeCategory.name}
                      </h2>

                      <p>{activeCategory.description}</p>

                      <div className="tools-grid">
                        {activeCategory.tools.map((tool) => (
                          <button
                            type="button"
                            className="tool-item"
                            key={tool}
                            onClick={() => openTool(tool)}
                          >
                            <span>⚙️</span>
                            <span>{tool}</span>
                            <span className="tool-arrow">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="category-grid">
                      {filteredCategories.map((category) => (
                        <button
                          type="button"
                          className="category-card"
                          key={category.id}
                          onClick={() => navigateToCategory(category.id)}
                        >
                          <span className="category-icon">{category.icon}</span>
                          <h3>{category.name}</h3>
                          <p>{category.description}</p>
                          <span className="card-footer">
                            Explore Tools <span>→</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredCategories.length === 0 && !activeCategory && (
                    <div className="empty-state">
                      <span>🔎</span>
                      <h3>No tools found</h3>
                      <p>Try searching with another keyword.</p>
                    </div>
                  )}
                </>
              )}

              {/* IMAGE EDITOR OPTIONS */}
              {showEditor && !ActiveEditorComponent && (
                <div className="category-details editor-workspace">
                  <button
                    type="button"
                    className="back-button"
                    onClick={resetTool}
                  >
                    ← All Image Tools
                  </button>

                  <div className="editor-intro">
                    <span style={{ fontSize: "48px" }}>🖼️</span>
                    <h2>Image Editor</h2>
                    <p>
                      Edit your images with all the tools you need
                      in one place.
                    </p>
                  </div>

                  <div className="tools-grid editor-grid">
                    {editorOptions.map((option) => (
                      <button
                        type="button"
                        className={`tool-item ${
                          selectedEditorOption === option.id
                            ? "selected-tool"
                            : ""
                        }`}
                        key={option.id}
                        onClick={() => {
                          setSelectedEditorOption(option.id);
                          scrollToTop();
                        }}
                      >
                        <span>{option.icon}</span>
                        <span className="editor-option-content">
                          <strong>{option.name}</strong>
                          <small>{option.description}</small>
                        </span>
                        <span className="tool-arrow">→</span>
                      </button>
                    ))}
                  </div>

                  {selectedEditor && !ActiveEditorComponent && (
                    <div className="editor-coming-soon">
                      <h3>
                        {selectedEditor.icon} {selectedEditor.name}
                      </h3>
                      <p>{selectedEditor.description}</p>
                      <p>
                        This feature is currently under development.
                        It will be available in a future update.
                      </p>
                      <button
                        type="button"
                        className="back-button"
                        onClick={goBackToEditor}
                      >
                        ← Back to Editing Options
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* UNIMPLEMENTED TOOL PLACEHOLDER */}
              {showPlaceholder && (
                <div className="category-details">
                  <button
                    type="button"
                    className="back-button"
                    onClick={resetTool}
                  >
                    ← Back to {activeCategory?.name || "All Tools"}
                  </button>

                  <div className="editor-intro">
                    <span style={{ fontSize: "48px" }}>
                      {activeCategory?.icon || "🛠️"}
                    </span>
                    <h2>{selectedTool}</h2>
                    <p>This tool is currently under development.</p>
                    <p>
                      We are building more useful features for Tools Hub.
                      Please check back soon.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* ABOUT SECTION */}
            {showHome && (
              <section className="about-section" id="about">
                <span className="section-label">ABOUT RJSTACKS</span>
                <h2>Useful tools. Built for everyday work.</h2>
                <p>
                  Tools Hub is a digital utility platform by RJStacks,
                  a startup focused on building practical digital products
                  that make everyday tasks simpler.
                </p>
                <p>
                  Our goal is to bring helpful tools for images, documents,
                  PDFs, videos, audio and more together in one easy-to-use
                  place. We are continuously working to improve the
                  platform and add more useful features.
                </p>
                <div className="about-signature">
                  <strong>RJStacks</strong>
                  <span>Building useful digital experiences.</span>
                </div>
              </section>
            )}
          </main>

          {/* FOOTER */}
          {showHome && (
            <footer className="footer">
              <div className="brand">
                <img
                  src={mainLogo}
                  alt="Tools Hub by RJStacks"
                  className="brand-logo"
                />
              </div>
              <p>© 2026 Tools Hub by RJStacks. All rights reserved.</p>
              <p>Simple tools. Better productivity.</p>
            </footer>
          )}
        </>
      )}
    </div>
  );
}

export default App;
