// 创建axios实例
const api = axios.create({
  baseURL: 'https://n9xj0l1pzp.hzh.sealos.run', // 修改为正确的基础URL
  timeout: 15000, // 增加超时时间
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = config.params || {};
      config.params._t = new Date().getTime();
    }
    return config;
  },
  error => {
    console.error('请求配置错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    // 对响应数据做些处理
    return response.data;
  },
  error => {
    // 对响应错误做些处理
    if (error.response) {
      // 服务器返回了错误状态码
      console.error('请求错误:', error.response.status, error.response.data);
    } else if (error.request) {
      // 请求发送成功，但没有收到响应
      console.error('网络错误，未收到响应', error.request);
    } else {
      // 请求配置出现错误
      console.error('请求配置错误:', error.message);
    }
    // 返回一个带有错误信息的对象，而不是拒绝Promise
    return {
      ok: false,
      msg: error.response?.data?.msg || error.message || '请求失败，请检查网络连接'
    };
  }
);

// 全局API对象
window.messageApi = {
  /**
   * 提交留言
   * @param {Object} data - 留言数据
   * @returns {Promise}
   */
  submitMessage: (data) => {
    try {
      return api.post('/messages', data);
    } catch (error) {
      console.error('提交留言错误:', error);
      return { ok: false, msg: '网络错误，请稍后重试' };
    }
  },

  /**
   * 获取留言列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getMessages: (params) => {
    try {
      console.log("发送查询参数:", params);
      // 确保参数都是字符串类型
      const queryParams = {
        page: params.page.toString(),
        limit: params.limit.toString(),
        sort: params.sort || "desc",
        keyword: params.keyword || ""
      };
      return api.get('/messages', { params: queryParams });
    } catch (error) {
      console.error('获取留言列表错误:', error);
      return { ok: false, msg: '网络错误，请稍后重试' };
    }
  },

  /**
   * 删除留言
   * @param {string} id - 留言ID
   * @returns {Promise}
   */
  deleteMessage: (id) => {
    try {
      return api.delete('/messages', { params: {id: id} });
    } catch (error) {
      console.error('删除留言错误:', error);
      return { ok: false, msg: '网络错误，请稍后重试' };
    }
  },

  /**
   * 更新留言状态
   * @param {string} id - 留言ID
   * @param {string} status - 状态值 ('read' 或 'unread')
   * @returns {Promise}
   */
  updateMessageStatus: (id, status) => {
    try {
      return api.patch('/messages', { id, status });
    } catch (error) {
      console.error('更新状态错误:', error);
      return { ok: false, msg: '网络错误，请稍后重试' };
    }
  },

  /**
   * 获取留言统计数据
   * @returns {Promise}
   */
  getMessageStats: () => {
    try {
      return api.get('/messages/stats');
    } catch (error) {
      console.error('获取统计数据错误:', error);
      return { ok: false, msg: '网络错误，请稍后重试' };
    }
  },

  /**
   * 获取留言趋势数据
   * @returns {Promise}
   */
  getMessageTrend: () => {
    try {
      return api.get('/messages/trend');
    } catch (error) {
      console.error('获取趋势数据错误:', error);
      return { ok: false, msg: '网络错误，请稍后重试' };
    }
  }
};

// 文件上传API
window.uploadApi = {
  /**
   * 上传文件
   * @param {File} file - 文件对象
   * @returns {Promise}
   */
  uploadFile: (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      return api.post('/messages/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      console.error('文件上传错误:', error);
      return { ok: false, msg: '网络错误，请稍后重试' };
    }
  }
};

// 暴露api对象到全局
window.api = api; 