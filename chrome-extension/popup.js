// 全局变量
let activeTab = null;
let capturedRequests = [];
let pageData = { tokens: [], lastUpdate: null };
let isCapturing = false;
let isObserving = false;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前活动标签页
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tabs[0];
  
  // 初始化UI元素
  initTabs();
  initRequestCapture();
  initPageDataCapture();
  initExportButtons();
});

// 初始化标签页切换
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 移除所有活动状态
      tabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // 设置当前活动标签
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab') + '-tab';
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// 初始化请求捕获功能
function initRequestCapture() {
  const startCaptureBtn = document.getElementById('start-capture');
  const stopCaptureBtn = document.getElementById('stop-capture');
  const clearDataBtn = document.getElementById('clear-data');
  const requestStatus = document.getElementById('request-status');
  const requestDataContainer = document.getElementById('request-data');
  
  // 开始捕获
  startCaptureBtn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ action: 'startCapture' });
    isCapturing = true;
    requestStatus.textContent = '状态: 正在捕获请求...';
    startCaptureBtn.disabled = true;
    stopCaptureBtn.disabled = false;
  });
  
  // 停止捕获
  stopCaptureBtn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ action: 'stopCapture' });
    isCapturing = false;
    requestStatus.textContent = `状态: 已停止捕获 (共 ${response.count} 个请求)`;
    startCaptureBtn.disabled = false;
    stopCaptureBtn.disabled = true;
    
    // 获取并显示捕获的请求
    updateRequestData();
  });
  
  // 清除数据
  clearDataBtn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ action: 'clearRequests' });
    capturedRequests = [];
    requestDataContainer.innerHTML = '<p>捕获的请求将显示在这里...</p>';
    requestStatus.textContent = '状态: 数据已清除';
  });
  
  // 更新请求数据显示
  async function updateRequestData() {
    const response = await chrome.runtime.sendMessage({ action: 'getRequests' });
    capturedRequests = response.requests;
    
    if (capturedRequests.length === 0) {
      requestDataContainer.innerHTML = '<p>没有捕获到请求...</p>';
      return;
    }
    
    // 创建请求列表
    let html = '<ul style="list-style-type: none; padding: 0;">';
    capturedRequests.forEach((req, index) => {
      const url = new URL(req.url);
      html += `
        <li style="margin-bottom: 10px; padding: 8px; background-color: #f9f9f9; border-radius: 4px;">
          <div><strong>请求 #${index + 1}</strong> (${req.method} ${req.type})</div>
          <div style="word-break: break-all;"><small>${url.pathname}${url.search}</small></div>
          <div>状态: ${req.responseStatus || '等待响应'}</div>
          <button class="details-btn" data-index="${index}">查看详情</button>
        </li>
      `;
    });
    html += '</ul>';
    
    requestDataContainer.innerHTML = html;
    
    // 添加详情按钮事件
    document.querySelectorAll('.details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        showRequestDetails(capturedRequests[index]);
      });
    });
  }
  
  // 显示请求详情
  function showRequestDetails(request) {
    const detailsWindow = window.open('', '_blank', 'width=800,height=600');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>请求详情</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
        </style>
      </head>
      <body>
        <h2>请求详情</h2>
        <p><strong>URL:</strong> ${request.url}</p>
        <p><strong>方法:</strong> ${request.method}</p>
        <p><strong>类型:</strong> ${request.type}</p>
        <p><strong>时间:</strong> ${request.timestamp}</p>
        <p><strong>状态码:</strong> ${request.responseStatus || '未知'}</p>
        
        <h3>请求体</h3>
        <pre>${request.requestBody ? JSON.stringify(request.requestBody, null, 2) : '无请求体'}</pre>
        
        <h3>响应头</h3>
        <pre>${request.responseHeaders ? JSON.stringify(request.responseHeaders, null, 2) : '无响应头'}</pre>
      </body>
      </html>
    `;
    
    detailsWindow.document.write(html);
  }
}

// 初始化页面数据捕获功能
function initPageDataCapture() {
  const getPageDataBtn = document.getElementById('get-page-data');
  const startObservingBtn = document.getElementById('start-observing');
  const stopObservingBtn = document.getElementById('stop-observing');
  const pageStatus = document.getElementById('page-status');
  const pageDataContainer = document.getElementById('page-data-container');
  
  // 获取页面数据
  getPageDataBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'getPageData' });
      pageData = response.pageData;
      updatePageDataDisplay();
      pageStatus.textContent = `状态: 数据已获取 (${new Date().toLocaleTimeString()})`;
    } catch (error) {
      pageStatus.textContent = '状态: 无法获取数据，请确保您在DexScreener页面上';
      console.error('Error getting page data:', error);
    }
  });
  
  // 开始观察DOM变化
  startObservingBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'startObserving' });
      isObserving = true;
      pageStatus.textContent = '状态: 正在观察DOM变化...';
      startObservingBtn.disabled = true;
      stopObservingBtn.disabled = false;
    } catch (error) {
      pageStatus.textContent = '状态: 无法开始观察，请确保您在DexScreener页面上';
      console.error('Error starting observation:', error);
    }
  });
  
  // 停止观察DOM变化
  stopObservingBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'stopObserving' });
      isObserving = false;
      pageStatus.textContent = '状态: 已停止观察DOM变化';
      startObservingBtn.disabled = false;
      stopObservingBtn.disabled = true;
    } catch (error) {
      pageStatus.textContent = '状态: 无法停止观察';
      console.error('Error stopping observation:', error);
    }
  });
  
  // 监听来自内容脚本的DOM变化消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'domChanged') {
      pageData = message.pageData;
      updatePageDataDisplay();
      pageStatus.textContent = `状态: DOM已更新 (${new Date().toLocaleTimeString()})`;
    }
  });
  
  // 更新页面数据显示
  function updatePageDataDisplay() {
    if (!pageData || !pageData.tokens || pageData.tokens.length === 0) {
      pageDataContainer.innerHTML = '<p>没有可用的页面数据...</p>';
      return;
    }
    
    // 创建表格显示代币数据
    let html = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">名称</th>
            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">价格</th>
            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">变化</th>
            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">流动性</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    pageData.tokens.forEach(token => {
      html += `
        <tr>
          <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">${token.name || 'N/A'}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee;">${token.price || 'N/A'}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee;">${token.priceChange || 'N/A'}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee;">${token.liquidity || 'N/A'}</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
      <p><small>最后更新: ${pageData.lastUpdate ? new Date(pageData.lastUpdate).toLocaleString() : 'N/A'}</small></p>
    `;
    
    pageDataContainer.innerHTML = html;
  }
}

// 初始化导出按钮
function initExportButtons() {
  const exportJsonBtn = document.getElementById('export-json');
  const exportCsvBtn = document.getElementById('export-csv');
  
  // 导出为JSON
  exportJsonBtn.addEventListener('click', () => {
    const activeTabId = document.querySelector('.tab-button.active').getAttribute('data-tab');
    let dataToExport = {};
    
    if (activeTabId === 'requests') {
      dataToExport = { requests: capturedRequests };
    } else if (activeTabId === 'page-data') {
      dataToExport = pageData;
    }
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    downloadFile(jsonString, 'dexscreener-data.json', 'application/json');
  });
  
  // 导出为CSV
  exportCsvBtn.addEventListener('click', () => {
    const activeTabId = document.querySelector('.tab-button.active').getAttribute('data-tab');
    let csvContent = '';
    
    if (activeTabId === 'requests') {
      // 请求数据转CSV
      csvContent = 'URL,Method,Type,Timestamp,Status\n';
      capturedRequests.forEach(req => {
        csvContent += `"${req.url}","${req.method}","${req.type}","${req.timestamp}","${req.responseStatus || ''}"\n`;
      });
    } else if (activeTabId === 'page-data' && pageData.tokens.length > 0) {
      // 页面数据转CSV
      const headers = Object.keys(pageData.tokens[0]).join(',');
      csvContent = headers + '\n';
      
      pageData.tokens.forEach(token => {
        const values = Object.values(token).map(value => `"${value || ''}"`).join(',');
        csvContent += values + '\n';
      });
    }
    
    if (csvContent) {
      downloadFile(csvContent, 'dexscreener-data.csv', 'text/csv');
    }
  });
  
  // 下载文件的辅助函数
  function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
} 