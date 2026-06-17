// AudioBook - Gesture-driven accessibility app
// All interaction via mouse gestures for visually impaired users

let state = {
  currentPage: 'upload',
  focusedElement: null,
  focusableElements: [],
  currentFocusIndex: -1,

  // Gesture tracking
  isMouseDown: false,
  swipeStartX: 0,
  swipeStartY: 0,
  lastClickTime: 0,

  // Settings
  swipeThreshold: 60,
  doubleClickThreshold: 400,
  captionFontSize: 18,
  playbackSpeed: 1.0,

  // PDF Reader
  pdfReader: {
    chunks: [],
    currentIndex: 0,
    isPlaying: false,
    isLoading: false,
    title: '',
    author: '',
    selectedFile: null,
  },

  // Library
  allBooks: [],
  isRecordingSearch: false,
  searchMediaRecorder: null,
};

// Initialize the app
export function initAudioBook() {
  console.log('Initializing AudioBook...');

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

function init() {
  console.log('AudioBook DOM ready');

  // Prevent context menu and drag
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());

  // Set up custom cursor
  setupCustomCursor();

  // Set up gesture handlers
  setupGestureHandlers();

  // Set up keyboard fallback
  setupKeyboardFallback();

  // Set up focus system
  setupFocusSystem();

  // Set up navigation
  setupNavigation();

  // Siapkan pendengar input file PDF
  setupPdfFileInput();

  // Initialize focusable elements
  updateFocusableElements();

  // Muat daftar buku dari backend ke dalam library grid
  loadLibrary();

  // Siapkan pencarian di perpustakaan
  setupLibrarySearch();

  console.log('AudioBook initialized successfully');
}

// Custom Cursor System
function setupCustomCursor() {
  const cursor = document.getElementById('custom-cursor');

  document.addEventListener('mousemove', (e) => {
    if (cursor) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    }
  });
}

// Gesture Handlers
function setupGestureHandlers() {
  const app = document.getElementById('audiobook-root');
  if (!app) return;

  // Mouse down - start tracking for swipe
  app.addEventListener('mousedown', handleMouseDown);

  // Mouse move - track swipe
  app.addEventListener('mousemove', handleMouseMove);

  // Mouse up - end swipe or detect double-click
  app.addEventListener('mouseup', handleMouseUp);

  // Hover - focus elements
  app.addEventListener('mouseover', handleMouseOver, true);
}

function handleMouseDown(e) {
  state.isMouseDown = true;
  state.swipeStartX = e.clientX;
  state.swipeStartY = e.clientY;

  const cursor = document.getElementById('custom-cursor');
  if (cursor) {
    cursor.classList.remove('activating');
  }
}

function handleMouseMove(e) {
  if (!state.isMouseDown) return;

  const deltaX = e.clientX - state.swipeStartX;
  const deltaY = e.clientY - state.swipeStartY;
  const distance = Math.abs(deltaX);

  // Check if swipe threshold reached
  if (distance >= state.swipeThreshold) {
    const cursor = document.getElementById('custom-cursor');
    if (cursor && !cursor.classList.contains('swiping')) {
      cursor.classList.add('swiping');

      // Determine direction
      const direction = deltaX > 0 ? 'right' : 'left';
      handleSwipe(direction, e.clientY);

      // Reset to prevent multiple swipes
      state.isMouseDown = false;
      state.swipeStartX = e.clientX;

      setTimeout(() => {
        cursor.classList.remove('swiping');
      }, 300);
    }
  }
}

function handleMouseUp(e) {
  const cursor = document.getElementById('custom-cursor');
  if (cursor) {
    cursor.classList.remove('swiping');
  }

  if (!state.isMouseDown) return;
  state.isMouseDown = false;

  // Check for small movement (click)
  const deltaX = Math.abs(e.clientX - state.swipeStartX);
  const deltaY = Math.abs(e.clientY - state.swipeStartY);

  if (deltaX < 10 && deltaY < 10) {
    // It's a click - check for double-click
    const now = Date.now();
    const timeSinceLastClick = now - state.lastClickTime;

    if (timeSinceLastClick < state.doubleClickThreshold) {
      // Double-click detected
      handleDoubleClick(e);
      state.lastClickTime = 0; // Reset
    } else {
      state.lastClickTime = now;
    }
  }
}

function handleMouseOver(e) {
  // Find the focusable element
  let target = e.target;

  // Traverse up to find an element with data-caption or role="button"
  while (target && target !== document.body) {
    if (target.hasAttribute && (target.hasAttribute('data-caption') || target.getAttribute('role') === 'button')) {
      focusElement(target);
      break;
    }
    target = target.parentElement;
  }
}

