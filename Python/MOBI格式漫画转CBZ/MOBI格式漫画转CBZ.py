import subprocess
import os
import zipfile
import shutil
import argparse

def extract_cover(mobi_file, cover_file):
    """使用 ebook-meta 提取封面"""
    cmd = ["ebook-meta", mobi_file, "--get-cover", cover_file]
    subprocess.run(cmd, check=True)

def convert_mobi_to_cbz(input_file, output_path=None):
    if not os.path.isfile(input_file):
        print(f"错误: 输入文件不存在: {input_file}")
        return

    if output_path is None:
        output_path = os.path.dirname(input_file)

    base_name = os.path.splitext(os.path.basename(input_file))[0]
    temp_zip_path = os.path.join(output_path, f"{base_name}.zip")
    cbz_path = os.path.join(output_path, f"{base_name}.cbz")
    cover_file = os.path.join(output_path, "cover.jpg")
    temp_extract_dir = os.path.join(output_path, f"{base_name}_temp")

    # 1. 提取封面
    extract_cover(input_file, cover_file)

    # 2. 转 ZIP（CBZ）
    cmd = ["ebook-convert.exe", input_file, temp_zip_path]
    subprocess.run(cmd, check=True)

    # 3. 解压 ZIP 到临时文件夹
    if os.path.exists(temp_extract_dir):
        shutil.rmtree(temp_extract_dir)
    os.makedirs(temp_extract_dir)

    with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
        zip_ref.extractall(temp_extract_dir)

    # 4. 找到顶层目录（通常是 *_files）
    top_dirs = [d for d in os.listdir(temp_extract_dir) if os.path.isdir(os.path.join(temp_extract_dir, d))]
    if len(top_dirs) != 1:
        raise Exception("无法确定顶层目录")
    top_dir_path = os.path.join(temp_extract_dir, top_dirs[0])

    # 5. 把封面放到顶层目录同级目录（CBZ 根目录）
    shutil.move(cover_file, os.path.join(temp_extract_dir, "cover.jpg"))

    # 6. 重新压缩为 CBZ
    with zipfile.ZipFile(cbz_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # 遍历顶层文件夹，展开到 CBZ 根目录
        for root, dirs, files in os.walk(top_dir_path):
            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, top_dir_path)
                zipf.write(abs_path, os.path.join("images", rel_path) if rel_path.lower().endswith((".jpg", ".png")) else rel_path)
        # 添加封面到根目录
        zipf.write(os.path.join(temp_extract_dir, "cover.jpg"), "cover.jpg")

    # 7. 清理临时文件夹和中间 ZIP
    shutil.rmtree(temp_extract_dir)
    os.remove(temp_zip_path)

    print(f"转换完成: {cbz_path}")

def main():
    parser = argparse.ArgumentParser(description="将 MOBI 转为 CBZ，封面放到根目录")
    parser.add_argument("input_file", help="输入 MOBI 文件路径")
    parser.add_argument("-o", "--output", help="输出路径（可选，默认同输入文件目录）")
    args = parser.parse_args()

    convert_mobi_to_cbz(args.input_file, args.output)

if __name__ == "__main__":
    main()
