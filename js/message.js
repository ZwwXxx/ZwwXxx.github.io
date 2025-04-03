// DOM 元素
const messageForm = document.getElementById('messageForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const contentInput = document.getElementById('content');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');

// 表单提交冷却时间（秒）
const COOLDOWN_TIME = 60;
let cooldownTimer = null;
let remainingCooldown = 0;

// 使用全局变量
// 不需要导入，api.js已经将messageApi挂载到window对象上

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加表单提交事件监听
    if (messageForm) {
        messageForm.addEventListener('submit', handleSubmit);
        
        // 添加输入验证事件
        nameInput.addEventListener('blur', validateName);
        emailInput.addEventListener('blur', validateEmail);
        contentInput.addEventListener('blur', validateContent);
        
        // 输入时移除错误状态
        const inputs = [nameInput, emailInput, contentInput];
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                removeError(input);
            });
        });
    }
});

/**
 * 表单提交处理函数
 * @param {Event} e - 事件对象
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    // 如果按钮被禁用，不执行提交
    if (submitBtn.disabled) {
        return;
    }
    
    // 表单验证
    if (!validateForm()) {
        return;
    }
    
    // 获取表单数据
    const formData = getFormData();
    
    try {
        // 显示加载状态
        showLoading(true);
        
        // 发送请求到云函数
        const response = await submitToCloudFunction(formData);
        
        // 处理响应
        handleResponse(response);
    } catch (error) {
        console.error('提交留言时出错:', error);
        showError('提交失败，请稍后重试');
    } finally {
        // 隐藏加载状态
        showLoading(false);
    }
}

/**
 * 表单验证
 * @returns {boolean} 验证结果
 */
function validateForm() {
    const nameValid = validateName();
    const emailValid = validateEmail();
    const contentValid = validateContent();
    
    return nameValid && emailValid && contentValid;
}

/**
 * 验证姓名
 * @returns {boolean} 验证结果
 */
function validateName() {
    const value = nameInput.value.trim();
    
    if (!value) {
        showError(nameInput, '请输入您的姓名');
        return false;
    }
    
    if (value.length > 20) {
        showError(nameInput, '姓名不能超过20个字符');
        return false;
    }
    
    removeError(nameInput);
    return true;
}

/**
 * 验证邮箱
 * @returns {boolean} 验证结果
 */
function validateEmail() {
    const value = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!value) {
        showError(emailInput, '请输入您的邮箱');
        return false;
    }
    
    if (!emailRegex.test(value)) {
        showError(emailInput, '请输入有效的邮箱地址');
        return false;
    }
    
    removeError(emailInput);
    return true;
}

/**
 * 验证留言内容
 * @returns {boolean} 验证结果
 */
function validateContent() {
    const value = contentInput.value.trim();
    
    if (!value) {
        showError(contentInput, '请输入留言内容');
        return false;
    }
    
    if (value.length < 10) {
        showError(contentInput, '留言内容不能少于10个字符');
        return false;
    }
    
    removeError(contentInput);
    return true;
}

/**
 * 显示错误信息
 * @param {HTMLElement} input - 输入元素
 * @param {string} message - 错误信息
 */
function showError(input, message) {
    const formGroup = input.parentElement;
    const errorElement = formGroup.querySelector('.error-message');
    
    formGroup.classList.add('error');
    errorElement.textContent = message;
}

/**
 * 移除错误状态
 * @param {HTMLElement} input - 输入元素
 */
function removeError(input) {
    const formGroup = input.parentElement;
    const errorElement = formGroup.querySelector('.error-message');
    
    formGroup.classList.remove('error');
    errorElement.textContent = '';
}

/**
 * 获取表单数据并序列化为JSON
 * @returns {Object} 表单数据对象
 */
function getFormData() {
    return {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        content: contentInput.value.trim(),
    };
}

/**
 * 提交数据到云函数
 * @param {Object} data - 表单数据
 * @returns {Promise<Object>} 响应结果
 */
async function submitToCloudFunction(data) {
    try {
        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await window.messageApi.submitMessage(data);
        clearTimeout(timeoutId);
        
        // 如果API返回了错误格式的响应
        if (!response || response.ok === false) {
            throw new Error(response?.msg || '提交失败，请稍后重试');
        }
        
        return response;
    } catch (error) {
        console.error('提交留言时出错:', error);
        throw error;
    }
}

/**
 * 处理响应结果
 * @param {Object} response - 响应数据
 */
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

/**
 * 显示/隐藏加载状态
 * @param {boolean} isLoading - 是否显示加载
 */
function showLoading(isLoading) {
    if (isLoading) {
        submitBtn.classList.add('loading');
    } else {
        submitBtn.classList.remove('loading');
    }
}

/**
 * 启动冷却计时器（防重复提交）
 */
function startCooldown() {
    // 禁用提交按钮
    submitBtn.disabled = true;
    
    // 设置冷却时间
    remainingCooldown = COOLDOWN_TIME;
    
    // 更新按钮文本
    updateCooldownText();
    
    // 启动计时器
    cooldownTimer = setInterval(() => {
        remainingCooldown--;
        
        if (remainingCooldown <= 0) {
            // 冷却结束
            endCooldown();
        } else {
            // 更新按钮文本
            updateCooldownText();
        }
    }, 1000);
}

/**
 * 更新冷却倒计时文本
 */
function updateCooldownText() {
    const btnText = submitBtn.querySelector('.btn-text');
    btnText.textContent = `请等待 ${remainingCooldown} 秒后再次提交`;
}

/**
 * 结束冷却状态
 */
function endCooldown() {
    // 清除计时器
    clearInterval(cooldownTimer);
    
    // 恢复按钮状态
    submitBtn.disabled = false;
    
    // 恢复按钮文本
    const btnText = submitBtn.querySelector('.btn-text');
    btnText.textContent = '提交留言';
} 