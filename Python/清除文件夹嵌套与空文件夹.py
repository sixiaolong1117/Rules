import os
import shutil
import argparse

def merge_folders(src, dst):
    """
    将 src 文件夹内容合并到 dst 文件夹，如果文件已存在则自动重命名
    """
    if not os.path.exists(dst):
        shutil.move(src, dst)
        return
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        if os.path.isdir(s):
            merge_folders(s, d)
        else:
            # 如果文件已存在，则重命名
            if os.path.exists(d):
                base, ext = os.path.splitext(item)
                counter = 1
                while True:
                    new_name = f"{base}_{counter}{ext}"
                    new_d = os.path.join(dst, new_name)
                    if not os.path.exists(new_d):
                        d = new_d
                        break
                    counter += 1
            shutil.move(s, d)
    # 删除空源文件夹
    if os.path.exists(src) and len(os.listdir(src)) == 0:
        os.rmdir(src)

def promote_single_folder(path):
    if not os.path.isdir(path):
        print(f"{path} 不是一个有效目录")
        return

    changed = True
    while changed:
        changed = False
        # 先收集所有需要提升的文件夹
        to_promote = []
        for root, dirs, files in os.walk(path, topdown=False):
            if len(dirs) == 1 and len(files) == 0:
                single_dir = dirs[0]
                src = os.path.join(root, single_dir)
                dst = os.path.join(os.path.dirname(root), single_dir)
                if src != dst:
                    to_promote.append((src, dst))
        # 统一处理提升
        for src, dst in to_promote:
            print(f"提升: {src} -> {dst}")
            merge_folders(src, dst)
            changed = True
        # 删除所有空文件夹
        for root, dirs, files in os.walk(path, topdown=False):
            if len(os.listdir(root)) == 0:
                print(f"删除空文件夹: {root}")
                os.rmdir(root)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="提升单一子文件夹并清理空文件夹")
    parser.add_argument("folder", nargs="?", default="./", help="目标目录，默认为当前目录")
    args = parser.parse_args()

    promote_single_folder(args.folder)
