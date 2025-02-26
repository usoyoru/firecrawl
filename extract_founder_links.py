import json
import re
import codecs

def extract_founder_links(markdown_text):
    """
    从markdown文本中提取创始人个人页面的链接
    
    Args:
        markdown_text: 包含创始人信息的markdown文本
    
    Returns:
        创始人用户名和对应链接的字典
    """
    # 使用正则表达式匹配创始人链接
    # 格式: Buy Time](https://time.fun/username)
    pattern = r'Buy Time\]\(https://time\.fun/(\w+)\)'
    
    # 查找所有匹配项
    matches = re.finditer(pattern, markdown_text)
    
    # 创建用户名到链接的映射
    founder_links = {}
    
    for match in matches:
        username = match.group(1)
        link = f"https://time.fun/{username}"
        founder_links[username] = link
    
    return founder_links

def main():
    try:
        # 使用utf-16编码打开文件
        with codecs.open('formatted_founders_data.json', 'r', encoding='utf-16') as f:
            data = json.load(f)
        
        if data and data.get('success') and 'data' in data and 'markdown' in data['data']:
            markdown_text = data['data']['markdown']
            
            # 提取创始人链接
            founder_links = extract_founder_links(markdown_text)
            
            # 打印结果
            print(f"找到 {len(founder_links)} 个创始人页面链接:")
            for username, link in founder_links.items():
                print(f"{username}: {link}")
            
            # 保存链接到文件
            with open('founder_links.json', 'w', encoding='utf-8') as f:
                json.dump(founder_links, f, indent=4, ensure_ascii=False)
            
            print(f"\n链接已保存到 founder_links.json")
            
            # 加载之前提取的创始人数据
            try:
                with open('extracted_founders.json', 'r', encoding='utf-8') as f:
                    founders = json.load(f)
                
                # 为每个创始人添加个人页面链接
                for founder in founders:
                    username = founder['username']
                    if username in founder_links:
                        founder['profile_url'] = founder_links[username]
                
                # 保存更新后的创始人数据
                with open('founders_with_links.json', 'w', encoding='utf-8') as f:
                    json.dump(founders, f, indent=4, ensure_ascii=False)
                
                print(f"已将链接添加到创始人数据并保存到 founders_with_links.json")
            
            except Exception as e:
                print(f"处理创始人数据时出错: {e}")
        
        else:
            print("JSON文件格式不符合预期或无法解析")
    
    except Exception as e:
        print(f"处理文件时出错: {e}")

if __name__ == "__main__":
    main() 