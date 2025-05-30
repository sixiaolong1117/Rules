// 打开 https://account.bilibili.com/account/blacklist，在浏览器开发者工具控制台运行。
(function() {
  const delay = 1000; // 设置点击间隔为 1 秒
  const targetClass = 'black-btn';
  const prevClass = 'btn-prev';

  function clickButtons() {
    const buttons = Array.from(document.querySelectorAll(`.${targetClass}`));
    const prevButton = document.querySelector(`.${prevClass}`);

    if (buttons.length === 1 && prevButton) {
      console.log('只剩一个按钮，点击上一个按钮');
      prevButton.click();
    } else if (buttons.length > 1) {
      console.log(`点击 ${buttons.length} 个按钮中的第一个`);
      buttons[0].click();
    } else {
      console.log('没有找到目标按钮');
    }
  }

  setInterval(clickButtons, delay);
})();