// Swipe Handler
function handleSwipe(direction, yPosition) {
  console.log('Swipe detected:', direction);

  // Draw swipe trail
  drawSwipeTrail(yPosition, direction);

  // Navigate through focusable elements
  if (direction === 'left') {
    // Next item
    focusNextElement();
  } else if (direction === 'right') {
    // Previous item
    focusPreviousElement();
  }

  // Show toast
  showToast(direction === 'left' ? 'Next item' : 'Previous item');
}

function drawSwipeTrail(yPosition, direction) {
  const container = document.getElementById('swipe-trail-container');
  if (!container) return;

  const trail = document.createElement('div');
  trail.className = 'swipe-trail';
  trail.style.top = yPosition + 'px';
  trail.style.left = direction === 'left' ? '20%' : '80%';
  trail.style.width = '60%';
  trail.style.transform = direction === 'left' ? 'translateX(0)' : 'translateX(-100%)';

  container.appendChild(trail);

  setTimeout(() => {
    container.removeChild(trail);
  }, 800);
}

// Double-Click Handler
function handleDoubleClick(e) {
  console.log('Double-click detected');

  const cursor = document.getElementById('custom-cursor');
  if (cursor) {
    cursor.classList.add('activating');
    setTimeout(() => {
      cursor.classList.remove('activating');
    }, 300);
  }

  // Activate the focused element
  if (state.focusedElement) {
    activateElement(state.focusedElement);
  }
}

function activateElement(element) {
  console.log('Activating element:', element);

  // Get action from data attributes
  const action = element.getAttribute('data-action');
  const page = element.getAttribute('data-page');
  const bookId = element.getAttribute('data-book-id');
  const setting = element.getAttribute('data-setting');

  // Show activation toast
  const caption = element.getAttribute('data-caption') || 'Item activated';
  const actionText = caption.split(',')[0];
  showToast(`Activated: ${actionText}`);

  // Handle different actions
  if (page) {
    navigateToPage(page);
  } else if (action === 'back') {
    // Jeda audio jika pembaca sedang aktif
    if (state.pdfReader.isPlaying) {
      const audio = document.getElementById('pdf-audio-player');
      if (audio) { audio.pause(); }
      setReaderPlayState(false);
    }
    navigateToPage('library');
  } else if (action === 'upload') {
    navigateToPage('upload');
  } else if (action === 'select-file') {
    handleFileSelect();
  } else if (action === 'start-library-voice-search') {
    startLibraryVoiceSearch();
  } else if (action === 'pause') {
    handlePlayPause();
  } else if (action === 'play-book') {
    navigateToPage('now-playing');
  } else if (action === 'start-recording') {
    handleVoiceRecording();
  } else if (action === 'submit-upload') {
    submitPdfUpload();
  } else if (action === 'reset-upload') {
    resetUploadState();
  } else if (action === 'start-reading') {
    navigateToPage('pdf-reader');
    setTimeout(() => initReader(), 150);
  } else if (action === 'reader-play-pause') {
    handleReaderPlayPause();
  } else if (action === 'reader-skip-1-fwd') {
    skipChunks(1);
  } else if (action === 'reader-skip-5-fwd') {
    skipChunks(5);
  } else if (action === 'reader-skip-1-bck') {
    skipChunks(-1);
  } else if (action === 'reader-skip-5-bck') {
    skipChunks(-5);
  } else if (action === 'open-book') {
    openBook(bookId);
  } else if (action === 'go-to-library') {
    navigateToPage('library');
  } else if (bookId) {
    navigateToBookDetail(bookId);
  } else if (setting) {
    handleSettingChange(setting);
  }
}

// Focus System
function setupFocusSystem() {
  const focusRing = document.getElementById('focus-ring');

  // Update focus ring position on scroll and resize
  window.addEventListener('scroll', updateFocusRingPosition, true);
  window.addEventListener('resize', updateFocusRingPosition);
}

function updateFocusableElements() {
  // Get all focusable elements in the current page
  const currentPageEl = document.querySelector('.page.active');
  if (!currentPageEl) return;

  state.focusableElements = Array.from(
    currentPageEl.querySelectorAll('[data-caption], [role="button"]')
  );

  // Also include navigation items
  const navItems = Array.from(document.querySelectorAll('.nav-item'));
  state.focusableElements = [...navItems, ...state.focusableElements];

  console.log('Updated focusable elements:', state.focusableElements.length);
}

function focusElement(element) {
  if (state.focusedElement === element) return;

  state.focusedElement = element;
  state.currentFocusIndex = state.focusableElements.indexOf(element);

  // Update caption
  updateCaption(element);

  // Update focus ring
  updateFocusRingPosition();

  // Update tabindex
  state.focusableElements.forEach(el => el.setAttribute('tabindex', '-1'));
  element.setAttribute('tabindex', '0');
}

