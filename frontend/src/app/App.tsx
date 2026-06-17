import { useEffect } from 'react';
import './audiobook.css';

export default function App() {
  useEffect(() => {
    // Import and initialize the audiobook app
    import('./audiobook.js').then(module => {
      if (module.initAudioBook) {
        module.initAudioBook();
      }
    });
  }, []);

  return (
    <div id="audiobook-root">
      {/* Custom Cursor */}
      <div id="custom-cursor" className="custom-cursor"></div>

      {/* Focus Ring Overlay */}
      <div id="focus-ring" className="focus-ring"></div>

      {/* Swipe Trail Container */}
      <div id="swipe-trail-container"></div>

      {/* Toast Notification */}
      <div id="toast" className="toast"></div>

      {/* Gesture Hint Panel */}
      <div className="gesture-hints">
        <div className="hint-title">Gestures</div>
        <div className="hint-item">👆 Hover → Focus</div>
        <div className="hint-item">↔️ Drag 60px → Navigate</div>
        <div className="hint-item">👆👆 Double-click → Activate</div>
      </div>

      {/* Main App Container */}
      <div id="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="logo">
            <div className="logo-mark"></div>
            <div className="logo-text">
              <h1>AudioBook</h1>
              <p className="subtitle">PDF to Voice · For Everyone</p>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="main-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <nav className="nav-items">
              {/* I'll comment some codes to save time, but I'll make sure to add it back later */}
              <div className="nav-item"
                role="button"
                tabIndex={0}
                data-page="library"
                data-caption="My Library navigation button, shows 12 books in your collection, double-click to view your library">
                <span className="nav-icon">📚</span>
                <span className="nav-label">My Library</span>
                <span className="nav-badge">12 books</span>
              </div>

              {/* <div className="nav-item" 
                   role="button" 
                   tabIndex={0} 
                   data-page="now-playing"
                   data-caption="Now Playing navigation button, currently playing A Brief History of Time, has a live indicator, double-click to open player">
                <span className="nav-icon">▶️</span>
                <span className="nav-label">Now Playing</span>
                <span className="nav-badge live-badge">LIVE</span>
              </div> */}

              <div className="nav-item"
                role="button"
                tabIndex={0}
                data-page="upload"
                data-caption="Upload PDF navigation button, add new books to your library, double-click to open upload page">
                <span className="nav-icon">⬆️</span>
                <span className="nav-label">Upload PDF</span>
              </div>

              {/* <div className="nav-item" 
                   role="button" 
                   tabIndex={0} 
                   data-page="voice-search"
                   data-caption="Voice Search navigation button, new feature for searching books by voice, double-click to start voice search">
                <span className="nav-icon">🎙️</span>
                <span className="nav-label">Voice Search</span>
                <span className="nav-badge new-badge">NEW</span>
              </div>
              
              <div className="nav-item" 
                   role="button" 
                   tabIndex={0} 
                   data-page="settings"
                   data-caption="Settings navigation button, configure voice speed, captions, and accessibility options, double-click to open settings">
                <span className="nav-icon">⚙️</span>
                <span className="nav-label">Settings</span>
              </div> */}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="main-content">
            {/* Library Page (Default) */}
            <div id="page-library" className="page">

              <section className="library-section">
                <h2 className="section-title">My Library</h2>
                <div className="library-grid" id="library-grid">
                  {/* Books are injected dynamically by audiobook.js → renderLibraryGrid() */}
                </div>
              </section>
            </div>

            {/* Now Playing Page */}
            <div id="page-now-playing" className="page">
              <div className="player-page">
                <button className="back-button" data-action="back">← Back to Library</button>

                <div className="current-book-header">
                  <div className="book-cover-medium"></div>
                  <div>
                    <h2 className="current-book-title">A Brief History of Time</h2>
                    <p className="current-book-author">Stephen Hawking</p>
                    <p className="current-chapter">Chapter 3: The Expanding Universe</p>
                  </div>
                </div>

                <div className="current-paragraph">
                  <p className="paragraph-text">
                    The discovery that the universe is <span className="word-highlight">expanding</span> was one of the great intellectual revolutions of the twentieth century. With hindsight, it is easy to wonder why no one had thought of it before.
                  </p>
                </div>

                <div className="player-controls-large">
                  <div className="control-item"
                    role="button"
                    tabIndex={0}
                    data-action="prev-chapter"
                    data-caption="Previous chapter button, go to chapter 2, double-click to navigate">
                    <span className="control-icon">⏮⏮</span>
                    <span className="control-label">Previous Chapter</span>
                  </div>

                  <div className="control-item"
                    role="button"
                    tabIndex={0}
                    data-action="rewind"
                    data-caption="Rewind 30 seconds button, double-click to rewind">
                    <span className="control-icon">⏮</span>
                    <span className="control-label">30s</span>
                  </div>

                  <div className="control-item primary large"
                    role="button"
                    tabIndex={0}
                    data-action="pause"
                    data-caption="Pause playback button, currently playing, double-click to pause">
                    <span className="control-icon">⏸</span>
                    <span className="control-label">Pause</span>
                  </div>

                  <div className="control-item"
                    role="button"
                    tabIndex={0}
                    data-action="forward"
                    data-caption="Skip forward 30 seconds button, double-click to skip">
                    <span className="control-icon">⏭</span>
                    <span className="control-label">30s</span>
                  </div>

                  <div className="control-item"
                    role="button"
                    tabIndex={0}
                    data-action="next-chapter"
                    data-caption="Next chapter button, go to chapter 4, double-click to navigate">
                    <span className="control-icon">⏭⏭</span>
                    <span className="control-label">Next Chapter</span>
                  </div>
                </div>

                <div className="chapter-list">
                  <h3 className="section-subtitle">Chapters</h3>
                  <div className="chapter-items">
                    <div className="chapter-item" role="button" tabIndex={0} data-caption="Chapter 1: Our Picture of the Universe, completed, double-click to play">
                      <span className="chapter-number">1</span>
                      <span className="chapter-name">Our Picture of the Universe</span>
                      <span className="chapter-status">✓</span>
                    </div>
                    <div className="chapter-item" role="button" tabIndex={0} data-caption="Chapter 2: Space and Time, completed, double-click to play">
                      <span className="chapter-number">2</span>
                      <span className="chapter-name">Space and Time</span>
                      <span className="chapter-status">✓</span>
                    </div>
                    <div className="chapter-item active" role="button" tabIndex={0} data-caption="Chapter 3: The Expanding Universe, currently playing, double-click to restart">
                      <span className="chapter-number">3</span>
                      <span className="chapter-name">The Expanding Universe</span>
                      <span className="chapter-status">▶️</span>
                    </div>
                    <div className="chapter-item" role="button" tabIndex={0} data-caption="Chapter 4: The Uncertainty Principle, not started, double-click to play">
                      <span className="chapter-number">4</span>
                      <span className="chapter-name">The Uncertainty Principle</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Page */}
            <div id="page-upload" className="page active">
              <div className="upload-page">
                <button className="back-button" data-action="back">← Kembali ke Perpustakaan</button>

                <h2 className="page-title">Unggah PDF</h2>

                {/* Form: Judul dan Penulis */}
                <div className="upload-form" id="upload-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="pdf-title-input">Judul Buku</label>
                    <input
                      type="text"
                      id="pdf-title-input"
                      className="form-input"
                      placeholder="Masukkan judul buku..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pdf-author-input">Nama Penulis</label>
                    <input
                      type="text"
                      id="pdf-author-input"
                      className="form-input"
                      placeholder="Masukkan nama penulis..."
                    />
                  </div>
                </div>

                {/* Drop zone */}
                <div className="drop-zone"
                  role="button"
                  tabIndex={0}
                  data-action="select-file"
                  data-caption="Area unggah PDF, seret dan lepas file PDF di sini atau klik dua kali untuk memilih file dari perangkat Anda">
                  <div className="drop-zone-content">
                    <div className="upload-icon-large">📄</div>
                    <h3 className="drop-zone-title" id="drop-zone-title">Letakkan PDF di Sini</h3>
                    <p className="drop-zone-text" id="drop-zone-text">atau klik dua kali untuk memilih file</p>
                  </div>
                </div>

                {/* Input file tersembunyi */}
                <input type="file" id="pdf-file-input" accept=".pdf" style={{ display: 'none' }} />

                {/* Tombol unggah (muncul setelah file dipilih) */}
                <div className="submit-upload-btn"
                  id="submit-upload-btn"
                  role="button"
                  tabIndex={0}
                  data-action="submit-upload"
                  data-caption="Tombol mulai membaca, unggah PDF dan mulai membaca, klik dua kali untuk mengunggah"
                  style={{ display: 'none' }}>
                  <span className="control-icon">📚</span>
                  <span className="control-label">Mulai Membaca</span>
                </div>

                <div className="processing-animation" style={{ display: 'none' }}>
                  <div className="spinner"></div>
                  <p className="processing-status">Memproses buku Anda...</p>
                  <p className="processing-step">Mengekstrak teks dari PDF</p>
                </div>

                <div className="upload-success" style={{ display: 'none' }}>
                  <div className="success-icon">✓</div>
                  <h3 className="success-title">Buku Berhasil Disimpan!</h3>
                  <p className="success-text">PDF tersimpan di perpustakaan Anda</p>

                  <div className="control-item primary"
                    role="button"
                    tabIndex={0}
                    data-action="start-reading"
                    data-caption="Tombol baca sekarang, buka pembaca PDF, klik dua kali untuk mulai">
                    <span className="control-label">Baca Sekarang</span>
                  </div>

                  <div className="control-item"
                    style={{ marginTop: '16px' }}
                    role="button"
                    tabIndex={0}
                    data-action="go-to-library"
                    data-caption="Ke perpustakaan, lihat semua buku tersimpan, klik dua kali untuk buka">
                    <span className="control-label">📚 Ke Perpustakaan</span>
                  </div>

                  <div className="control-item"
                    style={{ marginTop: '16px' }}
                    role="button"
                    tabIndex={0}
                    data-action="reset-upload"
                    data-caption="Tombol unggah PDF lain, kembali ke halaman awal, klik dua kali untuk reset">
                    <span className="control-label">Unggah PDF Lain</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Search Page */}
            <div id="page-voice-search" className="page">
              <div className="voice-search-page">
                <button className="back-button" data-action="back">← Back to Library</button>

                <h2 className="page-title">Voice Search</h2>

                <div className="mic-container"
                  role="button"
                  tabIndex={0}
                  data-action="start-recording"
                  data-caption="Microphone button, not recording, double-click to start voice search">
                  <div className="mic-visualizer">
                    <div className="mic-icon">🎙️</div>
                    <div className="visualizer-bars">
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                    </div>
                  </div>
                  <p className="mic-instruction">Double-click to start voice search</p>
                </div>

                <div className="search-results" style={{ display: 'none' }}>
                  <h3 className="section-subtitle">Results</h3>
                  <div className="results-cards">
                    <div className="result-card" role="button" tabIndex={0} data-caption="Search result: 1984 by George Orwell, double-click to open">
                      <div className="book-cover book-cover-result">📖</div>
                      <div>
                        <h4 className="result-title">1984</h4>
                        <p className="result-author">George Orwell</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Detail Page */}
            <div id="page-book-detail" className="page">
              <div className="book-detail-page">
                <button className="back-button" data-action="back">← Back to Library</button>

                <div className="book-detail-header">
                  <div className="book-cover-detail book-cover-1">
                    <span className="book-emoji">🌿</span>
                  </div>
                  <div className="book-detail-info">
                    <h2 className="book-detail-title">The Great Gatsby</h2>
                    <p className="book-detail-author">by F. Scott Fitzgerald</p>
                    <p className="book-detail-meta">9 chapters · 4h 32m · Completed</p>

                    <div className="detail-actions">
                      <div className="control-item primary"
                        role="button"
                        tabIndex={0}
                        data-action="play-book"
                        data-caption="Play from beginning button, start listening to The Great Gatsby from chapter 1, double-click to play">
                        <span className="control-icon">▶️</span>
                        <span className="control-label">Play from Beginning</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="chapters-section">
                  <h3 className="section-subtitle">Chapters</h3>
                  <div className="chapter-items">
                    <div className="chapter-item" role="button" tabIndex={0} data-caption="Chapter 1, 28 minutes, completed, double-click to play">
                      <span className="chapter-number">1</span>
                      <span className="chapter-name">Chapter 1</span>
                      <span className="chapter-duration">28m</span>
                      <span className="chapter-status">✓</span>
                    </div>
                    <div className="chapter-item" role="button" tabIndex={0} data-caption="Chapter 2, 31 minutes, completed, double-click to play">
                      <span className="chapter-number">2</span>
                      <span className="chapter-name">Chapter 2</span>
                      <span className="chapter-duration">31m</span>
                      <span className="chapter-status">✓</span>
                    </div>
                    <div className="chapter-item" role="button" tabIndex={0} data-caption="Chapter 3, 26 minutes, completed, double-click to play">
                      <span className="chapter-number">3</span>
                      <span className="chapter-name">Chapter 3</span>
                      <span className="chapter-duration">26m</span>
                      <span className="chapter-status">✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Page */}
            <div id="page-settings" className="page">
              <div className="settings-page">
                <button className="back-button" data-action="back">← Back to Library</button>

                <h2 className="page-title">Settings</h2>

                <div className="settings-sections">
                  <div className="settings-group">
                    <h3 className="settings-group-title">Playback</h3>

                    <div className="setting-item"
                      role="button"
                      tabIndex={0}
                      data-setting="speed"
                      data-caption="Playback speed setting, currently 1.0 times normal speed, range from 0.5 to 3.0, double-click to adjust">
                      <div className="setting-label">
                        <span>Playback Speed</span>
                        <span className="setting-value">1.0×</span>
                      </div>
                      <div className="setting-control">
                        <div className="slider-track">
                          <div className="slider-fill" style={{ width: '20%' }}></div>
                          <div className="slider-thumb" style={{ left: '20%' }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="setting-item"
                      role="button"
                      tabIndex={0}
                      data-setting="voice"
                      data-caption="Voice selection setting, currently using Natural Female voice, double-click to change voice">
                      <div className="setting-label">
                        <span>Voice</span>
                        <span className="setting-value">Natural Female</span>
                      </div>
                      <div className="setting-options">
                        <span className="option-pill active">Natural Female</span>
                        <span className="option-pill">Natural Male</span>
                        <span className="option-pill">Clear</span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-group">
                    <h3 className="settings-group-title">Accessibility</h3>

                    <div className="setting-item"
                      role="button"
                      tabIndex={0}
                      data-setting="caption-size"
                      data-caption="Caption font size setting, currently medium size, double-click to adjust">
                      <div className="setting-label">
                        <span>Caption Font Size</span>
                        <span className="setting-value">Medium</span>
                      </div>
                      <div className="setting-options">
                        <span className="option-pill">Small</span>
                        <span className="option-pill active">Medium</span>
                        <span className="option-pill">Large</span>
                      </div>
                    </div>

                    <div className="setting-item"
                      role="button"
                      tabIndex={0}
                      data-setting="high-contrast"
                      data-caption="High contrast mode toggle, currently off, double-click to enable high contrast colors">
                      <div className="setting-label">
                        <span>High Contrast Mode</span>
                        <span className="setting-value">Off</span>
                      </div>
                      <div className="toggle-switch">
                        <div className="toggle-track">
                          <div className="toggle-thumb"></div>
                        </div>
                      </div>
                    </div>

                    <div className="setting-item"
                      role="button"
                      tabIndex={0}
                      data-setting="swipe-sensitivity"
                      data-caption="Swipe sensitivity setting, currently medium, controls how far you need to drag for swipe gestures, double-click to adjust">
                      <div className="setting-label">
                        <span>Swipe Sensitivity</span>
                        <span className="setting-value">Medium</span>
                      </div>
                      <div className="setting-options">
                        <span className="option-pill">Low</span>
                        <span className="option-pill active">Medium</span>
                        <span className="option-pill">High</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PDF Reader Page */}
            <div id="page-pdf-reader" className="page">
              <div className="reader-page">
                <button className="back-button" data-action="back">← Kembali ke Perpustakaan</button>

                {/* Layout Container */}
                <div className="reader-layout-container">
                  {/* Bagian Kiri: Info Buku */}
                  <div className="reader-left-panel">
                    <div className="reader-book-header">
                      <div className="book-cover-medium reader-cover"></div>
                      <div className="reader-book-meta">
                        <h2 className="reader-book-title" id="reader-book-title">Judul Buku</h2>
                        <p className="reader-book-author" id="reader-book-author">Penulis</p>
                        <div className="reader-progress-row">
                          <p className="reader-chunk-progress" id="reader-chunk-progress">Bagian 1 dari 1</p>
                          <div className="reader-progress-bar">
                            <div className="reader-progress-fill" id="reader-progress-fill" style={{ width: '0%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bagian Kanan: Teks & Kontrol Pemutar */}
                  <div className="reader-right-panel">
                    {/* Panel Teks */}
                    <div className="reader-text-panel">
                      {/* Progress bar loading audio TTS */}
                      <div id="reader-loading-bar-container" className="reader-loading-bar-container" style={{ opacity: 0 }}>
                        <div id="reader-loading-bar-fill" className="reader-loading-bar-fill" style={{ width: '0%' }}></div>
                      </div>

                      {/* Container untuk chunk teks */}
                      <div className="reader-chunks-container" id="reader-chunks-container">
                        {/* Teks buku akan ditampilkan di sini (dimuat melalui JS) */}
                      </div>
                    </div>

                    {/* Kontrol Pemutar */}
                    <div className="reader-controls">
                      <div className="reader-control-item"
                        role="button"
                        tabIndex={0}
                        data-action="reader-skip-5-bck"
                        data-caption="Mundur 5 bagian, lewati 5 bagian ke belakang, klik dua kali untuk mundur">
                        <span className="reader-control-icon">⏮⏮</span>
                        <span className="reader-control-label">−5</span>
                      </div>

                      <div className="reader-control-item"
                        role="button"
                        tabIndex={0}
                        data-action="reader-skip-1-bck"
                        data-caption="Mundur 1 bagian, lewati 1 bagian ke belakang, klik dua kali untuk mundur">
                        <span className="reader-control-icon">⏮</span>
                        <span className="reader-control-label">−1</span>
                      </div>

                      <div className="reader-control-item primary large"
                        role="button"
                        tabIndex={0}
                        id="reader-play-btn"
                        data-action="reader-play-pause"
                        data-caption="Tombol putar, sedang berhenti, klik dua kali untuk memulai pembacaan">
                        <span className="reader-control-icon" id="reader-play-icon">▶️</span>
                        <span className="reader-control-label" id="reader-play-label">Putar</span>
                      </div>

                      <div className="reader-control-item"
                        role="button"
                        tabIndex={0}
                        data-action="reader-skip-1-fwd"
                        data-caption="Maju 1 bagian, lewati 1 bagian ke depan, klik dua kali untuk maju">
                        <span className="reader-control-icon">⏭</span>
                        <span className="reader-control-label">+1</span>
                      </div>

                      <div className="reader-control-item"
                        role="button"
                        tabIndex={0}
                        data-action="reader-skip-5-fwd"
                        data-caption="Maju 5 bagian, lewati 5 bagian ke depan, klik dua kali untuk maju">
                        <span className="reader-control-icon">⏭⏭</span>
                        <span className="reader-control-label">+5</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio element untuk pemutaran di browser */}
                <audio id="pdf-audio-player" style={{ display: 'none' }}></audio>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Caption Bar (Fixed Bottom) */}
      <div id="caption-bar" className="caption-bar">
        <p className="caption-text">Hover over any element to hear its description</p>
      </div>
    </div>
  );
}
