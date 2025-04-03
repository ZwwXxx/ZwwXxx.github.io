// 创建全局管理员API对象
const adminApi = {
  /**
   * 获取留言列表
   * @param {Object} params - 分页、排序、搜索参数
   * @returns {Promise}
   */
  getMessages: async (params) => {
    try {
      const url = 'https://n9xj0l1pzp.hzh.sealos.run/messages';
      // 添加时间戳防止缓存
      params._t = new Date().getTime();
      
      const response = await axios.get(url, { 
        params,
        timeout: 15000 // 增加超时时间
      });
      
      if (response.status !== 200) {
        throw new Error('API请求失败');
      }
      
      return response.data;
    } catch (error) {
      console.error('获取留言失败:', error);
      
      // 返回统一格式的错误对象
      return {
        ok: false,
        msg: error.response?.data?.msg || error.message || '获取留言失败，请检查网络连接'
      };
    }
  },
  
  /**
   * 删除留言
   * @param {string} id - 留言ID
   * @returns {Promise}
   */
  deleteMessage: async (id) => {
    try {
      const url = `https://n9xj0l1pzp.hzh.sealos.run/messages`;
      
      const response = await axios.delete(url, { 
        params: { id },
        timeout: 15000 // 增加超时时间
      });
      
      if (response.status !== 200) {
        throw new Error('API请求失败');
      }
      
      return response.data;
    } catch (error) {
      console.error('删除留言失败:', error);
      
      // 返回统一格式的错误对象
      return {
        ok: false,
        msg: error.response?.data?.msg || error.message || '删除留言失败，请检查网络连接'
      };
    }
  },
  
  /**
   * 获取留言统计数据
   * @returns {Promise}
   */
  getMessageStats: async () => {
    try {
      const url = 'https://n9xj0l1pzp.hzh.sealos.run/messages/stats';
      
      const response = await axios.get(url, {
        timeout: 15000 // 增加超时时间
      });
      
      if (response.status !== 200) {
        throw new Error('API请求失败');
      }
      
      return response.data;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      
      // 返回统一格式的错误对象
      return {
        ok: false,
        msg: error.response?.data?.msg || error.message || '获取统计数据失败，请检查网络连接'
      };
    }
  }
};

// DOM 元素
const messageTableBody = document.getElementById('messageTableBody');
const emptyState = document.getElementById('emptyState');
const messagePagination = document.getElementById('messagePagination');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const logoutBtn = document.getElementById('logoutBtn');
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const timeSort = document.querySelector('.message-table__sort[data-sort="time"]');

// 全局状态
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;
let sortDirection = 'desc'; // 默认按时间降序排列
let searchKeyword = '';
let messageData = []; // 存储留言数据
let selectedMessageId = null; // 当前选中要删除的留言ID

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();
    
    // 获取留言数据
    fetchMessages();
    
    // 添加事件监听
    initEventListeners();
});

/**
 * 初始化事件监听
 */
function initEventListeners() {
    // 登出按钮
    logoutBtn.addEventListener('click', handleLogout);
    
    // 搜索功能
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 时间排序
    timeSort.addEventListener('click', toggleSortDirection);
    
    // 删除确认弹窗
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', confirmDelete);
    
    // 点击页面空白处关闭弹窗
    deleteModal.addEventListener('click', function(e) {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });
}

/**
 * 检查登录状态
 */
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    
    if (!isLoggedIn) {
        // 未登录，跳转到登录页面
        window.location.href = 'login.html';
    }
}

/**
 * 处理登出
 */
function handleLogout() {
    // 清除登录状态
    localStorage.removeItem('adminLoggedIn');
    
    // 跳转到登录页面
    window.location.href = 'login.html';
}

/**
 * 获取留言数据
 * @param {number} page - 当前页码
 */
async function fetchMessages(page = 1) {
    try {
        // 显示加载状态
        showLoading(true);
        
        // 构建API请求参数
        const params = {
            page: page,
            limit: itemsPerPage,
            sort: sortDirection,
            keyword: searchKeyword
        };
        
        console.log("管理界面发送查询参数:", params);
        
        // 发送API请求获取留言数据
        const response = await adminApi.getMessages(params);
        console.log("管理界面接收查询结果:", response);
        
        // 检查响应格式
        if (!response.ok) {
            throw new Error(response.msg || '查询失败');
        }
        
        // 确保数据格式正确
        const data = response.data || { messages: [], total: 0 };
        
        // 更新页码信息
        currentPage = page;
        totalPages = Math.ceil(data.total / itemsPerPage);
        
        // 更新留言数据
        messageData = data.messages || [];
        
        // 如果当前页没有数据，并且有前一页，则查询前一页
        if (messageData.length === 0 && currentPage > 1 && data.total > 0) {
            return fetchMessages(currentPage - 1);
        }
        
        // 渲染留言表格
        renderMessagesTable();
        
        // 渲染分页控件
        renderPagination();
        
        // 显示/隐藏空状态
        toggleEmptyState(messageData.length === 0);
        
    } catch (error) {
        console.error('获取留言数据失败:', error);
        alert('获取留言数据失败，请刷新页面重试');
    } finally {
        // 隐藏加载状态
        showLoading(false);
    }
}

