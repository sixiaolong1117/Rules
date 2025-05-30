import os
import sys
import hashlib
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image, ImageDraw, ImageFont
import cv2
import numpy as np

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif'}
VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv'}

# ------------------- 哈希函数 -------------------
def compute_md5(file_path, chunk_size=1024*1024):
    """计算文件的全量 MD5"""
    print(f"[MD5] 正在计算: {file_path}")
    md5 = hashlib.md5()
    try:
        with open(file_path, 'rb') as f:
            while chunk := f.read(chunk_size):
                md5.update(chunk)
    except OSError as e:
        print(f"[错误] 无法读取文件 {file_path}: {e}")
        return None
    return md5.hexdigest()

def quick_hash(file_path, sample_size=4096):
    """对文件头尾采样，生成快速哈希"""
    print(f"[QuickHash] 正在计算: {file_path}")
    hasher = hashlib.md5()
    try:
        with open(file_path, 'rb') as f:
            start = f.read(sample_size)
            hasher.update(start)
            if os.path.getsize(file_path) > sample_size:
                f.seek(-sample_size, os.SEEK_END)
                end = f.read(sample_size)
                hasher.update(end)
    except Exception as e:
        print(f"[错误] 无法读取文件 {file_path}: {e}")
        return None
    return hasher.hexdigest()

# ------------------- 查找重复文件 -------------------
def find_duplicate_files(root='.', workers=4):
    size_map = {}
    total_scanned = 0
    print(f"[扫描] 开始遍历目录: {root}")
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            try:
                size = os.path.getsize(file_path)
            except OSError:
                continue
            total_scanned += size
            sys.stdout.write(f"\r[扫描] 已扫描文件总大小：{total_scanned / (1024*1024):.2f} MB")
            sys.stdout.flush()
            size_map.setdefault(size, []).append(file_path)
    print("\n[扫描] 遍历完成。")

    duplicates = {}
    quick_only_diff_md5 = {}

    for size, files in size_map.items():
        if len(files) < 2:
            continue
        quick_map = {}
        for file_path in files:
            qh = quick_hash(file_path)
            if not qh:
                continue
            quick_map.setdefault(qh, []).append(file_path)

        for qh, candidates in quick_map.items():
            if len(candidates) < 2:
                continue

            print(f"[验证] 快速哈希一致 ({qh}) 的文件组，共 {len(candidates)} 个文件，需要计算 MD5")
            md5_map = {}
            with ThreadPoolExecutor(max_workers=workers) as executor:
                future_to_file = {executor.submit(compute_md5, fp): fp for fp in candidates}
                for future in as_completed(future_to_file):
                    file_path = future_to_file[future]
                    file_md5 = future.result()
                    if not file_md5:
                        continue
                    md5_map.setdefault(file_md5, []).append(file_path)

            if len(md5_map) == 1:
                # 所有MD5相同
                for file_list in md5_map.values():
                    if len(file_list) > 1:
                        duplicates.setdefault(size, []).extend(file_list)
                        print(f"[结果] MD5 完全相同文件组 ({len(file_list)} 个) 记录完成")
            else:
                # 快速哈希相同，但 MD5 不同
                flat_list = [fp for lst in md5_map.values() for fp in lst]
                quick_only_diff_md5.setdefault(qh, flat_list)
                print(f"[结果] 快速哈希相同但 MD5 不同文件组 ({len(flat_list)} 个) 记录完成")

    # 去重
    for size in duplicates:
        duplicates[size] = list(set(duplicates[size]))

    return duplicates, quick_only_diff_md5

# ------------------- 视频抽帧 -------------------
def extract_video_frames(video_path, frame_count=16, error_files=None):
    """
    从视频平均抽取 frame_count 帧
    遇到损坏帧或解码失败用黑屏代替
    error_files: dict，用于记录损坏文件 {file_path: 错误描述}
    """
    print(f"[视频] 正在抽帧: {video_path}")
    cap = cv2.VideoCapture(video_path)
    frames = []

    # 视频无法打开
    if not cap.isOpened():
        print(f"[错误] 无法打开视频 {video_path}")
        if error_files is not None:
            error_files[video_path] = "无法打开视频"
        for _ in range(frame_count):
            frames.append(Image.new('RGB', (640, 360), (0, 0, 0)))
        return frames

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 360

    if total_frames <= 0:
        print(f"[错误] 视频帧数为 0: {video_path}")
        if error_files is not None:
            error_files[video_path] = "视频帧数为0"
        for _ in range(frame_count):
            frames.append(Image.new('RGB', (width, height), (0, 0, 0)))
        cap.release()
        return frames

    indices = np.linspace(0, total_frames - 1, frame_count, dtype=int)
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            print(f"[视频] 帧 {idx} 无法解码，使用黑屏代替")
            if error_files is not None:
                error_files[video_path] = "部分帧无法解码"
            frames.append(Image.new('RGB', (width, height), (0, 0, 0)))
            continue
        try:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(Image.fromarray(frame_rgb))
        except Exception as e:
            print(f"[视频] 帧 {idx} 解码失败，使用黑屏代替: {e}")
            if error_files is not None:
                error_files[video_path] = "部分帧无法解码"
            frames.append(Image.new('RGB', (frame.shape[1], frame.shape[0]), (0, 0, 0)))

    cap.release()
    return frames


