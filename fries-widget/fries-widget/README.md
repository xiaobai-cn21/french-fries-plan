# 薯条盒 Hover 组件 · 接入包

一盒薯条，每根都是独立可交互对象：鼠标悬停到某根薯条，仅该薯条产生金黄色外发光（并以其中心放大 1.08 倍、轻微上浮，200ms ease-out，移出恢复）。无任何依赖，普通 `<script>` 引入即用，file:// 或 http(s) 环境均可运行。

## 文件清单

```
fries-widget/
├── README.md           本说明
├── demo.html           完整示例（双击即可查看效果）
├── fries-hover.js      组件脚本（自动注入所需样式）
└── images/
    ├── fries.png       干净底图（396×502）
    ├── fries-data.js   像素级命中数据（自动加载，请勿手改）
    └── fry_01.png ~ fry_11.png   每根薯条的透明图层（11 根）
```

## 快速接入（3 行）

```html
<div id="fries-box"></div>
<script src="fries-hover.js"></script>
<script>FriesHover.mount('#fries-box');</script>
```

`images/` 文件夹需与 `fries-hover.js` 保持相对位置（整体拷贝 `fries-widget/` 即可）；
若素材部署在别的路径，传入 `basePath`（以 `/` 结尾）：

```js
FriesHover.mount('#fries-box', { basePath: '/static/fries/' });
```

## API

```js
FriesHover.mount(target, options) → Promise<Api>
```

- **target**：容器选择器或 DOM 元素。容器宽度决定薯条盒大小（宽高比固定 396:502，高度自动）。
- **options.basePath**：素材目录，默认自动取 `fries-hover.js` 所在目录。
- **options.onHover**：`function (fryId | null)`，悬停/移出时回调。编号 1~11，按从上到下、从左到右排列。
- **Api.setActive(id)**：手动点亮某根（传 0 恢复全部），可用于联动抽签等流程。
- 同一页面可挂载多个实例，互不影响。

## 交互说明

- 悬停命中按薯条轮廓逐像素判定（每根的红色边界线划分已编译进 `fries-data.js` 的编号表），薯条相互重叠时命中最上层可见区域。
- 触屏设备无 hover：点按哪根哪根亮。
- 发光颜色、放大倍率等样式集中在 `fries-hover.js` 顶部的 `STYLE` 常量里，可自行调整。

## 验证

`demo.html?hover=N` 可强制第 N 根进入悬停态，便于回归检查。
