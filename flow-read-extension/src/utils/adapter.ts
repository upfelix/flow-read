// 微信公众号适配器
export const adaptWeChat = (document: Document): void => {
  if (!window.location.hostname.includes('mp.weixin.qq.com')) return;

  // 1. 净化 DOM：移除无关元素
  const removeSelectors = [
    '#js_pc_qr_code', // PC端二维码
    '.rich_media_area_extra', // 底部推荐
    '.rich_media_tool', // 底部工具栏
    '#js_tags', // 标签
    '.profile_container', // 作者信息卡片（通常已在头部显示，避免重复）
  ];

  removeSelectors.forEach(selector => {
    const els = document.querySelectorAll(selector);
    els.forEach(el => el.remove());
  });

  // 2. 图片懒加载修复
  // 微信公众号图片使用 data-src，需要替换为 src
  const images = document.querySelectorAll('img[data-src]');
  images.forEach((img) => {
    const element = img as HTMLImageElement; // Cast to HTMLImageElement
    const src = element.getAttribute('data-src');
    if (src) {
      element.setAttribute('src', src);
      element.removeAttribute('data-src');
      // 移除其他可能干扰的属性
      element.style.visibility = 'visible';
      element.style.height = 'auto';
    }
  });

  console.log('FlowRead: WeChat OA adaptation applied.');
};
