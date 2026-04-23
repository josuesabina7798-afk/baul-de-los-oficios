import './style.css'
import { getAllVideos, saveVideo, initDB, deleteVideo, getAllMessages, saveMessage, deleteMessage, getSetting, setSetting, saveDirectMessage, getDirectMessages, saveComment, getCommentsByVideo, deleteDirectMessage, deleteComment } from './db.js'

// --- State Management ---
let state = {
  currentRole: null, // 'maestro' | 'aprendiz'
  currentScreen: 'home',
  videos: [],
  directMessages: [], // Mensajes privados
  currentComments: [], // Comentarios del video actual
  accSettings: {
    highContrast: false,
    inverted: false,
    brightness: 100,
    fontSize: 18,
    hoverSpeak: false,
    showPanel: false,
    isLeftHanded: false // Nueva opción de ergonomía
  },
  selectedVideo: null,
  searchQuery: '',
  paymentMethod: 'Agradecimientos Públicos'
};

// --- Utilities ---
const $ = (id) => document.getElementById(id);

const render = (template) => {
  $('main-content').innerHTML = template;
  updateNav();
  attachEventListeners();
};

const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

const readScreen = () => {
  const content = $('main-content').innerText;
  speak(content);
};

const refreshVideos = async () => {
  state.videos = await getAllVideos();
};

const refreshMessages = async () => {
  state.messages = await getAllMessages();
  state.directMessages = await getDirectMessages();
};

const refreshComments = async (videoId) => {
  state.currentComments = await getCommentsByVideo(videoId);
};

const validateSafety = (text) => {
  const lowercase = text.toLowerCase();
  
  // 1. Bloqueo de Enlaces (URLs)
  const urlRegex = /(https?:\/\/|www\.)|(\.[a-z]{2,3}(\/|\?|$))/i;
  if (urlRegex.test(lowercase) || lowercase.includes('.com') || lowercase.includes('.net') || lowercase.includes('.org') || lowercase.includes('.mx')) {
    return { valid: false, reason: 'Por seguridad, no se permite enviar enlaces o links externos.' };
  }

  // 2. Bloqueo de Lenguaje Ofensivo
  const insults = ['puto', 'puta', 'mierda', 'imbecil', 'idiota', 'estupido', 'pendejo', 'cabron', 'zorra', 'maldito', 'basura'];
  for (const insult of insults) {
    if (lowercase.includes(insult)) {
      return { valid: false, reason: 'El mensaje contiene lenguaje inapropiado. Por favor, sé respetuoso.' };
    }
  }

  return { valid: true };
};

// --- Accessibility Helpers ---

const applyAccessibility = () => {
  const body = document.body;
  
  // Font Size
  document.documentElement.style.setProperty('--font-size-base', `${state.accSettings.fontSize}px`);
  
  // High Contrast
  if (state.accSettings.highContrast) body.classList.add('high-contrast');
  else body.classList.remove('high-contrast');
  
  // Invert
  if (state.accSettings.inverted) body.classList.add('inverted');
  else body.classList.remove('inverted');
  
  // Brightness
  body.style.filter = `brightness(${state.accSettings.brightness}%)`;
  if (state.accSettings.inverted) body.style.filter += ` invert(100%) hue-rotate(180deg)`;
  
  // Handedness (Zurdo/Diestro)
  if (state.accSettings.isLeftHanded) body.classList.add('handed-left');
  else body.classList.remove('handed-left');
};

// Hover Speak Monitor
document.addEventListener('mouseover', (e) => {
  if (!state.accSettings.hoverSpeak) return;
  const target = e.target;
  const text = target.innerText || target.placeholder || target.alt;
  if (text && (target.tagName === 'BUTTON' || target.tagName === 'P' || target.tagName === 'H1' || target.tagName === 'H2' || target.tagName === 'SPAN')) {
    speak(text);
  }
});

// --- Templates ---

const OnboardingTemplate = `
  <div class="screen role-selector">
    <h1 class="text-center">¡Bienvenido!</h1>
    <p class="text-center">¿Cómo quieres usar la aplicación hoy?</p>
    
    <div class="role-card" id="select-maestro">
      <span class="icon-big">👴</span>
      <div>
        <h2>Soy Maestro</h2>
        <p>Quiero enseñar mi oficio</p>
      </div>
    </div>

    <div class="role-card" id="select-aprendiz">
      <span class="icon-big">🧒</span>
      <div>
        <h2>Soy Aprendiz</h2>
        <p>Quiero aprender un oficio</p>
      </div>
    </div>
  </div>
`;

