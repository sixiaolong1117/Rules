import sys

def hex_to_unicode_be(hex_data):
    """
    将16进制数据解析为UnicodeBE字符串。

    :param hex_data: 十六进制字符串（例如 "00480065006C006C006F"）
    :return: 解析后的UnicodeBE字符串
    """
    try:
        # 将16进制字符串转换为字节数据
        byte_data = bytes.fromhex(hex_data)
        # 使用UnicodeBE解码字节数据
        decoded_str = byte_data.decode('utf-16-be')  # Unicode Big Endian
        return decoded_str
    except UnicodeDecodeError:
        return "解码失败：输入的16进制数据可能不是有效的UnicodeBE编码。"
    except ValueError:
        return "转换失败：输入的数据不是有效的16进制字符串。"

def main():
    if len(sys.argv) != 2:
        print("用法: python script.py <16进制字符串>")
        print("示例: python script.py 00480065006C006C006F")
        sys.exit(1)

    hex_input = sys.argv[1]
    result = hex_to_unicode_be(hex_input)
    print(f"解析结果：{result}")

if __name__ == "__main__":
    main()