/**
 * 渲染留言表格
 */
function renderMessagesTable() {
    // 清空表格
    messageTableBody.innerHTML = '';
    
    // 遍历留言数据并创建表格行
    messageData.forEach(message => {
        const row = document.createElement('tr');
        
        // 格式化日期
        const timestamp = new Date(message.timestamp);
        const formattedDate = `${timestamp.getFullYear()}-${padZero(timestamp.getMonth() + 1)}-${padZero(timestamp.getDate())} ${padZero(timestamp.getHours())}:${padZero(timestamp.getMinutes())}`;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${escapeHTML(message.name)}</td>
            <td>${escapeHTML(message.email)}</td>
            <td class="message-content">${escapeHTML(message.content)}</td>
            <td class="message-actions">
                <button data-id="${message.id}" class="delete-btn">
                    <i class="fas fa-trash-alt"></i> 删除
                </button>
            </td>
        `;
        
        messageTableBody.appendChild(row);
    });
    
    // 绑定删除按钮事件
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const messageId = this.getAttribute('data-id');
            openDeleteModal(messageId);
        });
    });
}

/**
 * 渲染分页控件
 */
function renderPagination() {
    messagePagination.innerHTML = '';
    
    // 如果只有一页，不显示分页
    if (totalPages <= 1) {
        messagePagination.style.display = 'none';
        return;
    }
    
    messagePagination.style.display = 'flex';
    
    // 上一页按钮
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchMessages(currentPage - 1);
        }
    });
    messagePagination.appendChild(prevButton);
    
    // 页码按钮
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.toggle('active', i === currentPage);
        pageButton.addEventListener('click', () => {
            if (i !== currentPage) {
                fetchMessages(i);
            }
        });
        messagePagination.appendChild(pageButton);
    }
    
    // 下一页按钮
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            fetchMessages(currentPage + 1);
        }
    });
    messagePagination.appendChild(nextButton);
}

/**
 * 切换排序方向
 */
function toggleSortDirection() {
    // 切换排序方向
    sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    
    // 更新排序图标
    const sortIcon = timeSort.querySelector('i');
    sortIcon.className = sortDirection === 'desc' ? 'fas fa-sort-down' : 'fas fa-sort-up';
    
    // 重新获取数据
    fetchMessages(1);
}

/**
 * 处理搜索
 */
function handleSearch() {
    searchKeyword = searchInput.value.trim();
    fetchMessages(1);
}

/**
 * 打开删除确认弹窗
 * @param {string} messageId - 留言ID
 */
function openDeleteModal(messageId) {
    selectedMessageId = messageId;
    deleteModal.classList.add('active');
}

/**
 * 关闭删除确认弹窗
 */
function closeDeleteModal() {
    deleteModal.classList.remove('active');
    selectedMessageId = null;
}

/**
 * 确认删除留言
 */
async function confirmDelete() {
    if (!selectedMessageId) return;
    
    try {
        // 显示加载状态
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 删除中...';
        confirmDeleteBtn.disabled = true;
        
        // 发送删除请求
        await adminApi.deleteMessage(selectedMessageId);
        
        // 关闭弹窗
        closeDeleteModal();
        
        // 删除后重新获取当前页数据
        // 保持在相同页码，以便后续数据自动补位
        await fetchMessages(currentPage);
        
    } catch (error) {
        console.error('删除留言失败:', error);
        alert('删除失败，请重试');
    } finally {
        // 恢复按钮状态
        confirmDeleteBtn.innerHTML = '确认删除';
        confirmDeleteBtn.disabled = false;
    }
}

/**
 * 显示/隐藏空状态
 * @param {boolean} isEmpty - 是否为空
 */
function toggleEmptyState(isEmpty) {
    if (isEmpty) {
        emptyState.style.display = 'block';
        messageTableBody.parentElement.parentElement.style.display = 'none';
        messagePagination.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        messageTableBody.parentElement.parentElement.style.display = 'block';
    }
}

/**
 * 显示/隐藏加载状态
 * @param {boolean} isLoading - 是否显示加载
 */
function showLoading(isLoading) {
    // 可根据需要实现加载状态
    document.body.style.cursor = isLoading ? 'wait' : 'default';
}

/**
 * 数字补零
 * @param {number} num - 数字
 * @returns {string} 补零后的字符串
 */
function padZero(num) {
    return num.toString().padStart(2, '0');
}

/**
 * 转义HTML字符
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
} 