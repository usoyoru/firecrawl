import requests
import json
import os
import time
import codecs
import re
import logging
import sys
from datetime import datetime

# 配置日志 - 修复中文编码问题
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("founder_monitor.log", encoding='utf-8'),
        # 使用StreamHandler时设置编码为utf-8
        logging.StreamHandler(stream=sys.stdout)
    ]
)

# 全局变量
DATA_DIR = "founder_data"
FOUNDERS_FILE = os.path.join(DATA_DIR, "all_founders.json")
LINKS_FILE = os.path.join(DATA_DIR, "all_links.json")
LAST_CHECK_FILE = os.path.join(DATA_DIR, "last_check.json")
CHECK_INTERVAL = 3600  # 默认每小时检查一次

def setup():
    """初始化目录和文件"""
    # 创建数据目录
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # 初始化文件
    if not os.path.exists(FOUNDERS_FILE):
        # 如果存在旧的数据文件，则导入
        if os.path.exists("founders_with_links.json"):
            with open("founders_with_links.json", "r", encoding="utf-8") as f:
                founders = json.load(f)
            with open(FOUNDERS_FILE, "w", encoding="utf-8") as f:
                json.dump(founders, f, indent=4, ensure_ascii=False)
            logging.info(f"Imported {len(founders)} founders from existing file")
        else:
            with open(FOUNDERS_FILE, "w", encoding="utf-8") as f:
                json.dump([], f, indent=4)
            logging.info("Created new founders data file")
    
    if not os.path.exists(LINKS_FILE):
        # 如果存在旧的链接文件，则导入
        if os.path.exists("founder_links.json"):
            with open("founder_links.json", "r", encoding="utf-8") as f:
                links = json.load(f)
            with open(LINKS_FILE, "w", encoding="utf-8") as f:
                json.dump(links, f, indent=4, ensure_ascii=False)
            logging.info(f"Imported {len(links)} founder links from existing file")
        else:
            with open(LINKS_FILE, "w", encoding="utf-8") as f:
                json.dump({}, f, indent=4)
            logging.info("Created new founder links file")
    
    if not os.path.exists(LAST_CHECK_FILE):
        with open(LAST_CHECK_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "last_check_time": datetime.now().isoformat(),
                "last_check_status": "Initialized",
                "total_founders": 0,
                "total_updates": 0
            }, f, indent=4)
        logging.info("Created new check record file")

def get_founders_page():
    """获取创始人列表页面"""
    url = "https://time.fun/explore/Founders"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            # 保存原始HTML
            html_file = os.path.join(DATA_DIR, f"founders_page_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html")
            with open(html_file, "w", encoding="utf-8") as f:
                f.write(response.text)
            logging.info(f"Successfully fetched founders page and saved to {html_file}")
            return response.text
        else:
            logging.error(f"Failed to fetch founders page: HTTP {response.status_code}")
            return None
    except Exception as e:
        logging.error(f"Error fetching founders page: {e}")
        return None

def extract_founder_links(html_content):
    """从HTML内容中提取创始人链接"""
    # 使用正则表达式匹配创始人链接
    pattern = r'href="(https://time\.fun/(\w+))"[^>]*>([^<]+)</a>'
    
    # 查找所有匹配项
    matches = re.finditer(pattern, html_content)
    
    # 创建用户名到链接的映射
    founder_links = {}
    
    for match in matches:
        full_url = match.group(1)
        username = match.group(2)
        link_text = match.group(3).strip()
        
        # 排除非创始人页面的链接
        if username in ["explore", "about", "login", "signup"]:
            continue
            
        founder_links[username] = {
            "url": full_url,
            "text": link_text,
            "found_time": datetime.now().isoformat()
        }
    
    return founder_links

