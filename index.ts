import cloud from "@lafjs/cloud";
import { createHash } from "crypto";

const db = cloud.database();
const _ = db.command
export async function main(ctx: FunctionContext) {
  const { username, password, code, uuid } = ctx.body;
  // 查询验证码，有则删除
  const { deleted } = await db.collection('codes').where({ type: 1, _id: uuid, code, }).remove()
  if (deleted !== 1) return { error: '验证码不正确！' }

  // 校验用户名和密码是否为空
  if (!username || !password) {
    return { error: "用户名或密码不能为空" };
  }

  // 查询数据库，查找符合 username 或 email 等于 body 参数的记录
  const { data: user } = await db.collection("users").where({
    // _or: [
    //   { username },
    //   { email: username },
    //   { phone: username },
    // ],
    username,
    password: createHash("sha256").update(password).digest("hex"),
  }).getOne();
  // 如果没有找到记录，返回错误原因：用户名或密码错误
  if (user.lock === 1) return { error: '用户已被锁定，请联系管理员！' }
  if (user) {
    let query = {
      lastIp: ctx.headers['x-real-ip']
    }
    const { updated } = await db.collection('users').where({ _id: user._id }).update(query)
  } else {
    return { error: "用户名或密码错误" };
  }

  // // 校验密码是否正确，不正确则返回错误原因：用户名或密码错误
  // if (user.password !== createHash("sha256").update(password).digest("hex")) {
  //   return { error: "用户名或密码错误" };
  // }

  // 返回登录成功信息
  return {
    ok: true,
    msg: '登录成功！',
    data: user
  }
} 