// ==UserScript==
// @name         知乎综合屏蔽
// @namespace    https://github.com/SIXiaolong1117/Rules
// @version      0.1
// @description  屏蔽包含自定义关键词的知乎问题，支持正则表达式，可一键添加屏蔽，同时隐藏广告卡片
// @license      MIT
// @icon         https://zhihu.com/favicon.ico
// @author       SI Xiaolong
// @match        https://www.zhihu.com/*
// @match        https://zhihu.com/*
// @match        https://*.zhihu.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // 默认关键词（可通过菜单修改）
    const DEFAULT_KEYWORDS = [
    ];

    // 为所有存储键添加脚本专属前缀
    const STORAGE_PREFIX = 'sixiaolong1117_zhihu_';

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
            padding: 15px;
            text-align: center;
            border: 1px solid;
            border-radius: 6px;
            font-size: 14px;
        }
        .ContentItem-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .zhihu-block-btn {
            padding: 2px 8px;
            border: 1px solid #d0d0d0;
            border-radius: 3px;
            background: transparent;
            color: #8590a6;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        .zhihu-block-btn:hover {
            border-color: #f1403c;
            color: #f1403c;
            background: rgba(241, 64, 60, 0.05);
        }
        .ContentItem-title a {
            flex: 1;
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
            .custom-hidden-message {
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
            .custom-hidden-message {
                background: #2d2d2d;
                color: #ccc;
                border-color: #444;
            }
            .zhihu-block-btn {
                border-color: #555;
                color: #8590a6;
            }
            .zhihu-block-btn:hover {
                border-color: #f1403c;
                color: #f1403c;
                background: rgba(241, 64, 60, 0.1);
            }
        }
    `;

    // 添加样式到页面
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // 在控制台输出隐藏信息
    function logHiddenContent(matchedKeyword, questionText, element, matchType, source = '自动屏蔽') {
        hiddenCount++;
        const detail = {
            index: hiddenCount,
            keyword: matchedKeyword,
            question: questionText,
            matchType: matchType,
            source: source,
            timestamp: new Date().toLocaleTimeString(),
            element: element
        };
        hiddenDetails.push(detail);

        console.log(
            `🚫 知乎内容隐藏 #${hiddenCount}\n` +
            `🔍 关键词/类型: "${matchedKeyword}"\n` +
            `📝 内容: "${questionText}"\n` +
            `🔧 匹配类型: ${matchType}\n` +
            `📮 来源: ${source}\n` +
            `⏰ 时间: ${detail.timestamp}\n` +
            `📍 元素:`, element
        );

        // 每隐藏10条内容时输出汇总信息
        if (hiddenCount % 10 === 0) {
            console.log(
                `📊 隐藏内容汇总: 已隐藏 ${hiddenCount} 个内容\n` +
                `📋 关键词分布:`,
                hiddenDetails.reduce((acc, detail) => {
                    acc[detail.keyword] = (acc[detail.keyword] || 0) + 1;
                    return acc;
                }, {})
            );
        }
    }

    // 输出脚本信息
    function logScriptInfo() {
        console.log(
            `%c📚 知乎问题关键词屏蔽脚本已启动\n` +
            `🔤 屏蔽关键词: ${keywords.join(', ')}\n` +
            `📱 同时隐藏广告卡片 (TopstoryItem--advertCard)\n` +
            `⌨️  按 F8 添加选中文本到屏蔽词\n` +
            `⏰ 启动时间: ${new Date().toLocaleString()}`,
            'background: #0084ff; color: white; padding: 5px; border-radius: 3px;'
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
                <h3>知乎问题屏蔽关键词管理</h3>
                <textarea placeholder="每行一个关键词&#10;&#10;普通关键词示例：&#10;推广&#10;营销&#10;广告&#10;&#10;正则表达式示例：&#10;/推广.*活动/&#10;/\\d+元优惠/&#10;">${keywords.join('\n')}</textarea>
                <div class="button-group">
                    <button class="close-btn">取消</button>
                    <button class="save-btn">保存</button>
                </div>
                <div class="help-text">
                    <div><strong>使用说明：</strong></div>
                    <div>• 普通关键词：直接匹配问题标题内容</div>
                    <div>• 正则表达式：用 // 包裹，如 /推广\d+元/</div>
                    <div>• 每行输入一个关键词</div>
                    <div>• 匹配到关键词的问题将被隐藏</div>
                    <div>• 点击问题旁的"屏蔽"按钮可快速添加关键词</div>
                    <div>• 按 Q 键将选中文本添加到屏蔽词</div>
                    <div>• 同时自动隐藏广告卡片 (TopstoryItem--advertCard)</div>
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
            hideQuestions();
            hideAdvertCards();
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

    // 添加屏蔽按钮到问题标题
    function addBlockButtons() {
        const questionTitles = document.querySelectorAll('.ContentItem-title');

        questionTitles.forEach(titleElement => {
            // 检查是否已经添加过按钮
            if (titleElement.querySelector('.zhihu-block-btn')) {
                return;
            }

            const titleLink = titleElement.querySelector('a');
            if (!titleLink) return;

            const questionText = titleLink.textContent.trim();

            // 创建屏蔽按钮
            const blockBtn = document.createElement('button');
            blockBtn.className = 'zhihu-block-btn';
            blockBtn.textContent = '屏蔽';
            blockBtn.title = '将此问题添加到屏蔽列表';

            // 按钮点击事件
            blockBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // 添加关键词到列表
                if (!keywords.includes(questionText)) {
                    keywords.push(questionText);
                    GM_setValue(STORAGE_PREFIX + 'keywords', keywords);

                    console.log(`✅ 已添加屏蔽关键词: "${questionText}"`);

                    // 显示成功提示
                    showNotification(`已添加屏蔽词: "${questionText}"`);
                }

                // 隐藏该问题
                const contentItem = titleElement.closest('.ContentItem');
                if (contentItem && !contentItem.classList.contains('custom-hidden')) {
                    contentItem.classList.add('custom-hidden');

                    // 创建提示元素
                    const message = document.createElement('div');
                    message.className = 'custom-hidden-message';
                    message.innerHTML = `🚫 已手动屏蔽问题: "${questionText}"`;

                    // 替换原始内容
                    contentItem.parentNode.replaceChild(message, contentItem);

                    // 记录到控制台
                    logHiddenContent(questionText, questionText, contentItem, '手动添加', '手动屏蔽');
                }
            });

            // 将按钮添加到标题后面
            titleElement.appendChild(blockBtn);
        });
    }

    // 隐藏广告卡片
    function hideAdvertCards() {
        const advertCards = document.querySelectorAll('.TopstoryItem--advertCard');

        advertCards.forEach(card => {
            if (!card.classList.contains('custom-hidden')) {
                card.classList.add('custom-hidden');

                // 创建提示元素
                const message = document.createElement('div');
                message.className = 'custom-hidden-message';
                message.innerHTML = '🚫 已隐藏广告卡片';

                // 替换原始内容
                card.parentNode.replaceChild(message, card);

                // 记录到控制台
                logHiddenContent('TopstoryItem--advertCard', '广告卡片', card, '广告卡片', '自动屏蔽');
            }
        });
    }

    function hideQuestions() {
        // 先添加屏蔽按钮
        addBlockButtons();

        // 然后执行自动屏蔽
        const questionTitles = document.querySelectorAll('.ContentItem-title a');

        questionTitles.forEach(titleElement => {
            const questionText = titleElement.textContent.trim();
            const matchResult = isTextMatched(questionText);

            if (matchResult) {
                const contentItem = titleElement.closest('.ContentItem');
                if (contentItem && !contentItem.classList.contains('custom-hidden')) {
                    contentItem.classList.add('custom-hidden');

                    let displayKeyword = matchResult.keyword;
                    let matchType = '普通关键词';

                    if (matchResult.type === 'regex') {
                        displayKeyword = matchResult.keyword;
                        matchType = '正则表达式';
                    }

                    // 创建提示元素
                    const message = document.createElement('div');
                    message.className = 'custom-hidden-message';
                    message.innerHTML = `🚫 已隐藏包含"${displayKeyword}"的问题`;

                    // 替换原始内容
                    contentItem.parentNode.replaceChild(message, contentItem);

                    // 记录到控制台
                    logHiddenContent(matchResult.keyword, questionText, contentItem, matchType, '自动屏蔽');
                }
            }
        });

        // 隐藏广告卡片
        hideAdvertCards();
    }

    // 显示通知
    function showNotification(message, timeout = 3000) {
        // 尝试使用GM_notification
        if (typeof GM_notification === 'function') {
            GM_notification({
                text: message,
                timeout: timeout,
                title: '知乎关键词屏蔽'
            });
        } else {
            // 备用方案：在页面右上角显示临时提示
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 10001;
                font-size: 14px;
                max-width: 300px;
                word-break: break-all;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, timeout);
        }
    }

    // 处理快捷键添加屏蔽词
    function handleKeyPress(event) {
        // 检查是否按下了 F8 键（keyCode 119）或 Alt+Q（keyCode 81 + altKey）
        if ((event.keyCode === 119 && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) || // F8 单独按下
            (event.keyCode === 81 && event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey)) { // Alt+Q
            const selectedText = window.getSelection().toString().trim();

            if (selectedText && selectedText.length > 0) {
                // 防止默认行为
                event.preventDefault();
                event.stopPropagation();

                // 检查是否已存在该关键词
                if (!keywords.includes(selectedText)) {
                    // 添加到关键词列表
                    keywords.push(selectedText);
                    GM_setValue(STORAGE_PREFIX + 'keywords', keywords);

                    // 显示成功提示
                    showNotification(`✅ 已添加屏蔽词: "${selectedText}"`);

                    // 如果当前在主站，立即执行一次匹配处理
                    if (isMainZhihuSite()) {
                        hideQuestions();
                    }

                    console.log(`✅ 快捷键添加屏蔽关键词: "${selectedText}"`);
                } else {
                    showNotification(`⚠️ 屏蔽词已存在: "${selectedText}"`);
                }
            } else {
                showNotification('⚠️ 请先选择要屏蔽的文本');
            }
        }
    }

    // 检查当前页面是否在主站（允许执行屏蔽功能）
    function isMainZhihuSite() {
        const currentUrl = window.location.href;
        const mainSites = [
            'https://www.zhihu.com',
            'https://www.zhihu.com/?theme=light',
            'https://www.zhihu.com/?theme=dark',
            'https://zhihu.com',
            'https://zhihu.com/?theme=light',
            'https://zhihu.com/?theme=dark'
        ];

        return mainSites.some(site => currentUrl.startsWith(site));
    }

    // 使用防抖避免频繁执行
    let timeoutId;
    function debouncedHide() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(hideQuestions, 100);
    }

    // 初始化
    function init() {
        // 输出脚本启动信息
        logScriptInfo();

        // 添加键盘事件监听（在所有知乎站点都启用）
        document.addEventListener('keydown', handleKeyPress);

        // 只有在主站才执行屏蔽功能
        if (isMainZhihuSite()) {
            // 页面加载时执行一次
            hideQuestions();

            // 监听DOM变化（使用防抖）
            const observer = new MutationObserver(debouncedHide);
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            console.log('🔧 当前不在知乎主站，仅启用关键词管理功能');
        }

        // 添加全局函数以便在控制台手动查看统计
        window.getHiddenStats = function() {
            console.log(
                `%c📊 知乎内容隐藏统计\n` +
                `📈 总共隐藏: ${hiddenCount} 个内容\n` +
                `📋 关键词分布:`,
                'background: #4CAF50; color: white; padding: 5px; border-radius: 3px;',
                hiddenDetails.reduce((acc, detail) => {
                    acc[detail.keyword] = (acc[detail.keyword] || 0) + 1;
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
            `   resetHiddenStats() - 重置统计计数\n` +
            `💡 功能: 按 F8 将选中文本添加到屏蔽词\n` +
            `💡 功能: 在知乎主站自动隐藏匹配内容\n` +
            `💡 当前模式: ${isMainZhihuSite() ? '主站屏蔽模式' : '仅关键词管理'}`
        );
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();