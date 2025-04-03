import cloud from "@lafjs/cloud";
import { ObjectId } from "mongodb";

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

// 添加留言
export async function addMessage(ctx: FunctionContext) {
  const { name, email, content } = ctx.body;

  // 验证必填字段
  if (!name || !email || !content) {
    return { error: "姓名、邮箱和留言内容不能为空" };
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "邮箱格式不正确" };
  }

  // 验证内容长度
  if (content.length < 10) {
    return { error: "留言内容不能少于10个字符" };
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
      success: true,
      message: "留言提交成功",
      data: { id: result.id }
    };
  } catch (error) {
    console.error("添加留言失败:", error);
    return { error: "留言提交失败，请稍后重试" };
  }
}

// 获取留言列表
export async function getMessages(ctx: FunctionContext) {
  try {
    const { page = 1, limit = 10, sort = "desc", keyword = "" } = ctx.query as unknown as QueryParams;

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

    const { data: messages } = await db.collection("messages")
      .where(query)
      .orderBy(sortField)
      .skip(skip)
      .limit(limit)
      .get();

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
      success: true,
      data: {
        messages: formattedMessages,
        total,
        page,
        limit
      }
    };
  } catch (error) {
    console.error("获取留言失败:", error);
    return { error: "获取留言数据失败，请刷新页面重试" };
  }
}

// 删除留言
export async function deleteMessage(ctx: FunctionContext) {
  try {
    const { id } = ctx.params;

    if (!id) {
      return { error: "留言ID不能为空" };
    }

    const { deleted } = await db.collection("messages").doc(id).remove();

    if (deleted === 0) {
      return { error: "未找到要删除的留言" };
    }

    return {
      success: true,
      message: "删除成功"
    };
  } catch (error) {
    console.error("删除留言失败:", error);
    return { error: "删除失败，请稍后重试" };
  }
}

// 更新留言状态（已读/未读）
export async function updateMessageStatus(ctx: FunctionContext) {
  try {
    const { id } = ctx.params;
    const { status } = ctx.body;

    if (!id) {
      return { error: "留言ID不能为空" };
    }

    if (status !== "read" && status !== "unread") {
      return { error: "状态值无效，应为 'read' 或 'unread'" };
    }

    const { updated } = await db.collection("messages").doc(id).update({
      status
    });

    if (updated === 0) {
      return { error: "未找到要更新的留言" };
    }

    return {
      success: true,
      message: `已将留言标记为${status === "read" ? "已读" : "未读"}`
    };
  } catch (error) {
    console.error("更新留言状态失败:", error);
    return { error: "更新状态失败，请稍后重试" };
  }
}

// 获取留言统计数据
export async function getMessageStats(ctx: FunctionContext) {
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
      success: true,
      data: {
        totalMessages,
        unreadMessages,
        todayMessages
      }
    };
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return { error: "获取统计数据失败" };
  }
}

// 获取留言趋势数据（过去7天）
export async function getMessageTrend(ctx: FunctionContext) {
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
      success: true,
      data: result
    };
  } catch (error) {
    console.error("获取趋势数据失败:", error);
    return { error: "获取趋势数据失败" };
  }
} 