function focusNextElement() {
  if (state.focusableElements.length === 0) return;

  state.currentFocusIndex = (state.currentFocusIndex + 1) % state.focusableElements.length;
  const nextElement = state.focusableElements[state.currentFocusIndex];

  focusElement(nextElement);
  scrollToElement(nextElement);
}

function focusPreviousElement() {
  if (state.focusableElements.length === 0) return;

  state.currentFocusIndex = (state.currentFocusIndex - 1 + state.focusableElements.length) % state.focusableElements.length;
  const prevElement = state.focusableElements[state.currentFocusIndex];

  focusElement(prevElement);
  scrollToElement(prevElement);
}

function scrollToElement(element) {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center'
  });
}

function updateFocusRingPosition() {
  const focusRing = document.getElementById('focus-ring');
  if (!focusRing || !state.focusedElement) {
    if (focusRing) focusRing.classList.remove('visible');
    return;
  }

  const rect = state.focusedElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  focusRing.style.top = (rect.top + scrollTop - 8) + 'px';
  focusRing.style.left = (rect.left + scrollLeft - 8) + 'px';
  focusRing.style.width = (rect.width + 16) + 'px';
  focusRing.style.height = (rect.height + 16) + 'px';
  focusRing.classList.add('visible');
}

function updateCaption(element) {
  const captionBar = document.getElementById('caption-bar');
  const captionText = captionBar?.querySelector('.caption-text');

  if (!captionText) return;

  const caption = element.getAttribute('data-caption') ||
    element.getAttribute('aria-label') ||
    'Interactive element';

  captionText.textContent = caption;
  captionText.style.fontSize = state.captionFontSize + 'px';
}

// Navigation
function setupNavigation() {
  // Navigation is handled through data-page attributes
  // Already set up in activateElement
}

function navigateToPage(pageName) {
  console.log('Navigating to page:', pageName);

  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));

  // Show target page
  const targetPage = document.getElementById('page-' + pageName);
  if (targetPage) {
    targetPage.classList.add('active');
    state.currentPage = pageName;

    // Update focusable elements
    setTimeout(() => {
      updateFocusableElements();

      // Focus first element
      if (state.focusableElements.length > 0) {
        state.currentFocusIndex = 0;
        focusElement(state.focusableElements[0]);
      }
    }, 100);
  }
}

function navigateToBookDetail(bookId) {
  console.log('Opening book detail:', bookId);
  navigateToPage('book-detail');
}

// Toast Notifications
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 1800);
}

// Keyboard Fallback
function setupKeyboardFallback() {
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        focusPreviousElement();
        break;

      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        focusNextElement();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (state.focusedElement) {
          activateElement(state.focusedElement);
        }
        break;

      case 'Escape':
        e.preventDefault();
        navigateToPage('library');
        break;
    }
  });
}

// Action Handlers
function handlePlayPause() {
  const playButton = document.querySelector('[data-action="pause"]');
  if (!playButton) return;

  const isPaused = playButton.textContent.includes('Pause');

  if (isPaused) {
    playButton.querySelector('.control-icon').textContent = '▶️';
    playButton.querySelector('.control-label').textContent = 'Play';
    playButton.setAttribute('data-caption', 'Play button, currently paused, double-click to resume playback');
    showToast('Paused');
  } else {
    playButton.querySelector('.control-icon').textContent = '⏸';
    playButton.querySelector('.control-label').textContent = 'Pause';
    playButton.setAttribute('data-caption', 'Pause button, currently playing, double-click to pause playback');
    showToast('Playing');
  }

  updateCaption(playButton);
}

function handleFileSelect() {
  // Buka dialog pemilihan file
  const fileInput = document.getElementById('pdf-file-input');
  if (fileInput) fileInput.click();
}

function setupPdfFileInput() {
  const fileInput = document.getElementById('pdf-file-input');
  if (!fileInput) return;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    handleFileChange(file);
    // Reset agar file yang sama bisa dipilih ulang
    e.target.value = '';
  });
}

function handleFileChange(file) {
  const dropZoneTitle = document.getElementById('drop-zone-title');
  const dropZoneText = document.getElementById('drop-zone-text');
  const submitBtn = document.getElementById('submit-upload-btn');

  if (dropZoneTitle) dropZoneTitle.textContent = '\ud83d\udcc4 ' + file.name;
  if (dropZoneText) dropZoneText.textContent = (file.size / 1024).toFixed(1) + ' KB \u2014 siap diunggah';
  if (submitBtn) submitBtn.style.display = 'flex';

  state.pdfReader.selectedFile = file;
  showToast('File dipilih: ' + file.name);
  setTimeout(() => updateFocusableElements(), 100);
}

