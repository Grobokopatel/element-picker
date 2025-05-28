class ElementPicker {
  constructor() {
    this.isActive = false;
    this.currentMode = null;
    this.overlay = null;
    this.currentHighlight = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  init() {
    this.createOverlay();
    this.attachEventListeners();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'element-picker-overlay';
    this.overlay.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold; text-align: center;">Выберите тип элемента:</div>
      <button id="picker-image">Картинка</button>
      <button id="picker-text">Текст</button>
      <button id="picker-link">Ссылка</button>
      <button id="picker-close" style="background-color: #f44336; margin-top: 10px;">Закрыть</button>
    `;
    
    document.body.appendChild(this.overlay);
    this.makeDraggable();
  }

  makeDraggable() {
    this.overlay.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      this.isDragging = true;
      const rect = this.overlay.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      
      this.overlay.style.bottom = 'auto';
      this.overlay.style.right = 'auto';
      this.overlay.style.left = rect.left + 'px';
      this.overlay.style.top = rect.top + 'px';
      
      document.addEventListener('mousemove', this.handleDrag);
      document.addEventListener('mouseup', this.handleDragEnd);
    });
  }

  handleDrag = (e) => {
    if (!this.isDragging) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    this.overlay.style.left = Math.max(0, Math.min(window.innerWidth - this.overlay.offsetWidth, x)) + 'px';
    this.overlay.style.top = Math.max(0, Math.min(window.innerHeight - this.overlay.offsetHeight, y)) + 'px';
  }

  handleDragEnd = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.handleDragEnd);
  }

  attachEventListeners() {
    document.getElementById('picker-image').addEventListener('click', () => this.toggleMode('image'));
    document.getElementById('picker-text').addEventListener('click', () => this.toggleMode('text'));
    document.getElementById('picker-link').addEventListener('click', () => this.toggleMode('link'));
    document.getElementById('picker-close').addEventListener('click', () => this.close());
    
    document.addEventListener('mouseover', this.handleMouseOver);
    document.addEventListener('mouseout', this.handleMouseOut);
    document.addEventListener('click', this.handleClick);
  }

  toggleMode(mode) {
    if (this.currentMode === mode && this.isActive) {
      this.exitSelectionMode();
      return;
    }
    
    this.setMode(mode);
  }

  setMode(mode) {
    this.currentMode = mode;
    this.isActive = true;
    
    document.querySelectorAll('.element-picker-overlay button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`picker-${mode}`).classList.add('active');
  }

  exitSelectionMode() {
    this.isActive = false;
    this.currentMode = null;
    
    document.querySelectorAll('.element-picker-overlay button').forEach(btn => {
      btn.classList.remove('active');
    });
  }

  handleMouseOver = (e) => {
    if (!this.isActive || this.overlay.contains(e.target)) return;
    
    if (this.isValidTarget(e.target)) {
      this.highlightElement(e.target);
    }
  }

  handleMouseOut = (e) => {
    if (!this.isActive || this.overlay.contains(e.target)) return;
    
    this.removeHighlight();
  }

  handleClick = (e) => {
    // Предотвращаем переходы по ссылкам в любом режиме выбора
    if (this.isActive && (e.target.tagName === 'A' || e.target.closest('a'))) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!this.isActive || this.overlay.contains(e.target)) return;
    
    if (this.isValidTarget(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      
      const selector = this.generateSelector(e.target);
      this.copyToClipboard(selector);
      this.showNotification('Селектор скопирован!');
      
      this.removeHighlight();
      this.exitSelectionMode();
    }
  }

  isValidTarget(element) {
    switch (this.currentMode) {
      case 'image':
        return element.tagName === 'IMG';
      case 'text':
        return element.tagName !== 'IMG' && 
               element.textContent && element.textContent.trim().length > 0;
      case 'link':
        return element.tagName === 'A' || element.closest('a');
      default:
        return false;
    }
  }

  highlightElement(element) {
    this.removeHighlight();
    element.classList.add('element-picker-highlight');
    this.currentHighlight = element;
  }

  removeHighlight() {
    if (this.currentHighlight) {
      this.currentHighlight.classList.remove('element-picker-highlight');
      this.currentHighlight = null;
    }
  }

  generateSelector(element) {
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        const classes = current.className.split(' ')
          .filter(c => c && !c.startsWith('element-picker'))
          .map(c => c.trim())
          .filter(c => c);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      const siblings = Array.from(current.parentNode?.children || []);
      const sameTagSiblings = siblings.filter(sibling => 
        sibling.tagName === current.tagName
      );
      
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentNode;
    }
    
    return path.join(' > ');
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback для старых браузеров
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'element-picker-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  close() {
    this.isActive = false;
    this.currentMode = null;
    this.removeHighlight();
    
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    document.removeEventListener('mouseover', this.handleMouseOver);
    document.removeEventListener('mouseout', this.handleMouseOut);
    document.removeEventListener('click', this.handleClick);
  }
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showPicker') {
    const picker = new ElementPicker();
    picker.init();
  }
});