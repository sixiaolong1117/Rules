function infiniteClickDeleteOptimized() {
  let isProcessing = false;
  let scrollCount = 0;
  let deletedCount = 0;
  
  function findDeleteButtons() {
    return Array.from(document.querySelectorAll('.Button.CreationCard-ActionButton')).filter(btn => {
      const text = btn.textContent || '';
      const value = btn.value || '';
      // 同时匹配class和文本内容
      return (text.includes('删除') || value.includes('删除'));
    });
  }
  
  function findConfirmButtons() {
    return Array.from(document.querySelectorAll('.Button.Button--primary.Button--blue')).filter(btn => {
      const text = btn.textContent || '';
      const value = btn.value || '';
      // 同时匹配class和确认文本
      return (text.includes('确认') || text.includes('确定') || 
              value.includes('确认') || value.includes('确定'));
    });
  }
  
  function scrollPage() {
    const scrollAmount = 200;
    window.scrollBy(0, scrollAmount);
    scrollCount++;
    console.log(`📜 页面已向下滚动 ${scrollCount} 次`);
  }
  
  function checkPageBottom() {
    // 检查是否接近页面底部
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    return (pageHeight - scrollPosition) < 500;
  }
  
  setInterval(() => {
    if (isProcessing) {
      return;
    }
    
    const deleteButtons = findDeleteButtons();
    
    if (deleteButtons.length > 0) {
      isProcessing = true;
      console.log(`🎯 找到 ${deleteButtons.length} 个删除按钮，开始处理第 ${deletedCount + 1} 个`);
      
      // 步骤1：点击删除按钮
      setTimeout(() => {
        console.log('🗑️ 点击删除按钮');
        try {
          deleteButtons[0].click();
        } catch (error) {
          console.error('点击删除按钮失败:', error);
          isProcessing = false;
          return;
        }
        
        // 步骤2：等待弹窗出现，然后点击确认
        setTimeout(() => {
          const confirmButtons = findConfirmButtons();
          if (confirmButtons.length > 0) {
            console.log('✅ 找到确认按钮，点击确认');
            try {
              confirmButtons[0].click();
              deletedCount++;
              console.log(`✅ 成功删除 ${deletedCount} 个项目`);
            } catch (error) {
              console.error('点击确认按钮失败:', error);
            }
          } else {
            console.log('⚠️ 未找到确认按钮，可能不需要确认或弹窗未出现');
          }
          
          // 步骤3：完成后重置状态并滚动页面
          setTimeout(() => {
            isProcessing = false;
            
            // 检查是否需要滚动
            if (checkPageBottom()) {
              console.log('🔄 接近页面底部，回到顶部重新扫描');
              window.scrollTo(0, 0);
              scrollCount = 0;
            } else {
              scrollPage();
            }
            
            console.log('⏳ 等待下一次操作...');
          }, 500);
        }, 1000); // 等待弹窗出现的时间
      }, 500);
    } else {
      console.log('🔍 未找到匹配的删除按钮，滚动页面继续查找...');
      
      if (checkPageBottom()) {
        console.log('🔄 已到页面底部，回到顶部重新扫描');
        window.scrollTo(0, 0);
        scrollCount = 0;
      } else {
        scrollPage();
      }
    }
  }, 2500); // 2.5秒间隔，给足操作时间
}

// 运行优化版脚本
infiniteClickDeleteOptimized();
console.log('🎯 精确匹配删除脚本已启动，刷新页面可停止');