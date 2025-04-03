import cloud from "@lafjs/cloud";

const db = cloud.database();
const _ = db.command;

interface Message {
  name: string;
  email: string;
  content: string;
  timestamp: string;
  status?: string; // 已读/未读状态
  attachment?: string; // 附件URL，可选
}

interface QueryParams {
  page: number;
  limit: number;
  sort: string;
  keyword?: string;
}

export async function main(ctx: FunctionContext) {
  // 处理GET请求 - 查询留言
  if (ctx.method === 'GET') {
    // 检查是否是统计或趋势请求
    if (ctx.path.includes('/stats')) {
      return await getMessageStats(ctx);
    }
    if (ctx.path.includes('/trend')) {
      return await getMessageTrend(ctx);
    }
    return await getMessages(ctx);
  }

  // 处理POST请求 - 添加留言
  if (ctx.method === 'POST') {
    // 检查是否是上传文件请求
    if (ctx.path.includes('/upload')) {
      return await uploadFile(ctx);
    }
    return await addMessage(ctx);
  }

  // 处理DELETE请求 - 删除留言
  if (ctx.method === 'DELETE') {
    return await deleteMessage(ctx);
  }

  // 处理PATCH请求 - 更新留言状态
  if (ctx.method === 'PATCH') {
    return await updateMessageStatus(ctx);
  }

  // 如果不是以上请求类型，返回错误
  return {
    ok: false,
    msg: "不支持的请求类型"
  };
}

// 添加留言
async function addMessage(ctx: FunctionContext) {
  const { name, email, content } = ctx.body;

  // 验证必填字段
  if (!name || !email || !content) {
    return {
      ok: false,
      msg: "姓名、邮箱和留言内容不能为空"
    };
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      ok: false,
      msg: "邮箱格式不正确"
    };
  }

  // 验证内容长度
  if (content.length < 10) {
    return {
      ok: false,
      msg: "留言内容不能少于10个字符"
    };
  }

  const message: Message = {
    name,
    email,
    content,
    timestamp: new Date().toISOString(),
    status: "unread" // 默认未读状态
  };

  // 如果有附件，处理附件
  if (ctx.files && ctx.files.attachment) {
    // 这里需要根据实际文件存储方式处理
    // 示例：上传到云存储并获取URL
    // const fileUrl = await uploadFile(ctx.files.attachment);
    // message.attachment = fileUrl;
  }

  try {
    const result = await db.collection("messages").add(message);

    return {
      ok: true,
      msg: '留言提交成功！',
      data: { id: result.id }
    };
  } catch (error) {
    console.error("添加留言失败:", error);
    return {
      ok: false,
      msg: "留言提交失败，请稍后重试"
    };
  }
}

// 获取留言列表
async function getMessages(ctx: FunctionContext) {
  try {
    console.log("查询参数:", ctx.query); // 添加日志查看接收到的参数

    // 处理查询参数，确保类型转换正确
    const page = parseInt(ctx.query.page as string) || 1;
    const limit = parseInt(ctx.query.limit as string) || 10;
    const sort = (ctx.query.sort as string) || "desc";
    const keyword = (ctx.query.keyword as string) || "";

    // 构建查询条件
    let query = {};

    // 如果有关键字，添加搜索条件
    if (keyword) {
      query = {
        _or: [
          { name: db.RegExp({ regexp: keyword, options: 'i' }) },
          { content: db.RegExp({ regexp: keyword, options: 'i' }) }
        ]
      };
    }

    // 计算总数
    const countResult = await db.collection("messages").where(query).count();
    const total = countResult.total;

    // 查询分页数据
    const sortField = { timestamp: sort === "desc" ? -1 : 1 };
    const skip = (page - 1) * limit;

    console.log("查询条件:", {
      query, sortField, skip, limit
    });

    const { data: messages } = await db.collection("messages")
      .where(query)
      .orderBy(sortField)
      .skip(skip)
      .limit(limit)
      .get();

    console.log("查询结果:", messages.length);

    // 处理返回结果
    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      name: msg.name,
      email: msg.email,
      content: msg.content,
      timestamp: msg.timestamp,
      status: msg.status || "unread",
      attachment: msg.attachment
    }));

    return {
      ok: true,
      msg: '获取留言成功',
      data: {
        messages: formattedMessages,
        total,
        page: Number(page),
        limit: Number(limit)
      }
    };
  } catch (error) {
    console.error("获取留言失败:", error);
    return {
      ok: false,
      msg: "获取留言数据失败，请刷新页面重试"
    };
  }
}