def concatenate_images(file_paths, output_path, error_files=None, base_dir='.'):
    """拼接图片和视频帧：视频帧纵向，同文件横向，文件名显示相对路径"""
    print(f"[拼接] 正在拼接 {len(file_paths)} 个文件/视频帧到 {output_path}")

    group_images = []
    for file_path in file_paths:
        rel_name = os.path.relpath(file_path, base_dir).replace("\\", "/")
        ext = os.path.splitext(file_path)[1].lower()
        temp_imgs = []
        if ext in IMAGE_EXTENSIONS:
            try:
                img = Image.open(file_path).convert('RGB')
                temp_imgs.append((img, rel_name))
            except Exception as e:
                print(f"[错误] 无法打开图片 {file_path}: {e}")
                if error_files is not None:
                    error_files[file_path] = "无法打开图片"
                temp_imgs.append((Image.new('RGB', (640, 360), (0,0,0)), rel_name))
        elif ext in VIDEO_EXTENSIONS:
            frames = extract_video_frames(file_path, error_files=error_files)
            for i, frame in enumerate(frames):
                temp_imgs.append((frame, f"{rel_name}_frame{i}"))
        if temp_imgs:
            group_images.append(temp_imgs)

    if not group_images:
        print(f"[拼接] 没有有效图片或视频帧，跳过 {output_path}")
        return

    # 纵向拼接每组文件的帧
    vertical_stacks = []
    for group in group_images:
        widths = [img.size[0] for img, _ in group]
        total_height = sum(img.size[1]+20 for img, _ in group)
        stack_img = Image.new('RGB', (max(widths), total_height), color=(255,255,255))
        draw = ImageDraw.Draw(stack_img)
        font = ImageFont.load_default()
        y_offset = 0
        for img, name in group:
            stack_img.paste(img, (0, y_offset))
            draw.text((0, y_offset+img.height), name, fill=(0,0,0), font=font)
            y_offset += img.height + 20
        vertical_stacks.append(stack_img)

    # 横向拼接不同文件的纵向堆叠图
    total_width = sum(img.size[0] for img in vertical_stacks)
    max_height = max(img.size[1] for img in vertical_stacks)
    combined_img = Image.new('RGB', (total_width, max_height), color=(255,255,255))
    x_offset = 0
    for img in vertical_stacks:
        combined_img.paste(img, (x_offset, 0))
        x_offset += img.size[0]

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    combined_img.save(output_path)
    print(f"[拼接] 保存完成: {output_path}")



# ------------------- 主程序 -------------------
def main():
    parser = argparse.ArgumentParser(description="查找重复文件并生成拼接图")
    parser.add_argument("target_dir", nargs="?", default=".", help="扫描目录")
    parser.add_argument("-p", "--process-images", action="store_true", help="生成拼接预览")
    parser.add_argument("-o", "--output", default="duplicates.txt", help="输出文件")
    args = parser.parse_args()

    # 用于记录无法解码的视频
    error_videos = {}  

    duplicates, quick_only_diff_md5 = find_duplicate_files(args.target_dir, workers=os.cpu_count())

    with open(args.output, 'w', encoding='utf-8') as f:
        if not duplicates and not quick_only_diff_md5 and not error_videos:
            f.write("未发现相同文件。\n")
        else:
            if duplicates:
                f.write("MD5 完全相同文件：\n")
                for size, files in duplicates.items():
                    f.write(f"\n文件大小: {size} 字节\n")
                    for fp in files:
                        fp_unix = fp.replace("\\","/")
                        f.write(f'  "{fp_unix}"\n')

            if quick_only_diff_md5:
                f.write("\n快速哈希相同但 MD5 不同的文件：\n")
                for qh, files in quick_only_diff_md5.items():
                    f.write(f"\n快速哈希: {qh}\n")
                    for fp in files:
                        fp_unix = fp.replace("\\","/")
                        f.write(f'  "{fp_unix}"\n')

            if error_videos:
                f.write("\n无法解码或可能损坏的视频文件：\n")
                for fp in error_videos:
                    fp_unix = fp.replace("\\","/")
                    f.write(f'  "{fp_unix}"\n')

    # 拼接图片/视频帧
    if args.process_images:
        temp_dir = 'temp'
        os.makedirs(temp_dir, exist_ok=True)
        group_id = 1
        for file_group in list(duplicates.values()) + list(quick_only_diff_md5.values()):
            output_path = os.path.join(temp_dir, f'duplicates_{group_id}.jpg')
            # 在抽帧时传入 error_videos，用于记录解码失败文件
            concatenate_images(file_group, output_path, error_files=error_videos, base_dir=args.target_dir)
            group_id += 1

if __name__ == '__main__':
    main()