async function handleVoiceRecording() {
  const micContainer = document.querySelector('.mic-container');
  const instruction = document.querySelector('.mic-instruction');

  if (!micContainer) return;

  if (state.isRecordingSearch) {
    // Stop recording if already recording
    if (state.searchMediaRecorder && state.searchMediaRecorder.state === 'recording') {
      state.searchMediaRecorder.stop();
    }
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Browser tidak mendukung perekaman suara');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    state.searchMediaRecorder = mediaRecorder;
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      state.isRecordingSearch = false;
      micContainer.classList.remove('recording');
      if (instruction) instruction.textContent = 'Memproses suara...';

      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'search_audio.webm');

      try {
        const response = await fetch('/stt', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Gagal memproses suara');
        
        const data = await response.json();
        const recognizedText = data.text || '';
        
        if (recognizedText) {
          showToast(`Hasil: "${recognizedText}"`);
          if (instruction) instruction.textContent = 'Mengarahkan ke hasil...';
          
          // Arahkan ke library dan lakukan filter
          navigateToPage('library');
          const searchInput = document.getElementById('library-search-input');
          if (searchInput) {
            searchInput.value = recognizedText;
            handleLibrarySearch(recognizedText);
          }
        } else {
          showToast('Suara tidak dikenali');
          if (instruction) instruction.textContent = 'Double-click to start voice search';
        }
      } catch (err) {
        console.error('Voice search error:', err);
        showToast('Error memproses suara');
        if (instruction) instruction.textContent = 'Double-click to start voice search';
      } finally {
        stream.getTracks().forEach(track => track.stop());
        state.searchMediaRecorder = null;
      }
    };

    mediaRecorder.start();
    state.isRecordingSearch = true;
    micContainer.classList.add('recording');
    if (instruction) instruction.textContent = 'Mendengarkan... (klik dua kali untuk berhenti)';
    showToast('Voice recording started');

  } catch (err) {
    console.error('MediaRecorder error:', err);
    showToast('Akses mikrofon ditolak atau error');
  }
}

function handleSettingChange(settingName) {
  console.log('Changing setting:', settingName);

  const settingItem = document.querySelector(`[data-setting="${settingName}"]`);
  if (!settingItem) return;

  switch (settingName) {
    case 'speed': {
      // Cycle through speeds: 0.5, 1.0, 1.5, 2.0, 3.0
      const speeds = [0.5, 1.0, 1.5, 2.0, 3.0];
      const currentIndex = speeds.indexOf(state.playbackSpeed);
      const nextIndex = (currentIndex + 1) % speeds.length;
      state.playbackSpeed = speeds[nextIndex];

      const speedValue = settingItem.querySelector('.setting-value');
      if (speedValue) speedValue.textContent = state.playbackSpeed + '×';

      const sliderFill = settingItem.querySelector('.slider-fill');
      const sliderThumb = settingItem.querySelector('.slider-thumb');
      const percentage = (nextIndex / (speeds.length - 1)) * 100;
      if (sliderFill) sliderFill.style.width = percentage + '%';
      if (sliderThumb) sliderThumb.style.left = percentage + '%';

      showToast(`Playback speed: ${state.playbackSpeed}×`);
      break;
    }

    case 'high-contrast': {
      const toggle = settingItem.querySelector('.toggle-track');
      const isActive = toggle?.classList.contains('active');

      if (toggle) {
        if (isActive) {
          toggle.classList.remove('active');
          showToast('High contrast mode off');
        } else {
          toggle.classList.add('active');
          showToast('High contrast mode on');
        }
      }
      break;
    }

    case 'caption-size': {
      const sizes = [16, 18, 22];
      const sizeLabels = ['Small', 'Medium', 'Large'];
      const currentSizeIndex = sizes.indexOf(state.captionFontSize);
      const nextSizeIndex = (currentSizeIndex + 1) % sizes.length;
      state.captionFontSize = sizes[nextSizeIndex];

      const sizeValue = settingItem.querySelector('.setting-value');
      if (sizeValue) sizeValue.textContent = sizeLabels[nextSizeIndex];

      // Update all option pills
      const sizePills = settingItem.querySelectorAll('.option-pill');
      sizePills.forEach((pill, index) => {
        pill.classList.toggle('active', index === nextSizeIndex);
      });

      // Update caption bar font size
      const captionText = document.querySelector('.caption-text');
      if (captionText) captionText.style.fontSize = state.captionFontSize + 'px';

      showToast(`Caption size: ${sizeLabels[nextSizeIndex]}`);
      break;
    }

    case 'voice': {
      const voices = ['Natural Female', 'Natural Male', 'Clear'];
      const voiceValue = settingItem.querySelector('.setting-value');
      const currentVoice = voiceValue?.textContent || 'Natural Female';
      const voiceIndex = voices.indexOf(currentVoice);
      const nextVoiceIndex = (voiceIndex + 1) % voices.length;

      if (voiceValue) voiceValue.textContent = voices[nextVoiceIndex];

      // Update option pills
      const voicePills = settingItem.querySelectorAll('.option-pill');
      voicePills.forEach((pill, index) => {
        pill.classList.toggle('active', index === nextVoiceIndex);
      });

      showToast(`Voice: ${voices[nextVoiceIndex]}`);
      break;
    }

    case 'swipe-sensitivity': {
      const sensitivities = { 'Low': 90, 'Medium': 60, 'High': 40 };
      const sensitivityLabels = ['Low', 'Medium', 'High'];
      const sensValue = settingItem.querySelector('.setting-value');
      const currentSens = sensValue?.textContent || 'Medium';
      const sensIndex = sensitivityLabels.indexOf(currentSens);
      const nextSensIndex = (sensIndex + 1) % sensitivityLabels.length;

      const nextSens = sensitivityLabels[nextSensIndex];
      state.swipeThreshold = sensitivities[nextSens];

      if (sensValue) sensValue.textContent = nextSens;

      // Update option pills
      const sensPills = settingItem.querySelectorAll('.option-pill');
      sensPills.forEach((pill, index) => {
        pill.classList.toggle('active', index === nextSensIndex);
      });

      showToast(`Swipe sensitivity: ${nextSens}`);
      break;
    }
  }
}

