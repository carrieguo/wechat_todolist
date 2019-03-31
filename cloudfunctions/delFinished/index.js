// 使用了 async await 语法
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    const {OPENID, APPID} = cloud.getWXContext() // 这里获取到的 openId 和 appId 是可信的

    try {
        return await db.collection('counters').where({
            _openid: OPENID,
            'item.finished': true
        }).remove()
    } catch (e) {
        console.error(e)
    }
}