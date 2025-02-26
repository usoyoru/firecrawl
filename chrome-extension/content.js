// 内容脚本 - 在目标页面上下文中运行

// 存储页面数据
let pageData = {
  tokens: [],
  lastUpdate: null
};

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageData') {
    // 获取当前页面数据
    capturePageData();
    sendResponse({ pageData: pageData });
  } else if (message.action === 'startObserving') {
    startObserving();
    sendResponse({ status: 'Started observing DOM changes' });
  } else if (message.action === 'stopObserving') {
    stopObserving();
    sendResponse({ status: 'Stopped observing DOM changes' });
  }
  return true; // 保持消息通道开放以进行异步响应
});

// 捕获页面数据的函数
function capturePageData() {
  // 更新时间戳
  pageData.lastUpdate = new Date().toISOString();
  
  // 尝试捕获代币列表
  try {
    // 这里的选择器需要根据DexScreener的实际DOM结构调整
    const tokenRows = document.querySelectorAll('table tbody tr');
    const tokens = [];
    
    tokenRows.forEach(row => {
      // 提取每个代币的数据
      const token = {
        name: getTextContent(row.querySelector('[data-column="name"]')),
        price: getTextContent(row.querySelector('[data-column="price"]')),
        priceChange: getTextContent(row.querySelector('[data-column="priceChange"]')),
        volume: getTextContent(row.querySelector('[data-column="volume"]')),
        liquidity: getTextContent(row.querySelector('[data-column="liquidity"]')),
        marketCap: getTextContent(row.querySelector('[data-column="marketCap"]')),
        // 添加更多需要的字段
      };
      
      tokens.push(token);
    });
    
    pageData.tokens = tokens;
    console.log('Captured page data:', pageData);
  } catch (error) {
    console.error('Error capturing page data:', error);
  }
}

// 辅助函数：安全地获取元素的文本内容
function getTextContent(element) {
  return element ? element.textContent.trim() : '';
}

// DOM变化观察器
let observer = null;

// 开始观察DOM变化
function startObserving() {
  if (observer) {
    stopObserving(); // 如果已经在观察，先停止
  }
  
  // 创建一个新的MutationObserver
  observer = new MutationObserver((mutations) => {
    // 当DOM变化时，捕获页面数据
    capturePageData();
    
    // 将数据发送到后台脚本
    chrome.runtime.sendMessage({
      action: 'domChanged',
      pageData: pageData
    });
  });
  
  // 配置观察器
  const config = { 
    childList: true, 
    subtree: true,
    attributes: true,
    characterData: true
  };
  
  // 开始观察整个文档
  observer.observe(document.body, config);
  console.log('Started observing DOM changes');
}

// 停止观察DOM变化
function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
    console.log('Stopped observing DOM changes');
  }
}

// 页面加载完成后自动捕获初始数据
window.addEventListener('load', () => {
  console.log('DexScreener Data Capture content script loaded');
  // 延迟一下，确保页面内容已完全加载
  setTimeout(capturePageData, 2000);
}); 