const HomeTemplate = () => {
  if (state.currentRole === 'maestro') {
    const myVideos = state.videos.filter(v => v.teacher === 'Mi Cuenta');
    return `
      <div class="screen">
        <h1>Mi Panel de Maestro</h1>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">${myVideos.length}</span>
            <span class="stat-label">Videos subidos</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${myVideos.reduce((acc, v) => acc + (v.thanks || 0), 0)}</span>
            <span class="stat-label">Agradecimientos</span>
          </div>
        </div>
        <button class="btn-primary mt-large" id="go-upload">➕ SUBIR NUEVO VIDEO</button>
        <h2 class="mt-large">Mis videos publicados</h2>
        ${myVideos.length === 0 ? '<p>No has subido videos aún.</p>' : myVideos.map(v => `
          <div class="card">
            <div class="card-content">
              <span class="card-title">${v.title}</span>
              <div class="card-meta">
                <span>👁️ ${v.views || 0} vistas</span>
                <span>🙏 ${v.thanks || 0} gracias</span>
              </div>
              <div style="display: flex; gap: 10px;">
                <button class="btn-primary mt-small view-video-btn" style="flex: 1; font-size: 16px; padding: 10px;" data-id="${v.id}">👁️ VER</button>
                <button class="btn-primary mt-small btn-delete" style="flex: 1; background: #e74c3c; font-size: 16px; padding: 10px;" data-id="${v.id}">🗑️ BORRAR</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    // Filtrado para aprendiz
    const query = state.searchQuery.toLowerCase();
    const filtered = state.videos.filter(v => 
      v.title.toLowerCase().includes(query) || 
      v.category.toLowerCase().includes(query) ||
      v.teacher.toLowerCase().includes(query)
    );

    return `
      <div class="screen">
        <h1>Recomendados para ti</h1>
        ${filtered.length === 0 ? `<p>No se encontraron videos para "${state.searchQuery}".</p>` : filtered.map(v => `
          <div class="card video-card" data-id="${v.id}">
            <div class="video-thumb">${v.categoryIcon || '🎥'}</div>
            <div class="card-content">
              <span class="card-title">${v.title}</span>
              <div class="card-meta">
                <span>Por ${v.teacher}</span>
                <span>${v.category}</span>
              </div>
              <button class="btn-primary view-video-btn" data-id="${v.id}">VER VIDEO</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};

const CatalogTemplate = () => {
  if (state.currentRole === 'aprendiz') {
    return `
      <div class="screen">
        <div class="search-container">
          <input type="text" class="search-input" placeholder="Buscar oficio..." id="search-input" value="${state.searchQuery}">
          <button class="mic-btn" id="voice-search">🎙️</button>
        </div>
        <h1>Categorías</h1>
        <div class="stats-grid">
          <button class="role-card btn-category" data-category="Zapatería"><span>👞</span><br>Zapatería</button>
          <button class="role-card btn-category" data-category="Textil"><span>🧵</span><br>Textil</button>
          <button class="role-card btn-category" data-category="Comida"><span>🧀</span><br>Comida</button>
          <button class="role-card btn-category" data-category="Reparación"><span>🔧</span><br>Reparación</button>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="screen">
        <h1>Todos mis videos</h1>
        <div class="stats-grid">
          ${state.videos.filter(v => v.teacher === 'Mi Cuenta').map(v => `
            <div class="card">
              <div class="video-thumb">${v.categoryIcon || '🎥'}</div>
              <div class="card-content">
                <span class="card-title">${v.title}</span>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                  <button class="btn-primary view-video-btn" style="flex: 1; font-size: 16px; padding: 10px;" data-id="${v.id}">👁️ VER</button>
                  <button class="btn-primary btn-delete" style="flex: 1; background: #e74c3c; font-size: 16px; padding: 10px;" data-id="${v.id}">🗑️ BORRAR</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};

const UploadLearnTemplate = () => {
  // Si hay un video seleccionado, mostramos el reproductor sin importar el rol
  if (state.selectedVideo) {
    const v = state.selectedVideo;
    const videoUrl = URL.createObjectURL(v.fileBlob);

    return `
      <div class="screen">
        <button class="btn-secondary" id="go-back-to-list">⬅️ VOLVER</button>
        <div class="card">
          <video id="main-video" src="${videoUrl}" controls autoPlay style="width: 100%; border-radius: var(--border-radius) var(--border-radius) 0 0;"></video>
          <div class="card-content">
            <h1>${v.title}</h1>
            <p>Por ${v.teacher} - Maestro en ${v.category}</p>
            
            <div style="margin: 15px 0; padding: 15px; background: #fff5f0; border: 2px solid var(--primary-color); border-radius: var(--border-radius);">
              <h3 style="color: var(--primary-color); font-size: 18px; margin-bottom: 5px;">💳 Método de Intercambio (Pago)</h3>
              <p style="font-weight: bold; font-size: 20px;">
                Este maestro pide a cambio: <br>
                <span style="color: var(--secondary-color); font-size: 22px;">✨ ${v.paymentMethod || 'Agradecimientos Públicos'}</span>
              </p>
            </div>

            ${v.transcription ? `
              <button class="btn-secondary" style="background: #333; margin-top: 10px;" id="toggle-transcription">📖 VER TRANSCRIPCIÓN (PARA SORDERA)</button>
              <div id="transcription-box" class="hidden">${v.transcription}</div>
            ` : ''}
            <hr>
            ${state.currentRole === 'aprendiz' ? `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn-primary" style="background: #C1663B; font-size: 24px;" id="btn-thanks">🙏 DAR GRACIAS</button>
                <button class="btn-secondary" style="font-size: 18px;" id="btn-contact-maestro">✉️ CONTACTAR AL MAESTRO</button>
              </div>
            ` : '<p class="text-center"><strong>Modo Vista Previa</strong></p>'}
          </div>
        </div>

        <div class="mt-large">
          <h2>💬 Comentarios de la Comunidad</h2>
          <div id="comments-section" style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
            ${state.currentComments.length === 0 ? '<p>No hay comentarios aún. ¡Sé el primero!</p>' : state.currentComments.map(c => `
              <div class="card" style="padding: 15px; background: #fefefe; border-left: 4px solid var(--secondary-color); position: relative;">
                <strong>${c.from}:</strong>
                <p>${c.text}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                  <small>${c.date}</small>
                  <button class="btn-icon-large btn-delete-comment" style="width: 32px; height: 32px; font-size: 14px; color: #e74c3c; box-shadow: none;" data-id="${c.id}">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="card mt-large" style="padding: 20px; border: 1px solid #ccc;">
            <h3>Escribir comentario</h3>
            <textarea id="new-comment-text" class="search-input" style="width: 100%; height: 80px; border: 1px solid #ccc; border-radius: 8px; margin: 10px 0;" placeholder="Comparte qué te pareció el video..."></textarea>
            <button class="btn-secondary" id="btn-send-comment" style="padding: 10px;">COMENTAR</button>
          </div>
        </div>
      </div>
    `;
  }

  // Si no hay video seleccionado y es Maestro, muestra el formulario de subida
  if (state.currentRole === 'maestro') {
    return `
      <div class="screen">
        <h1>Subir Video Real</h1>
        <div class="card" style="padding: 40px; text-align: center; border: 4px dashed #C1663B; background: #fff;">
          <input type="file" id="video-file" accept="video/*" style="display: none;">
          <label for="video-file" style="cursor: pointer; display: block;">
            <span id="file-status" style="font-size: 64px;">🎥</span>
            <p id="file-name">Toca para elegir un video de tu galería</p>
          </label>
        </div>
        <div class="card-content">
          <label>Título del video:</label>
          <input type="text" id="video-title" class="search-input" style="border: 2px solid #ccc; border-radius: 8px; margin-bottom: 20px;" placeholder="Ej: Cómo usar el serrucho">
          <label>¿Qué oficio enseñas?</label>
          <select id="video-category" class="search-input" style="border: 2px solid #ccc; border-radius: 8px;">
            <option value="Carpintería" data-icon="🪚">Carpintería</option>
            <option value="Costura" data-icon="🧵">Costura</option>
            <option value="Zapatería" data-icon="👞">Zapatería</option>
            <option value="Comida" data-icon="🧀">Comida</option>
            <option value="Reparación" data-icon="🔧">Reparación</option>
          </select>
          
          <div style="margin-top: 20px; padding: 15px; background: #eee; border-radius: 8px;">
            <h3>📖 Transcripción (Para Sordera)</h3>
            <textarea id="video-transcription" class="search-input" style="width: 100%; height: 100px; border: 1px solid #ccc; margin-top: 10px;" placeholder="Escribe o dicta lo que dices en el video..."></textarea>
            <button class="btn-secondary" style="margin-top: 10px; background: #34495e;" id="btn-dictate-trans">🎙️ DICTAR TRANSCRIPCIÓN</button>
          </div>

          <button class="btn-primary mt-large" id="btn-publish-real">✅ PUBLICAR VIDEO</button>
          <p id="upload-msg" style="color: var(--primary-color); font-weight: bold; margin-top: 10px;"></p>
        </div>
      </div>
    `;
  }

  return '<div class="screen">Elige un video para aprender</div>';
};

const MessagesTemplate = () => {
  const isA = state.currentRole === 'aprendiz';
  return `
    <div class="screen">
      <h1>${isA ? 'Chat con los Maestros' : 'Chat con los Alumnos'}</h1>
      
      <div id="messages-list" style="display: flex; flex-direction: column; gap: 15px; background: #fff; padding: 20px; border-radius: 16px; box-shadow: var(--shadow); max-height: 400px; overflow-y: auto;">
        <p style="background: #fff3cd; padding: 10px; border-radius: 8px; font-size: 14px;">🛡️ Chat Protegido contra enlaces e insultos.</p>

        ${state.directMessages.length === 0 ? '<p>Inicia una conversación para acordar el intercambio.</p>' : state.directMessages.map(m => `
          <div style="align-self: ${m.role === state.currentRole ? 'flex-end' : 'flex-start'}; background: ${m.role === state.currentRole ? '#C1663B' : '#eee'}; color: ${m.role === state.currentRole ? 'white' : 'black'}; padding: 15px; border-radius: 12px; max-width: 80%; box-shadow: 0 2px 5px rgba(0,0,0,0.1); position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
              <strong>${m.from}</strong>
              <button class="btn-icon-large btn-delete-direct" style="width: 24px; height: 24px; font-size: 12px; background: transparent; border: none; box-shadow: none; color: ${m.role === state.currentRole ? 'white' : '#666'}; opacity: 0.6;" data-id="${m.id}">🗑️</button>
            </div>
            <p>${m.text}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
              <small style="font-size: 10px; opacity: 0.7;">${m.date}</small>
              <button class="btn-icon-large" style="width: 30px; height: 30px; font-size: 14px; background: transparent; border: none; box-shadow: none;" onclick="speak('${m.text}')">🔊</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card mt-large" style="padding: 20px; border: 2px solid var(--secondary-color);">
        <h2>Enviar Mensaje</h2>
        <textarea id="direct-message-text" class="search-input" style="width: 100%; height: 100px; border: 2px solid #ccc; border-radius: 8px; margin: 10px 0;" placeholder="Escribe tu mensaje..."></textarea>
        <button class="btn-secondary" id="btn-send-direct">ENVIAR</button>
      </div>
    </div>
  `;
};

const ProfileTemplate = () => {
  const isM = state.currentRole === 'maestro';
  return `
    <div class="screen text-center">
      <h1>Mi Perfil</h1>
      <div style="font-size: 80px;">👤</div>
      <h2>${isM ? 'Don Manuel' : 'Usuario Aprendiz'}</h2>
      <p>Rol Activo: ${state.currentRole.toUpperCase()}</p>
      
      ${isM ? `
        <div class="card mt-large" style="padding: 20px; text-align: left;">
          <h2 style="color: var(--primary-color);">💳 Método de Intercambio</h2>
          <p>¿Qué pides a cambio de tus videos?</p>
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
            <button class="btn-pay-option ${state.paymentMethod === 'Historia Moderna' ? 'selected' : ''}" data-method="Historia Moderna">📜 Historia Moderna</button>
            <button class="btn-pay-option ${state.paymentMethod === 'Ayuda con Tareas' ? 'selected' : ''}" data-method="Ayuda con Tareas">📚 Ayuda con Tareas</button>
            <button class="btn-pay-option ${state.paymentMethod === 'Enseñar un Tema' ? 'selected' : ''}" data-method="Enseñar un Tema">💡 Enseñar un Tema</button>
            <button class="btn-pay-option ${state.paymentMethod === 'Agradecimientos Públicos' ? 'selected' : ''}" data-method="Agradecimientos Públicos">🙏 Agradecimientos Públicos</button>
          </div>
        </div>
      ` : ''}

      <button class="btn-secondary mt-large" id="change-role">CAMBIAR ROLES</button>
      <button class="btn-primary mt-large" style="background: #e74c3c;" onclick="location.reload()">CERRAR SESIÓN</button>
    </div>
  `;
};

const AccessibilityPanelTemplate = () => {
  if (!state.accSettings.showPanel) return '';
  const s = state.accSettings;
  return `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="acc-row">
          <h2 style="color: var(--primary-color); font-size: 24px;">♿ Centro de Accesibilidad</h2>
          <button class="btn-icon-large" id="close-acc" style="width: 48px; height: 48px; box-shadow: none; background: transparent; border: none;">❌</button>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <h3 style="font-size: 20px;">🎨 Visibilidad</h3>
          <button class="btn-primary acc-btn-large ${s.highContrast ? 'acc-btn-active' : ''}" id="toggle-contrast">
            ${s.highContrast ? '🌓 QUITAR ALTO CONTRASTE' : '🌓 MODO ALTO CONTRASTE'}
          </button>
          <button class="btn-primary acc-btn-large ${s.inverted ? 'acc-btn-active' : ''}" id="toggle-invert">
            INVERTIR COLORES
          </button>

          <h3 style="font-size: 20px; margin-top: 10px;">🔄 Ergonomía</h3>
          <button class="btn-secondary acc-btn-large ${s.isLeftHanded ? 'acc-btn-active' : ''}" id="toggle-handed">
            ${s.isLeftHanded ? '🔄 MODO DIESTRO' : '🔄 MODO ZURDO'}
          </button>

          <h3 style="font-size: 20px; margin-top: 10px;">🔍 Tamaño de Texto</h3>
          <div class="acc-row">
            <button class="btn-icon-large acc-btn-large" id="font-dec" style="flex: 1;">🔍- PEQUEÑO</button>
            <button class="btn-icon-large acc-btn-large" id="font-inc" style="flex: 1;">🔍+ GRANDE</button>
          </div>

          <h3 style="font-size: 20px; margin-top: 10px;">🔊 Audio y Voz</h3>
          <button class="btn-secondary acc-btn-large ${s.hoverSpeak ? 'acc-btn-active' : ''}" id="toggle-hover">
            🔊 LEER AL SEÑALAR ${s.hoverSpeak ? '(ACTIVO)' : ''}
          </button>
          <button class="btn-secondary acc-btn-large" onclick="readScreen()">🎤 LEER TODA LA PANTALLA</button>
        </div>

        <p style="text-align: center; font-size: 14px; opacity: 0.7; margin-top: 10px;">"Adaptamos la tecnología a ti."</p>
      </div>
    </div>
  `;
};

const updateNav = () => {
  const nav = $('bottom-nav');
  if (!state.currentRole) {
    nav.classList.add('hidden');
    return;
  }
  nav.classList.remove('hidden');

  const isM = state.currentRole === 'maestro';
  nav.innerHTML = `
    <button class="nav-item ${state.currentScreen === 'home' ? 'active' : ''}" data-screen="home">
      <i>🏠</i><span class="nav-label">INICIO</span>
    </button>
    <button class="nav-item ${state.currentScreen === 'catalog' ? 'active' : ''}" data-screen="catalog">
      <i>${isM ? '📂' : '🔍'}</i><span class="nav-label">${isM ? 'MIS VIDEOS' : 'CATÁLOGO'}</span>
    </button>
    <button class="nav-item ${state.currentScreen === 'upload' ? 'active' : ''}" data-screen="upload">
      <i>${isM ? '📤' : '🎓'}</i><span class="nav-label">${isM ? 'SUBIR' : 'APRENDER'}</span>
    </button>
    <button class="nav-item ${state.currentScreen === 'messages' ? 'active' : ''}" data-screen="messages">
      <i>✉️</i><span class="nav-label" style="text-align: center;">${isM ? 'MENSAJES' : 'CONTACTO'}</span>
    </button>
    <button class="nav-item ${state.currentScreen === 'profile' ? 'active' : ''}" data-screen="profile">
      <i>👤</i><span class="nav-label">PERFIL</span>
    </button>
  `;
};

const attachEventListeners = () => {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
      state.currentScreen = btn.dataset.screen;
      // Si el maestro pulsa "Subir" (nav center), reseteamos el video seleccionado para mostrar el formulario
      if (state.currentRole === 'maestro' && state.currentScreen === 'upload') {
        state.selectedVideo = null;
      }
      navigate();
    };
  });

  // Accessibility Actions
  if ($('btn-acc')) $('btn-acc').onclick = () => { state.accSettings.showPanel = true; navigate(); };
  if ($('floating-acc-btn')) $('floating-acc-btn').onclick = () => { state.accSettings.showPanel = true; navigate(); };
  if ($('close-acc')) $('close-acc').onclick = () => { state.accSettings.showPanel = false; navigate(); };
  
  if ($('toggle-hover')) $('toggle-hover').onclick = async () => {
    state.accSettings.hoverSpeak = !state.accSettings.hoverSpeak;
    await setSetting('accSettings', state.accSettings);
    navigate();
  };

  if ($('toggle-handed')) $('toggle-handed').onclick = async () => {
    state.accSettings.isLeftHanded = !state.accSettings.isLeftHanded;
    await setSetting('accSettings', state.accSettings);
    navigate();
  };

  if ($('font-inc')) $('font-inc').onclick = async () => { 
    if (state.accSettings.fontSize < 32) state.accSettings.fontSize += 2; 
    applyAccessibility(); 
    await setSetting('accSettings', state.accSettings);
    navigate(); 
  };
  if ($('font-dec')) $('font-dec').onclick = async () => { 
    if (state.accSettings.fontSize > 16) state.accSettings.fontSize -= 2; 
    applyAccessibility(); 
    await setSetting('accSettings', state.accSettings);
    navigate(); 
  };
  
  if ($('bright-range')) $('bright-range').oninput = async (e) => {
    state.accSettings.brightness = e.target.value;
    applyAccessibility();
    await setSetting('accSettings', state.accSettings);
  };

  if ($('toggle-contrast')) $('toggle-contrast').onclick = async () => {
    state.accSettings.highContrast = !state.accSettings.highContrast;
    applyAccessibility();
    await setSetting('accSettings', state.accSettings);
    navigate();
  };

  if ($('toggle-invert')) $('toggle-invert').onclick = async () => {
    state.accSettings.inverted = !state.accSettings.inverted;
    applyAccessibility();
    await setSetting('accSettings', state.accSettings);
    navigate();
  };

  if ($('toggle-transcription')) $('toggle-transcription').onclick = () => {
    $('transcription-box').classList.toggle('hidden');
  };

  // Dictation for transcription
  if ($('btn-dictate-trans')) {
    $('btn-dictate-trans').onclick = () => {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = 'es-ES';
      speak("Dicta lo que dices en el video...");
      $('btn-dictate-trans').innerText = '⏳ Escuchando...';

      recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        $('video-transcription').value += result + ' ';
      };
      recognition.onend = () => {
        $('btn-dictate-trans').innerText = '🎙️ DICTAR TRANSCRIPCIÓN';
      };
      recognition.start();
    };
  }

  // Onboarding
  if ($('select-maestro')) {
    $('select-maestro').onclick = () => {
      state.currentRole = 'maestro';
      state.currentScreen = 'home';
      navigate();
    };
    $('select-aprendiz').onclick = () => {
      state.currentRole = 'aprendiz';
      state.currentScreen = 'home';
      navigate();
    };
  }

  // Common Actions
  if ($('go-upload')) $('go-upload').onclick = () => { state.currentScreen = 'upload'; state.selectedVideo = null; navigate(); };
  if ($('go-home')) $('go-home').onclick = () => { state.currentScreen = 'home'; navigate(); };
  if ($('go-back-to-list')) $('go-back-to-list').onclick = () => { state.currentScreen = (state.currentRole === 'aprendiz' ? 'home' : 'catalog'); state.selectedVideo = null; navigate(); };
  if ($('change-role')) $('change-role').onclick = () => { state.currentRole = null; state.selectedVideo = null; navigate(); };

  // Payment Method Selection
  document.querySelectorAll('.btn-pay-option').forEach(btn => {
    btn.onclick = async () => {
      const method = btn.dataset.method;
      state.paymentMethod = method;
      await setSetting('paymentMethod', method);
      navigate();
    };
  });

  // Video Selection (Learner)
  document.querySelectorAll('.view-video-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      state.selectedVideo = state.videos.find(v => v.id === id);
      state.currentScreen = 'upload'; // Usamos la misma pantalla para ver el video
      navigate();
    };
  });

  // Delete video handler
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      console.log('Intentando eliminar video con ID:', id);
      
      if (isNaN(id)) {
        console.error('Error: ID de video no válido');
        return;
      }

      if (confirm('¿Seguro que quieres borrar este video? Esta acción no se puede deshacer.')) {
        try {
          await deleteVideo(id);
          alert('¡Video eliminado correctamente!');
          await refreshVideos();
          state.currentScreen = 'home'; // Forzamos ir al inicio para ver el cambio
          navigate();
        } catch (err) {
          console.error('Error al eliminar:', err);
          alert('No se pudo eliminar el video de la base de datos.');
        }
      }
    };
  });

  // Real Upload Logic
  if ($('video-file')) {
    $('video-file').onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        $('file-name').innerText = `Seleccionado: ${file.name}`;
        $('file-status').innerText = '✅';
      }
    };

    $('btn-publish-real').onclick = async () => {
      const file = $('video-file').files[0];
      const title = $('video-title').value;
      const categorySelect = $('video-category');
      const category = categorySelect.value;
      const icon = categorySelect.options[categorySelect.selectedIndex].dataset.icon;

      if (!file || !title) {
        alert("Por favor selecciona un video y escribe un título.");
        return;
      }

      $('upload-msg').innerText = "Guardando video... espera un momento.";
      
      const newVideo = {
        title,
        category,
        categoryIcon: icon,
        teacher: 'Mi Cuenta',
        fileBlob: file,
        transcription: $('video-transcription').value,
        paymentMethod: state.paymentMethod, // Guardamos el método de intercambio actual
        views: 0,
        thanks: 0,
        date: new Date().toLocaleDateString()
      };

      try {
        await saveVideo(newVideo);
        await refreshVideos();
        alert("¡Video guardado con éxito en la base de datos local!");
        state.currentScreen = 'home';
        navigate();
      } catch (err) {
        alert("Error al guardar: " + err);
      }
    };
  }

  if ($('btn-thanks')) {
    $('btn-thanks').onclick = () => {
      alert('¡Agradecimiento enviado! El maestro podrá verlo pronto.');
      speak("¡Gracias enviado!");
    };
  }

  // Delete message handler
  document.querySelectorAll('.btn-delete-msg').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      if (confirm('¿Quieres eliminar este mensaje del muro público?')) {
        await deleteMessage(id);
        await refreshMessages();
        navigate();
      }
    };
  });

  // Contact Maestro from Video Player
  if ($('btn-contact-maestro')) {
    $('btn-contact-maestro').onclick = () => {
      state.currentScreen = 'messages';
      navigate();
    };
  }

  // Handle Send Direct Message
  if ($('btn-send-direct')) {
    $('btn-send-direct').onclick = async () => {
      const text = $('direct-message-text').value;
      if (!text) return alert("Escribe un mensaje.");

      const safetyResult = validateSafety(text);
      if (!safetyResult.valid) {
        alert("⚠️ BLOQUEO DE SEGURIDAD: " + safetyResult.reason);
        speak("Mensaje bloqueado por seguridad.");
        return;
      }

      const newMsg = {
        from: state.currentRole === 'aprendiz' ? 'Aprendiz' : 'Don Manuel (Maestro)',
        role: state.currentRole,
        text: text,
        date: new Date().toLocaleString()
      };

      try {
        await saveDirectMessage(newMsg);
        alert("¡Mensaje enviado!");
        await refreshMessages();
        navigate();
      } catch (err) {
        alert("Error al enviar.");
      }
    };
  }

  // Handle Video Comments
  if ($('btn-send-comment')) {
    $('btn-send-comment').onclick = async () => {
      const text = $('new-comment-text').value;
      if (!text) return;

      const safetyResult = validateSafety(text);
      if (!safetyResult.valid) {
        alert("⚠️ SEGURIDAD: " + safetyResult.reason);
        return;
      }

      const newComment = {
        videoId: state.selectedVideo.id,
        from: state.currentRole === 'aprendiz' ? 'Joven Aprendiz' : 'Maestro del Oficio',
        text: text,
        date: new Date().toLocaleString()
      };

      try {
        await saveComment(newComment);
        await refreshComments(state.selectedVideo.id);
        navigate();
      } catch (err) {
        alert("Error al comentar.");
      }
    };
  }

  // Deletion logic for Direct Messages
  document.querySelectorAll('.btn-delete-direct').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      if (confirm('¿Eliminar este mensaje permanentemente?')) {
        await deleteDirectMessage(id);
        await refreshMessages();
        navigate();
      }
    };
  });

  // Deletion logic for Video Comments
  document.querySelectorAll('.btn-delete-comment').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      if (confirm('¿Eliminar este comentario?')) {
        await deleteComment(id);
        await refreshComments(state.selectedVideo.id);
        navigate();
      }
    };
  });

  // Category selection handler
  document.querySelectorAll('.btn-category').forEach(btn => {
    btn.onclick = () => {
      const cat = btn.dataset.category;
      state.searchQuery = cat;
      state.currentScreen = 'home';
      navigate();
    };
  });

  if ($('btn-send-msg')) {
    $('btn-send-msg').onclick = async () => {
      const text = $('new-message').value;
      if (!text) {
        alert("Escribe algo antes de enviar.");
        return;
      }

      const newMessage = {
        from: 'Aprendiz', // En una app real usaríamos el nombre del perfil
        text: text,
        date: new Date().toLocaleString()
      };

      try {
        await saveMessage(newMessage);
        alert("¡Tu mensaje ha sido publicado en el muro!");
        await refreshMessages();
        navigate();
      } catch (err) {
        alert("Error al enviar: " + err);
      }
    };
  }

  // Real Voice Search (Web Speech API)
  if ($('voice-search')) {
    $('voice-search').onclick = () => {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = 'es-ES';
      
      speak("Te escucho...");
      $('voice-search').innerText = '⏳';

      recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        state.searchQuery = result;
        if ($('search-input')) $('search-input').value = result;
        speak("Buscando " + result);
        state.currentScreen = 'home'; // Vamos al inicio para ver resultados
        navigate();
      };

      recognition.onend = () => {
        if ($('voice-search')) $('voice-search').innerText = '🎙️';
      };

      recognition.onerror = () => {
        alert("No pude escucharte bien. Intenta de nuevo.");
        if ($('voice-search')) $('voice-search').innerText = '🎙️';
      };

      recognition.start();
    };
  }

  // Live Filtering Logic
  if ($('search-input')) {
    $('search-input').oninput = (e) => {
      state.searchQuery = e.target.value;
      // Actualizamos solo el feed sin re-renderizar todo para no perder el foco
      // Pero por simplicidad en este SPA de vanila, navegaremos o re-renderizaremos suavemente
    };
    
    // Al presionar Enter, vamos a la pantalla de resultados (Home)
    $('search-input').onkeypress = (e) => {
      if (e.key === 'Enter') {
        state.currentScreen = 'home';
        navigate();
      }
    };
  }
};