// ============================================================
// PDF Upload & Reader
// ============================================================

async function submitPdfUpload() {
  const file = state.pdfReader.selectedFile;
  if (!file) { showToast('Pilih file PDF terlebih dahulu'); return; }

  const titleVal = document.getElementById('pdf-title-input');
  const authorVal = document.getElementById('pdf-author-input');
  const title = (titleVal ? titleVal.value.trim() : '') || 'Tanpa Judul';
  const author = (authorVal ? authorVal.value.trim() : '') || 'Tanpa Penulis';

  const dropZone = document.querySelector('.drop-zone');
  const submitBtn = document.getElementById('submit-upload-btn');
  const uploadForm = document.getElementById('upload-form');
  const processing = document.querySelector('.processing-animation');

  if (dropZone) dropZone.style.display = 'none';
  if (submitBtn) submitBtn.style.display = 'none';
  if (uploadForm) uploadForm.style.display = 'none';
  if (processing) processing.style.display = 'block';
  showToast('Memproses PDF...');

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('author', author);

    const response = await fetch('/pdf/upload', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal mengunggah PDF');

    if (processing) processing.style.display = 'none';
    const success = document.querySelector('.upload-success');
    if (success) success.style.display = 'block';

    state.pdfReader.chunks = data.chunks;
    state.pdfReader.currentIndex = 0;
    state.pdfReader.title = data.title;
    state.pdfReader.author = data.author;

    showToast('Buku dimuat! ' + data.total + ' bagian tersedia');
    setTimeout(() => updateFocusableElements(), 100);

    // Refresh library grid supaya buku baru langsung muncul
    loadLibrary();

  } catch (err) {
    console.error('Upload error:', err);
    if (processing) processing.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';
    if (submitBtn) submitBtn.style.display = 'flex';
    if (uploadForm) uploadForm.style.display = 'block';
    showToast('Error: ' + err.message);
  }
}

function resetUploadState() {
  console.log('Resetting upload state...');

  // Reset file/metadata state
  state.pdfReader.selectedFile = null;
  state.pdfReader.chunks = [];
  state.pdfReader.currentIndex = 0;
  state.pdfReader.title = '';
  state.pdfReader.author = '';
  state.pdfReader.isPlaying = false;
  state.pdfReader.isLoading = false;

  // Stop audio player if it exists
  const audio = document.getElementById('pdf-audio-player');
  if (audio) {
    audio.pause();
    audio.src = '';
  }

  // Clear inputs
  const titleInput = document.getElementById('pdf-title-input');
  const authorInput = document.getElementById('pdf-author-input');
  if (titleInput) titleInput.value = '';
  if (authorInput) authorInput.value = '';

  // Clear file input
  const fileInput = document.getElementById('pdf-file-input');
  if (fileInput) fileInput.value = '';

  // Reset Drop Zone text
  const dropZoneTitle = document.getElementById('drop-zone-title');
  const dropZoneText = document.getElementById('drop-zone-text');
  if (dropZoneTitle) dropZoneTitle.textContent = 'Letakkan PDF di Sini';
  if (dropZoneText) dropZoneText.textContent = 'atau klik dua kali untuk memilih file';

  // Toggle visibility of panels back to start state
  const dropZone = document.querySelector('.drop-zone');
  const uploadForm = document.getElementById('upload-form');
  const submitBtn = document.getElementById('submit-upload-btn');
  const processing = document.querySelector('.processing-animation');
  const success = document.querySelector('.upload-success');

  if (dropZone) dropZone.style.display = 'block';
  if (uploadForm) uploadForm.style.display = 'block';
  if (submitBtn) submitBtn.style.display = 'none';
  if (processing) processing.style.display = 'none';
  if (success) success.style.display = 'none';

  showToast('Siap mengunggah PDF baru');
  setTimeout(() => updateFocusableElements(), 100);
}

