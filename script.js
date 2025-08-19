 // --- Auto-discover projects from a JSON file ---
// Place a JSON file at /projects.json. Supported shapes:
// 1) Array: [{ "label": "traefik.sheddy.work", "url": "https://traefik.sheddy.work" }, ...]
// 2) Object map: { "traefik.sheddy.work": "https://traefik.sheddy.work", ... }

(function() {
  'use strict';
  
  const CONFIG = {
    JSON_URL: '/projects.json',
    TYPING_SPEED: 22,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  };
  
  // Cache DOM elements
  const elements = {
    screen: document.getElementById('screen'),
    updatedAt: document.getElementById('updatedAt'),
    refreshBtn: document.getElementById('refreshBtn')
  };
  
  // Cache for projects data
  let projectsCache = {
    data: null,
    timestamp: 0,
    isValid() {
      return this.data && (Date.now() - this.timestamp < CONFIG.CACHE_DURATION);
    },
    set(data) {
      this.data = data;
      this.timestamp = Date.now();
    },
    clear() {
      this.data = null;
      this.timestamp = 0;
    }
  };

  function createLine(content, cls = '') {
    const div = document.createElement('div');
    div.className = `line ${cls}`;
    div.innerHTML = content;
    elements.screen.appendChild(div);
    elements.screen.scrollTop = elements.screen.scrollHeight;
    return div;
  }

  function typeText(target, text, speed = CONFIG.TYPING_SPEED) {
    return new Promise(resolve => {
      let i = 0;
      const cursor = document.createElement('span');
      cursor.className = 'cursor blink';
      target.appendChild(cursor);
      
      const typeInterval = setInterval(() => {
        if (i < text.length) {
          cursor.insertAdjacentText('beforebegin', text[i++]);
        } else {
          clearInterval(typeInterval);
          cursor.remove();
          resolve();
        }
        elements.screen.scrollTop = elements.screen.scrollHeight;
      }, speed);
    });
  }

  function normalizeProjects(json) {
    if (!json) return [];
    
    if (Array.isArray(json)) {
      return json
        .filter(x => x && (x.url || x.href || x.label))
        .map(x => ({ 
          label: x.label || x.url || x.href, 
          url: x.url || x.href || '#' 
        }));
    }
    
    if (typeof json === 'object') {
      return Object.entries(json).map(([label, url]) => ({ label, url }));
    }
    
    return [];
  }

  async function fetchProjects() {
    if (projectsCache.isValid()) {
      return projectsCache.data;
    }
    
    try {
      const res = await fetch(CONFIG.JSON_URL, { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const json = await res.json();
      const lastModified = res.headers.get('Last-Modified');
      const timestamp = lastModified ? new Date(lastModified) : new Date();
      
      const result = { 
        list: normalizeProjects(json), 
        ts: timestamp,
        error: null
      };
      
      if (result.list.length > 0) {
        projectsCache.set(result);
      }
      
      return result;
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      return { 
        list: null, 
        ts: new Date(),
        error: err.message
      };
    }
  }

  function setUpdated(ts, note) {
    const iso = ts.toISOString();
    const text = `last updated: ${iso}${note ? ` — ${note}` : ''}`;
    elements.updatedAt.textContent = text;
  }

  function clearScreen() {
    elements.screen.innerHTML = '';
  }

  async function printSession() {
    clearScreen();

    try {
      let el = createLine(`<span class="prompt">$</span> <span class="command"></span>`);
      await typeText(el.querySelector('.command'), 'whoami');
      createLine('<span class="output">shedrack@sheddy.work</span>');

      el = createLine(`<span class="prompt">$</span> <span class="command"></span>`);
      await typeText(el.querySelector('.command'), 'echo "DevOps playground"');
      createLine('<span class="output">DevOps playground</span>');

      el = createLine(`<span class="prompt">$</span> <span class="command"></span>`);
      await typeText(el.querySelector('.command'), 'ls');

      const { list: projects, ts, error } = await fetchProjects();

      if (projects === null) {
        const errorMsg = error ? `(${error})` : '(could not load projects.json)';
        createLine(`<span class="output">${errorMsg}</span>`);
        createLine('<span class="output">no projects yet — check back soon</span>');
        setUpdated(ts, 'fetch error');
      } else if (projects.length === 0) {
        createLine('<span class="output">no projects yet — check back soon</span>');
        setUpdated(ts);
      } else {
        renderProjects(projects);
        setUpdated(ts);
      }

      // Final prompt
      createLine(`<span class="prompt">$</span> <span class="blink cursor" aria-hidden="true"></span>`);
    } catch (err) {
      console.error('Error in printSession:', err);
      createLine('<span class="output">An error occurred while loading the terminal</span>');
    }
  }

  function renderProjects(projects) {
    const container = document.createElement('div');
    container.className = 'line output';
    
    const fragment = document.createDocumentFragment();
    
    projects.forEach(project => {
      const link = document.createElement('a');
      link.href = project.url;
      link.textContent = project.label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      const row = document.createElement('div');
      row.appendChild(link);
      fragment.appendChild(row);
    });
    
    container.appendChild(fragment);
    elements.screen.appendChild(container);
  }

  // Debounce function to prevent rapid calls
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const debouncedRefresh = debounce(printSession, 300);

  function onKeydown(e) {
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      debouncedRefresh();
    }
  }

  function init() {
    if (!elements.screen || !elements.updatedAt || !elements.refreshBtn) {
      console.error('Required DOM elements not found');
      return;
    }

    elements.refreshBtn.addEventListener('click', debouncedRefresh);
    window.addEventListener('keydown', onKeydown);

    setTimeout(printSession, 250);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();