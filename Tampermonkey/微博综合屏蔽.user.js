// ==UserScript==
// @name         微博综合屏蔽
// @namespace    https://github.com/SIXiaolong1117/Rules
// @version      0.4
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
        '推荐'
    ];

    // 默认关键词（可通过菜单修改）
    const DEFAULT_KEYWORDS = [
    ];

    // 默认屏蔽ID（可通过菜单修改）
    const DEFAULT_BLOCKED_IDS = [
    ];

    // 为所有存储键添加脚本专属前缀
    const STORAGE_PREFIX = 'sixiaolong1117_weibo_';
    // =================================================

    // 初始化关键词列表和ID列表
    let keywords = GM_getValue(STORAGE_PREFIX + 'keywords', DEFAULT_KEYWORDS);
    let blockedIds = GM_getValue(STORAGE_PREFIX + 'blocked_ids', DEFAULT_BLOCKED_IDS);
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
        .weibo-block-btn {
            padding: 2px 8px;
            border: 1px solid #d0d0d0;
            border-radius: 3px;
            background: transparent;
            color: #8590a6;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
            margin-left: 10px;
        }
        .weibo-block-btn:hover {
            border-color: #f1403c;
            color: #f1403c;
            background: rgba(241, 64, 60, 0.05);
        }
        .head_name_24eEB {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .keyword-manager-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
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
        .keyword-manager .tabs {
            display: flex;
            margin-bottom: 15px;
            border-bottom: 1px solid var(--border-color, #ddd);
        }
        .keyword-manager .tab {
            padding: 8px 16px;
            cursor: pointer;
            border: none;
            background: none;
            color: var(--text-color, #333);
            border-bottom: 2px solid transparent;
        }
        .keyword-manager .tab.active {
            border-bottom-color: #1890ff;
            color: #1890ff;
        }
        .keyword-manager textarea {
            width: 100%;
            height: 180px;
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
            .weibo-block-btn {
                border-color: #555;
                color: #8590a6;
            }
            .weibo-block-btn:hover {
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
            const idStats = hiddenDetails.filter(d => d.type === '用户ID').length;
            console.log(
                `📊 隐藏内容汇总: 已隐藏 ${hiddenCount} 条内容\n` +
                `🏷️ 推荐标签: ${tagStats} 条\n` +
                `🔤 关键词: ${keywordStats} 条\n` +
                `👤 用户ID: ${idStats} 条\n` +
                `📋 详细分布:`,
                hiddenDetails.reduce((acc, detail) => {
                    const key = detail.reason;
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
            `🔤 屏蔽关键词: ${keywords.length} 个\n` +
            `👤 屏蔽用户ID: ${blockedIds.length} 个\n` +
            `⌨️  按 F8 添加选中文本到屏蔽词\n` +
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
                <h3>屏蔽管理</h3>
                <p style="margin: 0 0 10px 0; font-size: 12px; color: var(--help-color, #666);">
                    推荐标签已内置: ${HIDDEN_TAGS.join(', ')}
                </p>
                <div class="tabs">
                    <button class="tab active" data-tab="keywords">关键词屏蔽</button>
                    <button class="tab" data-tab="ids">用户ID屏蔽</button>
                </div>
                <textarea id="keywords-textarea" placeholder="每行一个关键词&#10;&#10;普通关键词示例：&#10;推广&#10;营销&#10;&#10;正则表达式示例：&#10;/推广.*活动/&#10;/\\d+元优惠/&#10;">${keywords.join('\n')}</textarea>
                <textarea id="ids-textarea" placeholder="每行一个用户ID&#10;&#10;用户ID示例：&#10;6510119885&#10;1234567890&#10;&#10;注意：用户ID是数字ID，不是昵称" style="display: none;">${blockedIds.join('\n')}</textarea>
                <div class="button-group">
                    <button class="close-btn">取消</button>
                    <button class="save-btn">保存</button>
                </div>
                <div class="help-text">
                    <div id="keywords-help">
                        <div><strong>关键词屏蔽说明：</strong></div>
                        <div>• 普通关键词：直接匹配微博文本内容</div>
                        <div>• 正则表达式：用 // 包裹，如 /推广\d+元/</div>
                        <div>• 每行输入一个关键词</div>
                        <div>• 推荐标签已内置，无需重复添加</div>
                        <div>• 按 F8 键将选中文本添加到屏蔽词</div>
                    </div>
                    <div id="ids-help" style="display: none;">
                        <div><strong>用户ID屏蔽说明：</strong></div>
                        <div>• 每行输入一个用户数字ID</div>
                        <div>• 用户ID可在博主主页链接中找到</div>
                        <div>• 点击微博旁的"屏蔽"按钮可快速添加用户ID</div>
                        <div>• 屏蔽后该用户的所有微博都将被隐藏</div>
                    </div>
                </div>
            </div>
        `;

        // 标签切换功能
        const tabs = manager.querySelectorAll('.tab');
        const textareas = {
            keywords: manager.querySelector('#keywords-textarea'),
            ids: manager.querySelector('#ids-textarea')
        };
        const helps = {
            keywords: manager.querySelector('#keywords-help'),
            ids: manager.querySelector('#ids-help')
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // 移除所有active类
                tabs.forEach(t => t.classList.remove('active'));
                // 隐藏所有文本域和帮助
                Object.values(textareas).forEach(ta => ta.style.display = 'none');
                Object.values(helps).forEach(help => help.style.display = 'none');

                // 激活当前标签
                this.classList.add('active');
                const tabType = this.dataset.tab;
                textareas[tabType].style.display = 'block';
                helps[tabType].style.display = 'block';
            });
        });

        // 保存按钮事件
        manager.querySelector('.save-btn').addEventListener('click', function() {
            const keywordsText = textareas.keywords.value;
            const idsText = textareas.ids.value;

            keywords = keywordsText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            blockedIds = idsText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            GM_setValue(STORAGE_PREFIX + 'keywords', keywords);
            GM_setValue(STORAGE_PREFIX + 'blocked_ids', blockedIds);

            // 关闭管理器
            overlay.remove();
            manager.remove();
            keywordManager = null;

            // 重新执行屏蔽
            hideContent();

            // 强制更新页面布局
            forceLayoutUpdate();
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

        // 聚焦到关键词文本框
        textareas.keywords.focus();
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

    // 检查用户ID是否在屏蔽列表中
    function isUserIdBlocked(userId) {
        return blockedIds.includes(userId);
    }

    // 显示通知
    function showNotification(message, timeout = 3000) {
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

    // 处理快捷键添加屏蔽词
    function handleKeyPress(event) {
        // 检查是否按下了 F8 键（keyCode 119）
        if (event.keyCode === 119 && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
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
                    showNotification(` 已添加屏蔽词: "${selectedText}"`);

                    // 立即执行一次匹配处理
                    hideContent();

                    // 强制更新页面布局
                    forceLayoutUpdate();

                    console.log(` 快捷键添加屏蔽关键词: "${selectedText}"`);
                } else {
                    showNotification(` 屏蔽词已存在: "${selectedText}"`);
                }
            } else {
                showNotification(' 请先选择要屏蔽的文本');
            }
        }
    }

    // 添加屏蔽按钮到用户名称旁
    function addBlockButtons() {
        // 使用更通用的选择器来找到用户名称元素
        const userNames = document.querySelectorAll('[class*="head_name"], .woo-box-flex .woo-box-item:first-child a');

        userNames.forEach(userNameElement => {
            // 检查是否已经添加过按钮
            if (userNameElement.querySelector('.weibo-block-btn')) {
                return;
            }

            // 尝试多种方式获取用户ID和名称
            let userId = null;
            let userName = '未知用户';

            // 方式1: 从usercard属性获取
            const userLink = userNameElement.closest('a[usercard]') || userNameElement.querySelector('a[usercard]');
            if (userLink) {
                userId = userLink.getAttribute('usercard');
                const userSpan = userLink.querySelector('span');
                if (userSpan) {
                    userName = userSpan.getAttribute('title') || userSpan.textContent || userName;
                }
            }

            // 方式2: 从href中提取ID
            if (!userId && userLink) {
                const href = userLink.getAttribute('href') || '';
                const idMatch = href.match(/\/(\d+)$/);
                if (idMatch) {
                    userId = idMatch[1];
                }
            }

            // 方式3: 从父元素中查找
            if (!userId) {
                const parent = userNameElement.closest('[usercard]');
                if (parent) {
                    userId = parent.getAttribute('usercard');
                }
            }

            if (!userId) {
                console.log('❌ 未找到用户ID:', userNameElement);
                return;
            }

            // 创建屏蔽按钮
            const blockBtn = document.createElement('button');
            blockBtn.className = 'weibo-block-btn';
            blockBtn.textContent = '屏蔽';
            blockBtn.title = `屏蔽用户 ${userName} (ID: ${userId})`;

            // 按钮点击事件
            blockBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // 添加用户ID到屏蔽列表
                if (!blockedIds.includes(userId)) {
                    blockedIds.push(userId);
                    GM_setValue(STORAGE_PREFIX + 'blocked_ids', blockedIds);

                    console.log(` 已屏蔽用户: "${userName}" (ID: ${userId})`);

                    // 显示成功提示
                    showNotification(`已屏蔽用户: ${userName}`);

                    // 调用 hideContent 统一处理屏蔽逻辑
                    hideContent();

                    // 强制更新页面布局
                    forceLayoutUpdate();
                } else {
                    showNotification(`用户 ${userName} 已在屏蔽列表中`);
                }
            });

            // 将按钮添加到用户名称后面
            // 确保元素有合适的布局
            if (userNameElement.style.display === 'inline') {
                userNameElement.style.display = 'inline-flex';
                userNameElement.style.alignItems = 'center';
                userNameElement.style.gap = '5px';
            }
            userNameElement.appendChild(blockBtn);

            console.log(`✅ 已添加屏蔽按钮: ${userName} (${userId})`);
        });

        // 调试信息
        if (userNames.length > 0) {
            console.log(`🔍 找到 ${userNames.length} 个用户名称元素`);
        }
    }

    // 强制更新页面布局
    function forceLayoutUpdate() {
        // 方法1: 触发resize事件（最温和的方式）
        window.dispatchEvent(new Event('resize'));

        // 方法2: 使用requestAnimationFrame确保渲染完成
        requestAnimationFrame(() => {
            // 触发回流但不改变滚动位置
            document.body.offsetHeight;
        });

        // 方法3: 微调一个隐藏元素来触发重排
        const trigger = document.createElement('div');
        trigger.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(trigger);
        trigger.offsetHeight;
        document.body.removeChild(trigger);
    }

    // 修改用户ID屏蔽逻辑
    function hideContent() {
        // 先添加屏蔽按钮
        addBlockButtons();

        // 方法1: 通过推荐标签屏蔽
        const tags = Array.from(document.querySelectorAll('*[class], [node-type="feed_list_top"]')).filter(el =>
            Array.from(el.classList).some(c => c.startsWith('wbpro-tag')) || el.getAttribute('node-type') === 'feed_list_top'
        );
        tags.forEach(tag => {
            const tagText = tag.textContent.trim();

            // 检查是否包含隐藏关键词
            const matchesKeyword = HIDDEN_TAGS.some(keyword => tagText.includes(keyword));

            // 检查是否包含 base64 图片
            const img = tag.querySelector('img');
            const hasBase64Img = img && img.src.startsWith('data:image/');

            if (matchesKeyword || hasBase64Img) {
                // 修改：找到 Feed_body_3R0rO 元素
                const feedBody = tag.closest('.woo-panel-main')?.querySelector('.Feed_body_3R0rO') ||
                               tag.closest('.WB_cardwrap')?.querySelector('.Feed_body_3R0rO');

                if (feedBody && !feedBody.classList.contains('custom-hidden')) {
                    feedBody.classList.add('custom-hidden');

                    // 获取原文文本
                    let originalText = "";
                    const contentEl = feedBody.querySelector('.wbpro-feed-content .detail_text_1U10O .detail_wbtext_4CRf9');
                    if (contentEl) {
                        originalText = contentEl.textContent.trim();
                    }

                    // 隐藏所有同级子元素
                    const parent = feedBody.parentElement;
                    Array.from(parent.children).forEach(child => {
                        if (!child.classList.contains('custom-hidden-message')) {
                            child.style.display = 'none';
                        }
                    });

                    // 创建提示元素并添加到父容器
                    const message = document.createElement('div');
                    message.className = 'custom-hidden-message';
                    message.innerHTML = `
                        <div class="message-content">
                            已隐藏包含"${tagText}"标签的内容 ${hasBase64Img ? "(含 Base64 图片)" : ""}
                        </div>
                    `;
                    parent.appendChild(message);

                    // 控制台记录
                    console.group("屏蔽内容信息");
                    console.log("标签:", tagText);
                    if (hasBase64Img) console.log("包含 Base64 图片");
                    console.log("原文内容:", originalText);
                    console.groupEnd();
                }
            }
        });

        // 方法2: 通过关键词屏蔽
        const feedContents = document.querySelectorAll('.wbpro-feed-content, .weibo-text');
        feedContents.forEach(feedContent => {
            const contentText = feedContent.textContent.trim();
            const matchResult = isTextMatched(contentText);

            if (matchResult) {
                // 修改：找到 Feed_body_3R0rO 元素
                const feedBody = feedContent.closest('.Feed_body_3R0rO');
                if (feedBody && !feedBody.classList.contains('custom-hidden')) {
                    feedBody.classList.add('custom-hidden');

                    let displayKeyword = matchResult.keyword;
                    let displayType = '关键词';

                    if (matchResult.type === 'regex') {
                        displayKeyword = `正则: ${matchResult.keyword}`;
                    }

                    // 隐藏所有同级子元素
                    const parent = feedBody.parentElement;
                    Array.from(parent.children).forEach(child => {
                        if (!child.classList.contains('custom-hidden-message')) {
                            child.style.display = 'none';
                        }
                    });

                    // 创建提示元素并添加到父容器
                    const message = document.createElement('div');
                    message.className = 'custom-hidden-message';
                    message.innerHTML = `
                        <div class="message-content">
                             已隐藏包含${displayType}"${displayKeyword}"的内容
                        </div>
                    `;
                    parent.appendChild(message);

                    // 记录到控制台
                    logHiddenContent('关键词', contentText.substring(0, 50) + '...', feedBody, `${matchResult.type}: ${matchResult.keyword}`);
                }
            }
        });

        // 方法3: 通过用户ID屏蔽
        const userLinks = document.querySelectorAll('a[usercard], [usercard] a');
        userLinks.forEach(userLink => {
            const userId = userLink.getAttribute('usercard');
            let userName = '未知用户';

            // 获取用户名称
            const nameSpan = userLink.querySelector('span');
            if (nameSpan) {
                userName = nameSpan.getAttribute('title') || nameSpan.textContent || userName;
            }

            if (userId && isUserIdBlocked(userId)) {
                // 修改：找到 Feed_body_3R0rO 元素
                const feedBody = userLink.closest('.Feed_body_3R0rO');
                if (feedBody && !feedBody.classList.contains('custom-hidden')) {
                    feedBody.classList.add('custom-hidden');

                    // 隐藏所有同级子元素
                    const parent = feedBody.parentElement;
                    Array.from(parent.children).forEach(child => {
                        if (!child.classList.contains('custom-hidden-message')) {
                            child.style.display = 'none';
                        }
                    });

                    // 创建提示元素并添加到父容器
                    const message = document.createElement('div');
                    message.className = 'custom-hidden-message';
                    message.innerHTML = `
                        <div class="message-content">
                             已隐藏屏蔽用户: ${userName} (ID: ${userId})
                        </div>
                    `;
                    parent.appendChild(message);

                    // 记录到控制台
                    logHiddenContent('用户ID', userId, feedBody, `屏蔽用户: ${userName}`);
                }
            }
        });

        // 在函数最后添加：强制更新页面布局
        forceLayoutUpdate();
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

        // 添加键盘事件监听
        document.addEventListener('keydown', handleKeyPress);

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
            const idStats = hiddenDetails.filter(d => d.type === '用户ID').length;

            console.log(
                `%c📊 微博内容隐藏统计\n` +
                `📈 总共隐藏: ${hiddenCount} 条内容\n` +
                `🏷️ 推荐标签: ${tagStats} 条\n` +
                `🔤 关键词: ${keywordStats} 条\n` +
                `👤 用户ID: ${idStats} 条\n` +
                `📋 详细分布:`,
                'background: #4CAF50; color: white; padding: 5px; border-radius: 3px;',
                hiddenDetails.reduce((acc, detail) => {
                    const key = detail.reason;
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
            `   resetHiddenStats() - 重置统计计数\n` +
            `💡 功能: 按 F8 将选中文本添加到屏蔽词\n` +
            `💡 功能: 点击用户名称旁的"屏蔽"按钮屏蔽该用户`
        );
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();