function initReader() {
  const { chunks, title, author } = state.pdfReader;
  if (!chunks || chunks.length === 0) {
    showToast('Tidak ada teks yang dapat dibaca');
    return;
  }
  const titleEl = document.getElementById('reader-book-title');
  const authorEl = document.getElementById('reader-book-author');
  if (titleEl) titleEl.textContent = title;
  if (authorEl) authorEl.textContent = author;
  updateReaderUI();
  showToast('Membaca: ' + title);
}

function updateReaderUI() {
  const { chunks, currentIndex } = state.pdfReader;
  const total = chunks.length;
  const container = document.getElementById('reader-chunks-container');
  const progEl = document.getElementById('reader-chunk-progress');
  const fillEl = document.getElementById('reader-progress-fill');

  if (container) {
    container.innerHTML = '';

    chunks.forEach((chunk, index) => {
      const div = document.createElement('div');
      let className = 'reader-chunk';

      if (index === currentIndex) {
        className += ' current';
      } else if (index === currentIndex - 1) {
        className += ' previous';
      } else if (index === currentIndex + 1) {
        className += ' next';
      } else if (index < currentIndex - 1) {
        className += ' past';
      } else {
        className += ' future';
      }

      div.className = className;
      div.id = 'chunk-' + index;

      const p = document.createElement('p');
      p.className = 'reader-chunk-text';
      p.textContent = chunk;

      div.appendChild(p);
      container.appendChild(div);
    });

    // Gulir secara halus ke chunk saat ini setelah render
    const currentEl = document.getElementById('chunk-' + currentIndex);
    if (currentEl) {
      setTimeout(() => {
        container.scrollTo({
          top: currentEl.offsetTop - container.offsetTop - 32, // sedikit offset agar tidak mepet atas
          behavior: 'smooth'
        });
      }, 50);
    }
  }

  if (progEl) progEl.textContent = 'Bagian ' + (currentIndex + 1) + ' dari ' + total;
  if (fillEl) fillEl.style.width = ((currentIndex + 1) / total * 100) + '%';
}

async function playCurrentChunk() {
  if (state.pdfReader.isLoading) return;
  const { chunks, currentIndex } = state.pdfReader;
  const text = chunks[currentIndex];
  if (!text) return;

  const loadingContainer = document.getElementById('reader-loading-bar-container');
  const loadingFill = document.getElementById('reader-loading-bar-fill');
  let loadingInterval;

  try {
    state.pdfReader.isLoading = true;
    if (loadingContainer && loadingFill) {
      loadingContainer.style.opacity = '1';
      loadingFill.style.width = '0%';
      let progress = 0;
      loadingInterval = setInterval(() => {
        progress += (90 - progress) * 0.1; // melambat saat mendekati 90%
        loadingFill.style.width = progress + '%';
      }, 200);
    }

    const response = await fetch('/pdf/speak-chunk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    state.pdfReader.isLoading = false;
    if (loadingInterval) clearInterval(loadingInterval);
    if (loadingFill) loadingFill.style.width = '100%';
    setTimeout(() => {
      if (loadingContainer) loadingContainer.style.opacity = '0';
    }, 300);

    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.error || 'Gagal menghasilkan audio');
    }

    setReaderPlayState(true);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = document.getElementById('pdf-audio-player');
    if (!audio) return;

    // Bersihkan blob URL lama
    if (audio.src && audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
    audio.src = url;

    audio.onended = () => {
      if (state.pdfReader.isPlaying) {
        const next = state.pdfReader.currentIndex + 1;
        if (next < state.pdfReader.chunks.length) {
          state.pdfReader.currentIndex = next;
          updateReaderUI();
          playCurrentChunk();
        } else {
          setReaderPlayState(false);
          showToast('Selesai membaca buku!');
        }
      }
    };
    audio.onerror = () => {
      setReaderPlayState(false);
      showToast('Error memutar audio');
    };

    await audio.play();

  } catch (err) {
    console.error('Speak chunk error:', err);
    state.pdfReader.isLoading = false;
    if (loadingInterval) clearInterval(loadingInterval);
    if (loadingContainer) loadingContainer.style.opacity = '0';
    setReaderPlayState(false);
    showToast('Error: ' + err.message);
  }
}

