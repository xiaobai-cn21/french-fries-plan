/*!
 * 薯条计划 · 薯条盒对象级 Hover 组件（无依赖）
 *
 * 快速接入：
 *   <div id="fries-box"></div>
 *   <script src="fries-hover.js"></script>
 *   <script>
 *     FriesHover.mount('#fries-box', {
 *       onHover: function (fryId) { console.log(fryId ? '第 ' + fryId + ' 根' : '移出'); }
 *     });
 *   </script>
 *
 * 说明：
 *   - 素材默认相对本脚本所在目录的 images/ 子目录加载，保持文件夹结构整体拷贝即可；
 *     若路径不同，可在 options.basePath 传入素材目录（以 / 结尾）。
 *   - 命中检测使用像素级区域编号表（images/fries-data.js，自动加载），精确到薯条轮廓。
 *   - 悬停：仅该薯条金黄色外发光 + 中心放大 1.08 倍 + 上浮，200ms ease-out；移出恢复。
 *   - 触屏设备：点按哪根哪根亮。
 */
(function () {
  'use strict';

  var styleInjected = false;
  var STYLE =
    '.fries-hover{position:relative;width:100%;aspect-ratio:396/502;user-select:none;' +
    '-webkit-user-select:none;touch-action:manipulation;}' +
    '.fries-hover img{display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}' +
    '.fries-hover .fries-layer{transform-origin:var(--ox) var(--oy);z-index:1;' +
    'transition:transform 200ms ease-out,filter 200ms ease-out;will-change:transform,filter;}' +
    '.fries-hover .fries-layer.active{z-index:10;transform:translateY(-6px) scale(1.08);' +
    'filter:drop-shadow(0 0 3px rgba(255,210,80,.95)) drop-shadow(0 0 12px rgba(255,170,30,.85));}' +
    '.fries-hover.fries-over{cursor:pointer;}';

  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var st = document.createElement('style');
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  function detectBase() {
    var s = document.querySelector('script[src$="fries-hover.js"]');
    return s ? s.src.replace(/[^/]*$/, '') : '';
  }

  var dataPromise = null;
  function loadData(base) {
    if (window.FRIES_DATA) return Promise.resolve(window.FRIES_DATA);
    if (!dataPromise) {
      dataPromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = base + 'images/fries-data.js';
        s.onload = function () {
          if (window.FRIES_DATA) resolve(window.FRIES_DATA);
          else reject(new Error('FriesHover: fries-data.js 未定义 FRIES_DATA'));
        };
        s.onerror = function () { reject(new Error('FriesHover: 无法加载 ' + s.src)); };
        document.head.appendChild(s);
      });
    }
    return dataPromise;
  }

  function decodeMap(b64) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  /**
   * 挂载薯条盒
   * @param {string|Element} target 容器选择器或元素（宽度决定薯条盒大小，宽高比 396:502）
   * @param {Object}  [options]     { basePath?: string, onHover?: (fryId: number|null) => void }
   * @returns {Promise<{setActive: (id:number)=>void, fries: Array, el: Element}>}
   */
  function mount(target, options) {
    options = options || {};
    var base = options.basePath !== undefined ? options.basePath : detectBase();
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return Promise.reject(new Error('FriesHover: 容器不存在: ' + target));

    injectStyle();
    el.classList.add('fries-hover');

    var baseImg = document.createElement('img');
    baseImg.className = 'fries-base';
    baseImg.alt = '一盒薯条';
    baseImg.draggable = false;
    baseImg.src = base + 'images/fries.png';
    el.appendChild(baseImg);

    return loadData(base).then(function (DATA) {
      var W = DATA.w, H = DATA.h;
      var map = decodeMap(DATA.map);
      var layers = {};

      DATA.fries.forEach(function (f) {
        var img = document.createElement('img');
        img.className = 'fries-layer';
        img.alt = '';
        img.draggable = false;
        img.src = base + 'images/fry_' + String(f.id).padStart(2, '0') + '.png';
        img.style.setProperty('--ox', (f.cx / W * 100).toFixed(2) + '%');
        img.style.setProperty('--oy', (f.cy / H * 100).toFixed(2) + '%');
        el.appendChild(img);
        layers[f.id] = img;
      });

      var active = 0;
      function setActive(id) {
        id = +id || 0;
        if (id === active) return;
        if (layers[active]) layers[active].classList.remove('active');
        active = id;
        if (layers[id]) layers[id].classList.add('active');
        if (options.onHover) options.onHover(id || null);
      }
      function pick(e) {
        var r = el.getBoundingClientRect();
        var ix = Math.floor((e.clientX - r.left) / r.width * W);
        var iy = Math.floor((e.clientY - r.top) / r.height * H);
        if (ix < 0 || iy < 0 || ix >= W || iy >= H) return 0;
        return map[iy * W + ix];
      }

      el.addEventListener('pointermove', function (e) {
        var id = pick(e);
        setActive(id);
        el.classList.toggle('fries-over', !!id);
      });
      el.addEventListener('pointerleave', function () {
        setActive(0);
        el.classList.remove('fries-over');
      });
      el.addEventListener('pointerdown', function (e) { setActive(pick(e)); });

      return { setActive: setActive, fries: DATA.fries, el: el };
    });
  }

  window.FriesHover = { mount: mount };
})();
