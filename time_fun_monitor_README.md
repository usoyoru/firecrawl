# Time.fun 创始人数据监控工具

这个项目包含一系列脚本，用于从 time.fun 网站抓取、提取和监控创始人数据。

## 主要功能

- **持续监控**: 定期检查 time.fun 网站上的创始人数据
- **增量更新**: 只处理新增或更新的创始人数据，避免重复处理
- **数据存储**: 将所有数据保存在结构化的JSON文件中
- **日志记录**: 详细记录所有操作和错误信息

## 文件说明

- `monitor_founders.py`: 主要的监控脚本，持续运行并定期检查更新
- `extract_founder_links.py`: 从原始数据中提取创始人链接的脚本
- `founders_with_links.json`: 包含创始人数据和链接的JSON文件
- `founder_links.json`: 包含创始人用户名和链接的JSON文件
- `extracted_founders.json`: 提取的创始人基本数据
- `formatted_founders_data.json`: 格式化后的原始数据

## 安装依赖

```bash
pip install requests
```

## 使用方法

### 运行监控脚本

```bash
python monitor_founders.py
```

这将启动一个持续运行的进程，它会：
1. 每小时检查一次 time.fun 网站上的创始人数据
2. 如果发现新的创始人或数据更新，将其添加到数据库中
3. 所有数据将保存在 `founder_data` 目录下

### 配置

可以在 `monitor_founders.py` 文件中修改以下配置：

- `CHECK_INTERVAL`: 检查间隔时间（秒），默认为3600秒（1小时）
- `DATA_DIR`: 数据存储目录，默认为 "founder_data"

### 数据文件

监控脚本会在 `founder_data` 目录下创建以下文件：

- `all_founders.json`: 所有创始人的完整数据
- `all_links.json`: 所有创始人的链接信息
- `last_check.json`: 最近一次检查的状态信息
- `profiles/`: 包含每个创始人个人页面的HTML文件
- `founders_page_*.html`: 创始人列表页面的HTML快照

## 日志

所有操作和错误信息都会记录在 `founder_monitor.log` 文件中，同时也会输出到控制台。

## 注意事项

- 脚本会自动添加延迟以避免请求过于频繁
- 如果遇到错误，脚本会等待60秒后重试
- 可以通过按 Ctrl+C 来停止脚本运行 