import os

# 文件路径列表
file_list = [
]

for file_path in file_list:
    try:
        if os.path.isfile(file_path):  # 确保是文件而不是目录
            os.remove(file_path)
            print(f"已删除文件: {file_path}")
        else:
            print(f"文件不存在或不是普通文件: {file_path}")
    except Exception as e:
        print(f"删除文件时出错: {file_path}，错误: {e}")
