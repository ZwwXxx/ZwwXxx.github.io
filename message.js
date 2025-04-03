function handleResponse(response) {
    // 修改为匹配云函数实际返回的格式
    if (response && response.ok) {
        // 显示成功信息
        successMessage.style.display = 'block';
        
        // 清空表单
        messageForm.reset();
        
        // 启动冷却计时器
        startCooldown();
        
        // 3秒后隐藏成功信息
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    } else {
        // 显示错误信息
        alert(response.msg || '提交失败，请稍后重试');
    }
} 