const navigate = async () => {
  if (!state.currentRole) {
    if ($('acc-panel-container')) $('acc-panel-container').innerHTML = ''; // Limpiar panel en onboarding si se desea
    render(OnboardingTemplate);
    return;
  }

  await refreshVideos();
  await refreshMessages();
  if (state.selectedVideo && state.currentScreen === 'upload') {
    await refreshComments(state.selectedVideo.id);
  }

  switch (state.currentScreen) {
    case 'home': render(HomeTemplate()); break;
    case 'catalog': render(CatalogTemplate()); break;
    case 'upload': render(UploadLearnTemplate()); break;
    case 'messages': render(MessagesTemplate()); break;
    case 'profile': render(ProfileTemplate()); break;
  }

  // Renderizar Panel de Accesibilidad
  if ($('acc-panel-container')) {
    $('acc-panel-container').innerHTML = AccessibilityPanelTemplate();
  }
  
  // Renderizar Botón Flotante
  const existingBtn = $('floating-acc-btn');
  if (!existingBtn) {
    const btn = document.createElement('button');
    btn.id = 'floating-acc-btn';
    btn.className = 'floating-acc-btn';
    btn.innerHTML = '♿';
    document.body.appendChild(btn);
  }

  applyAccessibility();
  attachEventListeners();
};

// Global Controls
$('tts-btn').onclick = readScreen;
$('help-btn').onclick = () => {
  const msg = state.currentRole === 'maestro' 
    ? "Maestro, aquí puedes subir tus conocimientos. Toca el botón de video para elegir un archivo y luego dale a publicar."
    : "Aprendiz, aquí puedes ver los oficios. Elige un video y al terminar recuerda dar las gracias.";
  speak(msg);
  alert(msg);
};

// Initial Render
initDB().then(async () => {
  state.paymentMethod = await getSetting('paymentMethod') || 'Agradecimientos Públicos';
  const savedAcc = await getSetting('accSettings');
  if (savedAcc) {
    state.accSettings = { ...state.accSettings, ...savedAcc };
  }
  navigate();
});

// Expose speak to global
window.speak = speak;