function setReaderPlayState(playing) {
  state.pdfReader.isPlaying = playing;
  const icon = document.getElementById('reader-play-icon');
  const label = document.getElementById('reader-play-label');
  const btn = document.getElementById('reader-play-btn');
  if (icon) icon.textContent = playing ? '\u23f8' : '\u25b6\ufe0f';
  if (label) label.textContent = playing ? 'Jeda' : 'Putar';
  if (btn) {
    btn.setAttribute('data-caption',
      playing
        ? 'Tombol jeda, sedang memutar, klik dua kali untuk menjeda pembacaan'
        : 'Tombol putar, sedang berhenti, klik dua kali untuk memulai pembacaan'
    );
    if (state.focusedElement === btn) updateCaption(btn);
  }
}

function handleReaderPlayPause() {
  if (state.pdfReader.isLoading) return;
  const audio = document.getElementById('pdf-audio-player');
  if (!audio) return;
  if (state.pdfReader.isPlaying) {
    audio.pause();
    setReaderPlayState(false);
    showToast('Dijeda');
  } else {
    if (audio.src && audio.paused && audio.currentTime > 0) {
      audio.play();
      setReaderPlayState(true);
      showToast('Dilanjutkan');
    } else {
      playCurrentChunk();
      showToast('Memulai pembacaan...');
    }
  }
}

function skipChunks(n) {
  if (state.pdfReader.isLoading) return;
  const audio = document.getElementById('pdf-audio-player');
  const { chunks } = state.pdfReader;
  const wasPlaying = state.pdfReader.isPlaying;

  if (audio) {
    audio.pause();
    if (audio.src && audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
    audio.src = '';
  }
  setReaderPlayState(false);

  const newIndex = Math.max(0, Math.min(chunks.length - 1, state.pdfReader.currentIndex + n));
  state.pdfReader.currentIndex = newIndex;
  updateReaderUI();

  const dir = n > 0 ? 'Maju' : 'Mundur';
  showToast(dir + ' \u2192 Bagian ' + (newIndex + 1) + ' dari ' + chunks.length);

  if (wasPlaying) playCurrentChunk();
}

// ============================================================
// Library — Memuat & Menampilkan Daftar Buku Tersimpan
// ============================================================

// Muat semua buku dari backend
async function loadLibrary() {
  try {
    const response = await fetch('/pdf/library');
    if (!response.ok) throw new Error('Gagal memuat perpustakaan');
    const books = await response.json();
    // Simpan ke state supaya pencarian dapat mengakses seluruh koleksi
    state.allBooks = Array.isArray(books) ? books : [];
    renderLibraryGrid(state.allBooks);
  } catch (err) {
    console.error('Library load error:', err);
    state.allBooks = [];
    renderLibraryGrid([]); // tetap render upload card walau gagal/empty
  }
}

// Render kartu buku ke dalam #library-grid
function renderLibraryGrid(books) {
  const grid = document.getElementById('library-grid');
  if (!grid) return;

  // Bersihkan grid (menghapus semua mock data + kartu lama)
  grid.innerHTML = '';

  const COLORS = [
    'linear-gradient(135deg, #34d399, #10b981)',
    'linear-gradient(135deg, #fbbf24, #f59e0b)',
    'linear-gradient(135deg, #f97316, #dc2626)',
    'linear-gradient(135deg, #a78bfa, #7c3aed)',
    'linear-gradient(135deg, #60a5fa, #2563eb)',
    'linear-gradient(135deg, #f472b6, #db2777)',
  ];
  const EMOJIS = ['📖', '📗', '📕', '📘', '📙', '📚'];

  if (books.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:#666;font-size:16px;grid-column:1/-1;padding:24px 0;';
    empty.textContent = 'Belum ada buku. Unggah PDF pertama Anda!';
    grid.appendChild(empty);
  }

  books.forEach((book, index) => {
    const ci = index % COLORS.length;
    const card = document.createElement('div');
    card.className = 'book-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabIndex', '0');
    card.setAttribute('data-book-id', book.id);
    card.setAttribute('data-action', 'open-book');
    card.setAttribute('data-caption',
      `${book.title} oleh ${book.author}, double-click untuk membuka buku`);

    card.innerHTML = `
      <div class="book-cover" style="background:${COLORS[ci]}">
        <span class="book-emoji">${EMOJIS[ci]}</span>
      </div>
      <h3 class="book-card-title">${book.title}</h3>
      <p class="book-card-author">${book.author}</p>
    `;
    grid.appendChild(card);
  });

  // Selalu tambahkan kartu "Add New Book" di akhir
  const uploadCard = document.createElement('div');
  uploadCard.className = 'upload-zone-card';
  uploadCard.setAttribute('role', 'button');
  uploadCard.setAttribute('tabIndex', '0');
  uploadCard.setAttribute('data-action', 'upload');
  uploadCard.setAttribute('data-caption',
    'Tambah buku baru ke perpustakaan, double-click untuk mengunggah PDF');
  uploadCard.innerHTML = `
    <div class="upload-icon">➕</div>
    <p class="upload-label">Add New Book</p>
  `;
  grid.appendChild(uploadCard);

  // Scan ulang elemen yang bisa difokus supaya keyboard/swipe nav berfungsi
  setTimeout(() => updateFocusableElements(), 100);
}

