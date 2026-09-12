/* Reusable artwork. Progress controls cooking; state controls motion/light.
   No external libraries, canvas, or animation timers are used. */
(() => {
  const microwavePhoto = new URL('../images/potatos-micro.png', document.currentScript.src).href;
  const fries = [
    [44,75,111,19,-21],[65,42,139,20,-12],[92,23,158,20,-5],
    [119,35,153,21,5],[150,49,137,19,15],[176,81,105,19,24],
    [54,105,95,20,-15],[80,78,121,22,-8],[106,64,136,21,1],
    [133,84,119,21,9],[158,106,94,20,19],[111,109,103,20,-3]
  ];
  const mix = (a,b,t) => `rgb(${a.map((n,i)=>Math.round(n+(b[i]-n)*t)).join(',')})`;
  function fry([x,y,h,w,r],i) {
    const edge=5;
    return `<g class="fry" transform="translate(${x} ${y}) rotate(${r} ${w/2} ${h})"><g class="fry-motion" style="--delay:${-i*.37}s">
      <path class="fry-front" d="M2 5 Q0 6 0 10 V${h-3} Q0 ${h} 4 ${h} H${w-edge} V5Z"/>
      <path class="fry-side" d="m${w-edge} 5 ${edge} -4 v${h-5} q0 4 -4 4 h-1Z"/>
      <path class="fry-top" d="M2 5 6 0 H${w-2} Q${w+1} 0 ${w} 2 L${w-edge} 6Z"/>
      <path d="M3 12v${h-24}" fill="none" stroke="#fff9d5" stroke-width="1.4" opacity=".35"/>
    </g></g>`;
  }
  function carton(single = false) {
    return `<ellipse cx="122" cy="256" rx="80" ry="10" fill="#874321" opacity=".11"/>
    <g class="bundle">
      <path d="M40 158Q120 132 202 158L188 232H53Z" fill="url(#carton-back)"/>
      <g clip-path="url(#fry-crop)">${(single?[[105,40,154,26,-3]]:fries).map(fry).join('')}</g>
      <path d="M40 157Q120 199 202 157L185 243Q123 268 58 244Z" fill="url(#carton-front)"/>
      <path d="m40 157 18 87 11 4-11-82Z" fill="#fff3d3" opacity=".22"/>
      <path d="m202 157-17 86-15 5 15-82Z" fill="#90311a" opacity=".15"/>
      <path d="M41 158Q120 199 201 158" fill="none" stroke="#fff2c1" stroke-width="2.5" opacity=".6"/>
      <text class="carton-logo" x="122" y="224" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="-.5">FryPlan</text>
      <path d="M107 237q15 7 29 0" fill="none" stroke="var(--logo)" stroke-width="1.5" opacity=".45" stroke-linecap="round"/>
    </g>`;
  }
  const defs = `<defs>
    <clipPath id="fry-crop"><path d="M0 0H240V157H202Q120 199 40 157H0Z"/></clipPath>
    <linearGradient id="fry-front"><stop stop-color="var(--front-light)"/><stop offset=".4" stop-color="var(--front)"/><stop offset="1" stop-color="var(--front-dark)"/></linearGradient>
    <linearGradient id="carton-front" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--cup-light)"/><stop offset=".45" stop-color="var(--cup)"/><stop offset="1" stop-color="var(--cup-dark)"/></linearGradient>
    <linearGradient id="carton-back"><stop stop-color="var(--cup-dark)"/><stop offset="1" stop-color="var(--cup)"/></linearGradient>
    <linearGradient id="case" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffc267"/><stop offset=".16" stop-color="#ff9832"/><stop offset=".8" stop-color="#f77821"/><stop offset="1" stop-color="#d85318"/></linearGradient>
    <linearGradient id="chamber" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#72401f"/><stop offset="1" stop-color="#ca7c30"/></linearGradient>
    <radialGradient id="warmth"><stop stop-color="#ffdf60" stop-opacity=".7"/><stop offset="1" stop-color="#ff9e26" stop-opacity="0"/></radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff6cc" stop-opacity=".22"/><stop offset=".5" stop-color="#ffd67a" stop-opacity=".04"/><stop offset="1" stop-color="#fff5d0" stop-opacity=".13"/></linearGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c6956b"/><stop offset=".6" stop-color="#a56d45"/><stop offset="1" stop-color="#d6a778"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6d2a5"/><stop offset="1" stop-color="#dba576"/></linearGradient>
  </defs>`;
  function heat() {
    return `<g class="heat-lines" fill="none" stroke="#ffe6a6" stroke-width="2" stroke-linecap="round">${[0,1,2].map(i=>`<path class="heat-line" style="--delay:${-i*1.1}s" d="M${104+i*38} 103q-9-10 0-20t0-20"/>`).join('')}</g>`;
  }
  function sparks() {
    return `<g class="sparks">${[[62,71],[207,60],[33,147],[215,142],[90,30],[177,28]].map(([x,y],i)=>`<path class="spark" style="--delay:${i*.06}s;--dx:${x<120?-10:10}px;--dy:-18px" transform="translate(${x} ${y})" d="m0-6 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="${i%2?'#ffaf24':'#ffe79c'}"/>`).join('')}</g>`;
  }
  const css = `
    :host{display:block;--cup-light:#ff7142;--cup:#ef4827;--cup-dark:#bc2c1b;--logo:#fff8e4;contain:content}
    :host([theme="cream"]){--cup-light:#fff9e7;--cup:#f9e5c6;--cup-dark:#dfb58c;--logo:#d4743d}
    svg{display:block;width:100%;height:100%;overflow:visible;stroke:none}
    .fry-front{fill:url(#fry-front)}.fry-side{fill:var(--side)}.fry-top{fill:var(--top)}.carton-logo{fill:var(--logo)}
    .fry-front,.fry-side,.fry-top{transition:fill .5s linear}
    .warm-interior,.heat-lines,.indicator{transition:opacity .8s ease}
    .warm-interior{opacity:.04}.indicator{opacity:.35}
    .heat-lines{opacity:0}.heat-line{opacity:0}
    .sparks{pointer-events:none}.spark{opacity:0;transform-box:fill-box;transform-origin:center}
    .bundle,.oven-photo{transform-box:fill-box;transform-origin:50% 100%}
    :host([state="heating"]) .warm-interior{opacity:1}
    :host([state="heating"]) .indicator{opacity:1}
    :host([state="heating"]) .heat-lines{opacity:.7}
    :host([state="heating"]) .heat-line{animation:rise 4.5s ease-in-out var(--delay) infinite}
    :host([state="heating"]) .fry-motion{animation:warm 5s ease-in-out var(--delay) infinite}
    :host([state="heating"]) .oven-photo{animation:warm 5s ease-in-out infinite}
    :host([state="paused"]) .warm-interior{opacity:.12}
    :host([state="paused"]) .fry-motion{transform:translateY(0);transition:transform .6s}
    :host([state="completed"]) .warm-interior{opacity:.8}
    :host([state="completed"]) .bundle{animation:celebrate .85s ease-out both}
    :host([state="completed"]) .oven-photo{animation:celebrate .85s ease-out both}
    :host([state="completed"]) .spark{animation:sparkle 1.1s ease-out var(--delay) both}
    :host([data-resting]) *{animation-play-state:paused!important}
    @keyframes warm{50%{transform:translateY(-.8px)}}
    @keyframes rise{0%,100%{opacity:0;transform:translateY(9px)}35%{opacity:.5}75%{opacity:0;transform:translateY(-16px)}}
    @keyframes celebrate{0%,100%{transform:translateY(0) scale(1)}35%{transform:translateY(-7px) scale(1.025,.99)}65%{transform:translateY(0) scale(1.025,.98)}}
    @keyframes sparkle{0%{opacity:0;translate:0 8px;scale:.5}25%{opacity:1}100%{opacity:0;translate:var(--dx) var(--dy);scale:.7}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.heat-line{display:none}}
  `;
  class FryArt extends HTMLElement {
    static observedAttributes = ['state','progress'];
    constructor(){super();this.attachShadow({mode:'open'});}
    connectedCallback(){
      if(!this.shadowRoot.childElementCount){
        const variant=this.getAttribute('variant')||'carton';
        this.shadowRoot.innerHTML=`<style>${css}</style>${variant==='oven'?this.oven():variant==='task-fry'?`<svg viewBox="0 0 48 220" aria-hidden="true">${defs}${fry([6,8,204,36,0],0)}</svg>`:`<svg viewBox="0 0 240 275" aria-hidden="true">${defs}${variant==='fry'?`<g transform="translate(38 10) scale(1.6)">${fry([30,20,125,28,-8],0)}</g>`:carton()+sparks()}</svg>`}`;
      }
      this.setAttribute('role','img');
      this.sync();
      this.onVisibility=()=>this.toggleAttribute('data-resting',document.hidden||this.offscreen);
      this.observer=new IntersectionObserver(entries=>{this.offscreen=!entries[0].isIntersecting;this.onVisibility();});
      this.observer.observe(this);document.addEventListener('visibilitychange',this.onVisibility);
    }
    disconnectedCallback(){this.observer?.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);}
    attributeChangedCallback(){this.sync();}
    sync(){
      const input=Number(this.getAttribute('progress'));
      const t=Number.isFinite(input)?Math.max(0,Math.min(1,input)):0;
      const palette={
        '--front-light':[[247,242,212],[255,222,116]],'--front':[[234,230,197],[255,187,47]],
        '--front-dark':[[220,215,184],[246,163,27]],'--side':[[195,191,163],[214,130,23]],'--top':[[255,251,229],[255,232,143]]
      };
      for(const [key,[from,to]] of Object.entries(palette))this.style.setProperty(key,mix(from,to,t));
      const labels={ready:'准备开始',heating:'正在加热',paused:'暂停加热',completed:'加热完成'};
      this.setAttribute('aria-label',`${this.getAttribute('variant')==='oven'?'薯条烤箱':'薯条伙伴'}，${labels[this.getAttribute('state')]||labels.ready}，进度 ${Math.round(t*100)}%`);
    }
    setState(state,progress){
      const next=['ready','heating','paused','completed'].includes(state)?state:'ready';
      if(this.getAttribute('state')!==next)this.setAttribute('state',next);
      const value=String(Math.round(Math.max(0,Math.min(1,progress))*1000)/1000);
      if(this.getAttribute('progress')!==value)this.setAttribute('progress',value);
    }
    oven(){return `<svg viewBox="0 0 440 290" aria-hidden="true">${defs}
      <path d="M0 0h440v290H0Z" fill="url(#wall)"/>
      <path d="M0 0h440v5H0Z" fill="#ffe1b5" opacity=".3"/>
      <path d="M341 0v243M18 0v243" stroke="#f1c49b" stroke-width="3" opacity=".17"/>
      <path d="M0 241h440v49H0Z" fill="url(#wood)"/>
      <path d="M0 262h440M92 244l-24 46M310 244l35 46" stroke="#aa754d" opacity=".15"/>
      <ellipse cx="220" cy="258" rx="161" ry="11" fill="#65391e" opacity=".17"/>
      <image class="oven-photo" href="${microwavePhoto}" x="26" y="-5" width="388" height="291" preserveAspectRatio="xMidYMid meet"/>
      <g class="warm-interior"><ellipse cx="220" cy="142" rx="128" ry="78" fill="url(#warmth)"/></g>
      <g transform="translate(55 4)">${heat()}</g>
      <g transform="translate(121 39) scale(.83)">${sparks()}</g>
    </svg>`;}
  }
  customElements.define('fry-art',FryArt);
})();