// 删除留言
async function deleteMessage(ctx: FunctionContext) {
  try {
    console.log("删除参数:", ctx.query); // 查看删除请求的参数

    // 支持两种方式获取ID：查询参数或URL路径
    const idFromQuery = ctx.query.id as string;
    const idFromPath = ctx.path.split('/').pop();

    // 优先使用查询参数中的ID
    const id = idFromQuery || idFromPath;

    console.log("要删除的ID:", id);

    if (!id) {
      return {
        ok: false,
        msg: "留言ID不能为空"
      };
    }

    const { deleted } = await db.collection("messages").doc(id).remove();
    console.log("删除结果:", { deleted });

    if (deleted === 0) {
      return {
        ok: false,
        msg: "未找到要删除的留言"
      };
    }

    return {
      ok: true,
      msg: "删除成功"
    };
  } catch (error) {
    console.error("删除留言失败:", error);
    return {
      ok: false,
      msg: "删除失败，请稍后重试"
    };
  }
}

// 更新留言状态（已读/未读）
async function updateMessageStatus(ctx: FunctionContext) {
  try {
    const { id, status } = ctx.body;

    if (!id) {
      return {
        ok: false,
        msg: "留言ID不能为空"
      };
    }

    if (status !== "read" && status !== "unread") {
      return {
        ok: false,
        msg: "状态值无效，应为 'read' 或 'unread'"
      };
    }

    const { updated } = await db.collection("messages").doc(id).update({
      status
    });

    if (updated === 0) {
      return {
        ok: false,
        msg: "未找到要更新的留言"
      };
    }

    return {
      ok: true,
      msg: `已将留言标记为${status === "read" ? "已读" : "未读"}`
    };
  } catch (error) {
    console.error("更新留言状态失败:", error);
    return {
      ok: false,
      msg: "更新状态失败，请稍后重试"
    };
  }
}

// 获取留言统计数据
async function getMessageStats(ctx: FunctionContext) {
  try {
    // 获取总留言数
    const { total: totalMessages } = await db.collection("messages").count();

    // 获取未读留言数
    const { total: unreadMessages } = await db.collection("messages")
      .where({ status: "unread" })
      .count();

    // 获取今日留言数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { total: todayMessages } = await db.collection("messages")
      .where({
        timestamp: _.gte(today.toISOString())
      })
      .count();

    return {
      ok: true,
      msg: '获取统计数据成功',
      data: {
        totalMessages,
        unreadMessages,
        todayMessages
      }
    };
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return {
      ok: false,
      msg: "获取统计数据失败"
    };
  }
}

// 获取留言趋势数据（过去7天）
async function getMessageTrend(ctx: FunctionContext) {
  try {
    const days = 7;
    const result = [];

    // 生成过去7天的日期
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // 查询当天的留言数
      const { total } = await db.collection("messages")
        .where({
          timestamp: _.and(_.gte(date.toISOString()), _.lt(nextDate.toISOString()))
        })
        .count();

      result.push({
        date: date.toISOString().split('T')[0],
        count: total
      });
    }

    return {
      ok: true,
      msg: '获取趋势数据成功',
      data: result
    };
  } catch (error) {
    console.error("获取趋势数据失败:", error);
    return {
      ok: false,
      msg: "获取趋势数据失败"
    };
  }
}

// 文件上传处理
async function uploadFile(ctx: FunctionContext) {
  try {
    // 检查是否有文件
    if (!ctx.files || !ctx.files.file) {
      return {
        ok: false,
        msg: "未检测到上传的文件"
      };
    }

    const file = ctx.files.file;

    // 在实际环境中，这里应该添加文件上传到云存储的代码
    // 示例：
    // const storage = cloud.storage();
    // const fileID = await storage.uploadFile(file);

    // 返回模拟的文件URL
    const fileUrl = `https://example.com/uploads/${Date.now()}_${file.name}`;

    return {
      ok: true,
      msg: "文件上传成功",
      data: { url: fileUrl }
    };
  } catch (error) {
    console.error("文件上传失败:", error);
    return {
      ok: false,
      msg: "文件上传失败，请稍后重试"
    };
  }
} 