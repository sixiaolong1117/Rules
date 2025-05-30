import hashlib

def calculate_md5(text):
    """计算字符串的MD5值"""
    md5_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
    return md5_hash

def main():
    print("=" * 50)
    print("MD5 字符串计算器")
    print("=" * 50)
    print("输入 'q' 或 'quit' 退出程序\n")
    
    while True:
        # 获取用户输入
        user_input = input("请输入要计算MD5的字符串: ")
        
        # 检查退出命令
        if user_input.lower() in ['q', 'quit']:
            print("\n再见！")
            break
        
        # 计算并显示MD5
        if user_input:
            md5_result = calculate_md5(user_input)
            print(f"MD5值: {md5_result}")
            print("-" * 50)
        else:
            print("输入为空，请输入有效字符串")
            print("-" * 50)

if __name__ == "__main__":
    main()