def get_founder_profile(username, url):
    """获取单个创始人的个人资料页面"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            # 保存原始HTML
            profile_dir = os.path.join(DATA_DIR, "profiles")
            os.makedirs(profile_dir, exist_ok=True)
            
            html_file = os.path.join(profile_dir, f"{username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html")
            with open(html_file, "w", encoding="utf-8") as f:
                f.write(response.text)
            
            logging.info(f"Successfully fetched profile for {username} and saved to {html_file}")
            
            # 提取个人资料信息
            profile_data = extract_profile_data(username, response.text)
            return profile_data
        else:
            logging.error(f"Failed to fetch profile for {username}: HTTP {response.status_code}")
            return None
    except Exception as e:
        logging.error(f"Error fetching profile for {username}: {e}")
        return None

def extract_profile_data(username, html_content):
    """从HTML内容中提取创始人个人资料信息"""
    profile_data = {
        "username": username,
        "last_updated": datetime.now().isoformat()
    }
    
    try:
        # 提取名称
        name_match = re.search(r'<h1[^>]*>(.*?)</h1>', html_content)
        if name_match:
            profile_data["name"] = name_match.group(1).strip()
        
        # 提取简介
        bio_match = re.search(r'data-testid="bio"[^>]*>(.*?)</div>', html_content)
        if bio_match:
            profile_data["bio"] = bio_match.group(1).strip()
        
        # 提取价格
        price_match = re.search(r'data-testid="price-value"[^>]*>\$([\d\.]+)</span>', html_content)
        if price_match:
            profile_data["price_per_min"] = float(price_match.group(1))
        
        # 提取价格变动
        change_match = re.search(r'data-testid="price-change"[^>]*>([\+\-\d\.]+)%</span>', html_content)
        if change_match:
            profile_data["price_change"] = change_match.group(1)
        
        # 提取头像URL
        avatar_match = re.search(r'<img[^>]*alt="[^"]*profile[^"]*"[^>]*src="([^"]+)"', html_content)
        if avatar_match:
            profile_data["avatar_url"] = avatar_match.group(1)
        
        return profile_data
    
    except Exception as e:
        logging.error(f"Error extracting profile data for {username}: {e}")
        return profile_data  # 返回可能不完整的数据

def update_founder_data(new_links):
    """更新创始人数据"""
    # 加载现有数据
    with open(FOUNDERS_FILE, "r", encoding="utf-8") as f:
        founders = json.load(f)
    
    with open(LINKS_FILE, "r", encoding="utf-8") as f:
        existing_links = json.load(f)
    
    # 创建用户名到创始人数据的映射
    founders_map = {founder["username"]: founder for founder in founders}
    
    # 跟踪更新和新增的数量
    updates_count = 0
    new_count = 0
    
    # 处理每个链接
    for username, link_data in new_links.items():
        # 检查是否是新链接
        is_new_link = username not in existing_links
        
        # 更新链接数据
        existing_links[username] = link_data
        
        # 如果是新链接或者需要更新现有数据
        if is_new_link or username not in founders_map:
            logging.info(f"Fetching profile data for {username}...")
            profile_data = get_founder_profile(username, link_data["url"])
            
            if profile_data:
                if username in founders_map:
                    # 更新现有数据
                    founders_map[username].update(profile_data)
                    updates_count += 1
                    logging.info(f"Updated data for {username}")
                else:
                    # 添加新数据
                    profile_data["profile_url"] = link_data["url"]
                    founders.append(profile_data)
                    founders_map[username] = profile_data
                    new_count += 1
                    logging.info(f"Added new founder {username}")
            
            # 添加延迟，避免请求过于频繁
            time.sleep(2)
    
    # 保存更新后的数据
    with open(FOUNDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(founders, f, indent=4, ensure_ascii=False)
    
    with open(LINKS_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_links, f, indent=4, ensure_ascii=False)
    
    # 更新检查记录
    with open(LAST_CHECK_FILE, "r", encoding="utf-8") as f:
        check_data = json.load(f)
    
    check_data.update({
        "last_check_time": datetime.now().isoformat(),
        "last_check_status": "Success",
        "total_founders": len(founders),
        "new_founders": new_count,
        "updated_founders": updates_count
    })
    
    with open(LAST_CHECK_FILE, "w", encoding="utf-8") as f:
        json.dump(check_data, f, indent=4, ensure_ascii=False)
    
    return new_count, updates_count

def main_loop():
    """主循环，定期检查和更新数据"""
    setup()
    
    while True:
        try:
            logging.info("Starting to check founders data...")
            
            # 获取创始人页面
            html_content = get_founders_page()
            
            if html_content:
                # 提取链接
                new_links = extract_founder_links(html_content)
                logging.info(f"Extracted {len(new_links)} founder links from page")
                
                # 更新数据
                new_count, updates_count = update_founder_data(new_links)
                logging.info(f"Update completed: Added {new_count} new founders, updated {updates_count} founder profiles")
            
            # 等待下一次检查
            logging.info(f"Waiting {CHECK_INTERVAL} seconds for next check...")
            time.sleep(CHECK_INTERVAL)
            
        except KeyboardInterrupt:
            logging.info("Received interrupt signal, exiting program")
            break
        except Exception as e:
            logging.error(f"Error in main loop: {e}")
            logging.info("Waiting 60 seconds before retry...")
            time.sleep(60)

if __name__ == "__main__":
    main_loop() 