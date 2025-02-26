// 存储捕获的请求数据
let capturedRequests = [];
let isCapturing = false;

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCapture') {
    isCapturing = true;
    capturedRequests = [];
    console.log('Started capturing requests');
    sendResponse({ status: 'Capture started' });
  } else if (message.action === 'stopCapture') {
    isCapturing = false;
    console.log('Stopped capturing requests');
    sendResponse({ status: 'Capture stopped', count: capturedRequests.length });
  } else if (message.action === 'getRequests') {
    sendResponse({ requests: capturedRequests });
  } else if (message.action === 'clearRequests') {
    capturedRequests = [];
    sendResponse({ status: 'Requests cleared' });
  }
  return true; // 保持消息通道开放以进行异步响应
});

// 监听网络请求
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isCapturing && details.url.includes('dexscreener.com')) {
      let requestData = {
        url: details.url,
        method: details.method,
        timestamp: new Date().toISOString(),
        type: details.type,
        requestId: details.requestId
      };
      
      // 如果是POST请求，尝试捕获请求体
      if (details.method === 'POST' && details.requestBody) {
        if (details.requestBody.raw) {
          // 处理原始请求体数据
          const encoder = new TextDecoder('utf-8');
          const rawData = details.requestBody.raw.map(chunk => {
            return encoder.decode(new Uint8Array(chunk.bytes));
          }).join('');
          requestData.requestBody = rawData;
        } else if (details.requestBody.formData) {
          // 处理表单数据
          requestData.requestBody = details.requestBody.formData;
        }
      }
      
      capturedRequests.push(requestData);
      console.log('Captured request:', requestData);
    }
  },
  { urls: ["https://dexscreener.com/*"] },
  ["requestBody"]
);

// 监听网络响应
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (isCapturing && details.url.includes('dexscreener.com')) {
      // 查找对应的请求
      const requestIndex = capturedRequests.findIndex(req => req.requestId === details.requestId);
      if (requestIndex !== -1) {
        // 更新请求对象，添加响应信息
        capturedRequests[requestIndex].responseStatus = details.statusCode;
        capturedRequests[requestIndex].responseHeaders = details.responseHeaders;
        console.log('Updated request with response:', capturedRequests[requestIndex]);
      }
    }
  },
  { urls: ["https://dexscreener.com/*"] },
  ["responseHeaders"]
); 