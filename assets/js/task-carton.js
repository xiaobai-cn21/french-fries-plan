/* Original teammate layers retain their 396 x 502 coordinates, size and angle. */
const cartonAssets = new URL('../images/fries/', document.currentScript.src).href;
// Fill the visible foreground first, then the middle and rear layers.
const FRY_FILL_ORDER = [10, 9, 11, 8, 7, 6, 5, 4, 3, 1, 2];
const CARTON_CAPACITY = FRY_FILL_ORDER.length;
const fryHitMap = Uint8Array.from(atob(window.FRIES_DATA.map), c => c.charCodeAt(0));

class TaskCarton extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' }); this.tasks = []; this.page = 0;
  }
  connectedCallback() { this.render(); }
  setTasks(tasks) {
    this.tasks = tasks;
    this.page = Math.min(this.page, Math.max(0, Math.ceil(tasks.length / CARTON_CAPACITY) - 1));
    this.render();
  }
  render() {
    const count = Math.max(0, Math.min(CARTON_CAPACITY, this.tasks.length - this.page * CARTON_CAPACITY));
    const shown = new Set(FRY_FILL_ORDER.slice(0, count));
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;width:100%;color:#956f42;font-family:inherit}
      *{box-sizing:border-box}
      .scene{position:relative;width:min(100%,var(--carton-max,350px));aspect-ratio:var(--carton-ratio,396/502);margin:auto;isolation:isolate;touch-action:manipulation}
      .scene.empty{--carton-ratio:396/340}
      .carton,.pick,.pick img{position:absolute;inset:0;width:100%;height:100%}
      .carton{pointer-events:none}.back{z-index:0}.front{z-index:1}
      .pick{padding:0;border:0;background:none;pointer-events:none;z-index:2;outline:none}
      .pick img{pointer-events:none;filter:drop-shadow(0 0 1px #ffcb45);transform-origin:var(--ox) var(--oy);transition:transform .2s ease-out,filter .2s ease-out}
      .pick.active,.pick:focus-visible{z-index:3}
      .pick.active img,.pick:focus-visible img{transform:translateY(-6px) scale(1.08);filter:drop-shadow(0 0 3px #ffd250) drop-shadow(0 0 12px #ffaa1ed9)}
      .scene.over{cursor:pointer}
      .pagination{display:flex;justify-content:center;align-items:center;gap:18px;margin-top:2px;font-size:12px}
      .pagination span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
      .pagination button{border:1px solid #e8d3b6;border-radius:50%;height:40px;width:40px;background:#fff9ed;color:#97682f;font:inherit;cursor:pointer}
      @media(max-width:430px){.scene{width:min(100%,var(--carton-max-mobile,var(--carton-max,350px)))}.pagination button{height:34px;width:34px}}
      .pagination button:disabled{opacity:.3;cursor:default}.pagination button:focus-visible{outline:2px solid #ba752c;outline-offset:3px}
      .pagination[hidden]{display:none}
      @media(prefers-reduced-motion:reduce){.pick img{transition:none;transform:none!important}}
    </style><div class="scene ${count ? '' : 'empty'}">
      ${count < CARTON_CAPACITY ? `<svg class="carton back" viewBox="${count ? '0 0 396 502' : '0 162 396 340'}" aria-hidden="true"><path d="M39 211Q194 166 367 211L342 293H62Z" fill="#b92316"/><ellipse cx="203" cy="219" rx="149" ry="30" fill="#831d13"/></svg>` : ''}
      <svg class="carton front" viewBox="${count ? '0 0 396 502' : '0 162 396 340'}" aria-hidden="true">
        <defs><clipPath id="carton-front"><path d="M37 207C81 232 118 285 198 289C277 290 325 241 370 207L350 378L326 487L246 502L117 500L81 482L51 350Z"/></clipPath></defs>
        <image href="${cartonAssets}carton-source.png" width="396" height="502" ${count < CARTON_CAPACITY ? 'clip-path="url(#carton-front)"' : ''}/>
      </svg>
    </div><div class="pagination" ${this.tasks.length > CARTON_CAPACITY ? '' : 'hidden'}></div>`;

    const scene = this.shadowRoot.querySelector('.scene');
    const buttons = new Map();
    // Original compositing order is independent of the order in which fries fill.
    window.FRIES_DATA.fries.filter(fry => shown.has(fry.id)).forEach(fry => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'pick';
      button.setAttribute('aria-label', '抽取一根薯条');
      button.style.setProperty('--ox', `${fry.cx / 396 * 100}%`);
      button.style.setProperty('--oy', `${fry.cy / 502 * 100}%`);
      const img = document.createElement('img');
      img.src = `${cartonAssets}fry_${String(fry.id).padStart(2, '0')}.png`;
      img.alt = ''; img.draggable = false;
      button.append(img);
      button.addEventListener('click', event => {
        event.stopPropagation(); this.dispatchEvent(new CustomEvent('task-draw', { bubbles: true }));
      });
      scene.append(button); buttons.set(fry.id, button);
    });
    function pick(event) {
      const rect = scene.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / rect.width * 396);
      const y = Math.floor((event.clientY - rect.top) / rect.height * 502);
      if (x < 0 || y < 0 || x >= 396 || y >= 502) return 0;
      const id = fryHitMap[y * 396 + x];
      return shown.has(id) ? id : 0;
    }
    function highlight(id) {
      buttons.forEach((button, key) => button.classList.toggle('active', key === id));
      scene.classList.toggle('over', Boolean(id));
    }
    scene.addEventListener('pointermove', event => highlight(pick(event)));
    scene.addEventListener('pointerdown', event => highlight(pick(event)));
    scene.addEventListener('pointerleave', () => highlight(0));
    scene.addEventListener('click', event => { const id = pick(event); if (id) buttons.get(id).click(); });

    if (this.tasks.length > CARTON_CAPACITY) {
      const pager = this.shadowRoot.querySelector('.pagination');
      const prev = document.createElement('button'), next = document.createElement('button'), label = document.createElement('span');
      prev.textContent = '‹'; next.textContent = '›';
      prev.setAttribute('aria-label', '上一盒'); next.setAttribute('aria-label', '下一盒');
      prev.disabled = this.page === 0; next.disabled = (this.page + 1) * CARTON_CAPACITY >= this.tasks.length;
      label.textContent = `${this.page + 1} / ${Math.ceil(this.tasks.length / CARTON_CAPACITY)}`;
      prev.onclick = () => { this.page--; this.render(); this.shadowRoot.querySelector('.pagination button:last-child').focus(); };
      next.onclick = () => { this.page++; this.render(); this.shadowRoot.querySelector('.pagination button').focus(); };
      pager.append(prev, label, next);
    }
  }
}
customElements.define('task-carton', TaskCarton);
