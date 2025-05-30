// ==UserScript==
// @name         微博综合屏蔽
// @namespace    https://github.com/SIXiaolong1117/Rules
// @version      0.2
// @description  屏蔽推荐、广告、荐读标签，屏蔽自定义关键词的微博内容，支持正则表达式
// @license      MIT
// @icon         https://weibo.com/favicon.ico
// @author       SI Xiaolong
// @match        https://weibo.com/*
// @match        https://*.weibo.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置区域 ====================
    // 写死的推荐标签（不可通过菜单修改）
    const HIDDEN_TAGS = [
        '荐读',
        '广告',
        '推荐',
        'data:image/png;base64'
    ];

    // 默认关键词（可通过菜单修改）
    const DEFAULT_KEYWORDS = [
    ];

    // 为所有存储键添加脚本专属前缀
    const STORAGE_PREFIX = 'sixiaolong1117_weibo_';
    // =================================================

    // 初始化关键词列表
    let keywords = GM_getValue(STORAGE_PREFIX + 'keywords', DEFAULT_KEYWORDS);
    let keywordManager = null;

    // 统计隐藏的内容
    let hiddenCount = 0;
    const hiddenDetails = [];

    // 深浅色模式样式
    const styles = `
        .custom-hidden-message {
            margin: 10px 0;
        }
        .custom-hidden-message .message-content {
            padding: 15px;
            text-align: center;
            border: 1px solid;
            border-radius: 6px;
            font-size: 14px;
            margin: 10px 0;
        }
        .keyword-manager-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            max-width: 90vw;
            background: var(--bg-color, white);
            border: 1px solid var(--border-color, #ccc);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .keyword-manager-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        }
        .keyword-manager h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
            color: var(--text-color, #333);
        }
        .keyword-manager textarea {
            width: 100%;
            height: 200px;
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid var(--border-color, #ddd);
            border-radius: 4px;
            resize: vertical;
            font-family: monospace;
            font-size: 14px;
            background: var(--input-bg, white);
            color: var(--input-color, #333);
        }
        .keyword-manager .button-group {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        .keyword-manager button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .keyword-manager .save-btn {
            background: #1890ff;
            color: white;
        }
        .keyword-manager .save-btn:hover {
            background: #40a9ff;
        }
        .keyword-manager .close-btn {
            background: var(--btn-bg, #f5f5f5);
            color: var(--btn-color, #666);
        }
        .keyword-manager .close-btn:hover {
            background: var(--btn-hover-bg, #e8e8e8);
        }
        .keyword-manager .help-text {
            margin-top: 10px;
            font-size: 12px;
            color: var(--help-color, #666);
            line-height: 1.4;
        }
        @media (prefers-color-scheme: light) {
            .keyword-manager-modal {
                --bg-color: white;
                --text-color: #333;
                --border-color: #ccc;
                --input-bg: white;
                --input-color: #333;
                --btn-bg: #f5f5f5;
                --btn-color: #666;
                --btn-hover-bg: #e8e8e8;
                --help-color: #666;
            }
            .custom-hidden-message .message-content {
                background: #f5f5f5;
                color: #666;
                border-color: #ddd;
            }
        }
        @media (prefers-color-scheme: dark) {
            .keyword-manager-modal {
                --bg-color: #2d2d2d;
                --text-color: #ccc;
                --border-color: #444;
                --input-bg: #1a1a1a;
                --input-color: #ccc;
                --btn-bg: #444;
                --btn-color: #ccc;
                --btn-hover-bg: #555;
                --help-color: #999;
            }
            .custom-hidden-message .message-content {
                background: #2d2d2d;
                color: #ccc;
                border-color: #444;
            }
        }
    `;

    // 添加样式到页面
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // 在控制台输出隐藏信息
    function logHiddenContent(type, matchedText, element, reason) {
        hiddenCount++;
        const detail = {
            index: hiddenCount,
            type: type,
            matched: matchedText,
            reason: reason,
            timestamp: new Date().toLocaleTimeString(),
            element: element
        };
        hiddenDetails.push(detail);

        console.log(
            `🚫 微博内容隐藏 #${hiddenCount}\n` +
            `📌 类型: ${type}\n` +
            `🔍 匹配: "${matchedText}"\n` +
            `📝 原因: ${reason}\n` +
            `⏰ 时间: ${detail.timestamp}\n` +
            `📍 元素:`, element
        );

        // 每隐藏10条内容时输出汇总信息
        if (hiddenCount % 10 === 0) {
            const tagStats = hiddenDetails.filter(d => d.type === '推荐标签').length;
            const keywordStats = hiddenDetails.filter(d => d.type === '关键词').length;
            console.log(
                `📊 隐藏内容汇总: 已隐藏 ${hiddenCount} 条内容\n` +
                `🏷️ 推荐标签: ${tagStats} 条\n` +
                `🔤 关键词: ${keywordStats} 条\n` +
                `📋 标签分布:`,
                hiddenDetails.reduce((acc, detail) => {
                    const key = detail.type === '推荐标签' ? detail.matched : detail.reason;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {})
            );
        }
    }

    // 输出脚本信息
    function logScriptInfo() {
        console.log(
            `%c🐦 微博内容综合屏蔽脚本已启动\n` +
            `🏷️ 屏蔽标签: ${HIDDEN_TAGS.join(', ')}\n` +
            `🔤 屏蔽关键词: ${keywords.join(', ')}\n` +
            `⏰ 启动时间: ${new Date().toLocaleString()}`,
            'background: #ff6b35; color: white; padding: 5px; border-radius: 3px;'
        );
    }

    // 显示关键词管理器
    function showKeywordManager() {
        // 如果已经存在，先移除
        if (keywordManager) {
            keywordManager.remove();
        }

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'keyword-manager-overlay';

        // 创建管理器模态框
        const manager = document.createElement('div');
        manager.className = 'keyword-manager-modal';
        manager.innerHTML = `
            <div class="keyword-manager">
                <h3>关键词管理</h3>
                <p style="margin: 0 0 10px 0; font-size: 12px; color: var(--help-color, #666);">
                    推荐标签已内置: ${HIDDEN_TAGS.join(', ')}
                </p>
                <textarea placeholder="每行一个关键词&#10;&#10;普通关键词示例：&#10;推广&#10;营销&#10;&#10;正则表达式示例：&#10;/推广.*活动/&#10;/\\d+元优惠/&#10;">${keywords.join('\n')}</textarea>
                <div class="button-group">
                    <button class="close-btn">取消</button>
                    <button class="save-btn">保存</button>
                </div>
                <div class="help-text">
                    <div><strong>使用说明：</strong></div>
                    <div>• 普通关键词：直接匹配微博文本内容</div>
                    <div>• 正则表达式：用 // 包裹，如 /推广\d+元/</div>
                    <div>• 每行输入一个关键词</div>
                    <div>• 推荐标签已内置，无需重复添加</div>
                </div>
            </div>
        `;

        // 保存按钮事件
        manager.querySelector('.save-btn').addEventListener('click', function() {
            const textarea = manager.querySelector('textarea');
            const newKeywords = textarea.value.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            keywords = newKeywords;
            GM_setValue(STORAGE_PREFIX + 'keywords', newKeywords);

            // 关闭管理器
            overlay.remove();
            manager.remove();
            keywordManager = null;

            // 重新执行屏蔽
            hideContent();
        });

        // 关闭按钮事件
        manager.querySelector('.close-btn').addEventListener('click', function() {
            overlay.remove();
            manager.remove();
            keywordManager = null;
        });

        // 点击遮罩层关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
                manager.remove();
                keywordManager = null;
            }
        });

        // 添加到页面
        document.body.appendChild(overlay);
        document.body.appendChild(manager);
        keywordManager = manager;

        // 聚焦到文本框
        manager.querySelector('textarea').focus();
    }

    // 注册油猴菜单命令
    GM_registerMenuCommand('管理屏蔽关键词', showKeywordManager);

    // 检查文本是否匹配关键词
    function isTextMatched(text) {
        for (const keyword of keywords) {
            if (keyword.startsWith('/') && keyword.endsWith('/')) {
                // 正则表达式
                try {
                    const pattern = keyword.slice(1, -1);
                    const regex = new RegExp(pattern);
                    if (regex.test(text)) {
                        return { type: 'regex', keyword: keyword };
                    }
                } catch (e) {
                    console.warn('无效的正则表达式:', keyword, e);
                }
            } else {
                // 普通关键词
                if (text.includes(keyword)) {
                    return { type: 'normal', keyword: keyword };
                }
            }
        }
        return null;
    }

    function hideContent() {
        // 方法1: 通过推荐标签屏蔽
        const tags = document.querySelectorAll('.wbpro-tag');
        tags.forEach(tag => {
            const tagText = tag.textContent.trim();
            const shouldHide = HIDDEN_TAGS.some(keyword => tagText.includes(keyword));

            if (shouldHide) {
                const panelMain = tag.closest('.woo-panel-main');
                if (panelMain && !panelMain.classList.contains('custom-hidden')) {
                    panelMain.classList.add('custom-hidden');

                    // 创建提示元素
                    const message = document.createElement('div');
                    message.className = 'custom-hidden-message';
                    message.innerHTML = `
                        <div class="message-content">
                            🚫 已隐藏包含"${tagText}"标签的内容
                        </div>
                    `;

                    // 替换原始内容
                    panelMain.parentNode.replaceChild(message, panelMain);

                    // 记录到控制台
                    logHiddenContent('推荐标签', tagText, panelMain, `标签: ${tagText}`);
                }
            }
        });

        // 方法2: 通过关键词屏蔽
        const feedContents = document.querySelectorAll('.wbpro-feed-content');
        feedContents.forEach(feedContent => {
            const contentText = feedContent.textContent.trim();
            const matchResult = isTextMatched(contentText);

            if (matchResult) {
                const panelMain = feedContent.closest('.woo-panel-main');
                if (panelMain && !panelMain.classList.contains('custom-hidden')) {
                    panelMain.classList.add('custom-hidden');

                    let displayKeyword = matchResult.keyword;
                    let displayType = '关键词';

                    if (matchResult.type === 'regex') {
                        displayKeyword = `正则: ${matchResult.keyword}`;
                    }

                    // 创建提示元素
                    const message = document.createElement('div');
                    message.className = 'custom-hidden-message';
                    message.innerHTML = `
                        <div class="message-content">
                            🚫 已隐藏包含${displayType}"${displayKeyword}"的内容
                        </div>
                    `;

                    // 替换原始内容
                    panelMain.parentNode.replaceChild(message, panelMain);

                    // 记录到控制台
                    logHiddenContent('关键词', contentText.substring(0, 50) + '...', panelMain, `${matchResult.type}: ${matchResult.keyword}`);
                }
            }
        });
    }

    // 使用防抖避免频繁执行
    let timeoutId;
    function debouncedHide() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(hideContent, 100);
    }

    // 初始化
    function init() {
        // 输出脚本启动信息
        logScriptInfo();

        // 页面加载时执行一次
        hideContent();

        // 监听DOM变化（使用防抖）
        const observer = new MutationObserver(debouncedHide);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 添加全局函数以便在控制台手动查看统计
        window.getHiddenStats = function() {
            const tagStats = hiddenDetails.filter(d => d.type === '推荐标签').length;
            const keywordStats = hiddenDetails.filter(d => d.type === '关键词').length;

            console.log(
                `%c📊 微博内容隐藏统计\n` +
                `📈 总共隐藏: ${hiddenCount} 条内容\n` +
                `🏷️ 推荐标签: ${tagStats} 条\n` +
                `🔤 关键词: ${keywordStats} 条\n` +
                `📋 详细分布:`,
                'background: #4CAF50; color: white; padding: 5px; border-radius: 3px;',
                hiddenDetails.reduce((acc, detail) => {
                    const key = detail.type === '推荐标签' ? detail.matched : detail.reason;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {})
            );
            console.log('📋 完整记录:', hiddenDetails);
        };

        // 添加重置统计的函数
        window.resetHiddenStats = function() {
            hiddenCount = 0;
            hiddenDetails.length = 0;
            console.log('🔄 隐藏统计已重置');
        };

        console.log(
            `💡 提示: 在控制台使用以下命令:\n` +
            `   getHiddenStats() - 查看隐藏统计\n` +
            `   resetHiddenStats() - 重置统计计数`
        );
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();