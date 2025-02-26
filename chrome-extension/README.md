# DexScreener Data Capture Chrome扩展

这个Chrome扩展允许您捕获和分析DexScreener网站上的数据，包括网络请求和页面内容。

## 功能

- 捕获所有发送到DexScreener的网络请求和响应
- 提取页面上显示的代币数据
- 实时监控DOM变化
- 导出数据为JSON或CSV格式

## 安装方法

1. 下载或克隆此仓库到本地
2. 打开Chrome浏览器，进入扩展管理页面 (chrome://extensions/)
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择此项目的目录

## 使用方法

1. 安装扩展后，在Chrome工具栏中点击扩展图标
2. 导航到DexScreener网站 (https://dexscreener.com/)
3. 使用扩展的界面控制捕获功能:
   - 网络请求标签页: 捕获所有网络请求
   - 页面数据标签页: 提取和监控页面上的代币数据
4. 使用导出按钮将数据保存为JSON或CSV格式

## 注意事项

- 此扩展仅用于个人研究和学习目的
- 请遵守DexScreener的使用条款和服务条款
- 不要过度频繁地请求数据，以避免被网站封禁

## 自定义

您可以根据需要修改以下文件:
- `content.js`: 调整页面数据提取逻辑
- `background.js`: 修改网络请求捕获逻辑
- `popup.html` 和 `popup.js`: 自定义用户界面

## 许可证

MIT 