// Buka buku tersimpan dari library berdasarkan ID
// ============================================================
// Library Search
// ============================================================
function setupLibrarySearch() {
  const searchInput = document.getElementById('library-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleLibrarySearch(e.target.value);
    });
  }
}

function handleLibrarySearch(query) {
  if (!query) {
    renderLibraryGrid(state.allBooks);
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  const filtered = state.allBooks.filter(book => 
    (book.title && book.title.toLowerCase().includes(lowerQuery)) ||
    (book.author && book.author.toLowerCase().includes(lowerQuery))
  );
  
  renderLibraryGrid(filtered);
}

async function startLibraryVoiceSearch() {
  const btn = document.querySelector('.voice-search-btn');
  const statusEl = document.getElementById('voice-search-status');
  const searchInput = document.getElementById('library-search-input');
  
  if (state.isRecordingSearch) {
    if (state.searchMediaRecorder && state.searchMediaRecorder.state === 'recording') {
      state.searchMediaRecorder.stop();
    }
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Browser tidak mendukung perekaman suara');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    state.searchMediaRecorder = mediaRecorder;
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      state.isRecordingSearch = false;
      if (btn) btn.classList.remove('recording');
      if (statusEl) {
        statusEl.textContent = 'Memproses suara...';
      }

      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'search_audio.webm');

      try {
        const response = await fetch('/stt', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Gagal memproses suara');
        }
        
        const data = await response.json();
        const recognizedText = data.text || '';
        
        if (recognizedText) {
          if (searchInput) {
            searchInput.value = recognizedText;
            handleLibrarySearch(recognizedText);
          }
          showToast(`Dicari: "${recognizedText}"`);
        } else {
          showToast('Suara tidak dikenali');
        }
      } catch (err) {
        console.error('Voice search error:', err);
        showToast('Error memproses suara');
      } finally {
        if (statusEl) statusEl.style.display = 'none';
        stream.getTracks().forEach(track => track.stop());
        state.searchMediaRecorder = null;
      }
    };

    mediaRecorder.start();
    state.isRecordingSearch = true;
    
    if (btn) btn.classList.add('recording');
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Mendengarkan... (klik dua kali mic untuk berhenti)';
    }
    showToast('Mulai merekam...');

  } catch (err) {
    console.error('MediaRecorder error:', err);
    showToast('Akses mikrofon ditolak atau error');
  }
}

// Buka buku tersimpan dari library berdasarkan ID
async function openBook(bookId) {
  if (!bookId) return;
  showToast('Memuat buku...');
  try {
    const response = await fetch(`/pdf/open/${bookId}`, { method: 'POST' });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Gagal membuka buku');
    }
    const data = await response.json();

    // Hentikan audio yang sedang berjalan (jika ada)
    const audio = document.getElementById('pdf-audio-player');
    if (audio) { audio.pause(); audio.src = ''; }
    setReaderPlayState(false);

    // Muat ke dalam state reader
    state.pdfReader.chunks = data.chunks;
    state.pdfReader.currentIndex = 0;
    state.pdfReader.title = data.title;
    state.pdfReader.author = data.author;
    state.pdfReader.isPlaying = false;
    state.pdfReader.isLoading = false;

    navigateToPage('pdf-reader');
    setTimeout(() => initReader(), 100);

  } catch (err) {
    console.error('Open book error:', err);
    showToast('Error: ' + err.message);
  }
}

// Export for external use if needed
if (typeof window !== 'undefined') {
  window.AudioBookApp = {
    init: initAudioBook,
    navigateToPage,
    showToast,
  };
}