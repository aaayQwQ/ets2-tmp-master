import fetch from 'node-fetch';

export class TruckersMPPlugin extends plugin {
    constructor() {
        super({
            name: "TruckersMP查询",
            dsc: "查询玩家在TruckersMP的信息",
            event: "message.group",
            atme: true
        });
    }

    async accept() {
        if (this.e.user_id == this.e.self_id) return;

        const message = this.e.raw_message.trim(); // 获取消息并去除首尾空格
        const commandIndex = message.indexOf('服务器状态'); // 查找查询命令在消息中的位置
        if (commandIndex !== -1) {
            try {
                const serverStatus = await this.fetchServerStatus(); // 调用获取服务器状态的方法
                await this.reply(serverStatus); // 发送服务器状态到 QQ 群中
            } catch (error) {
                console.error('获取服务器状态时出错:', error);
                await this.reply('获取服务器状态时出错，请稍后再试'); // 发送错误提示到 QQ 群中
            }
        }
    }

    async fetchServerStatus() {
        const url = 'https://api.truckersmp.com/v2/servers';
        const response = await fetch(url);
        const data = await response.json();
        let serverStatus = 'TruckersMP 服务器状态：\n\n';
        for (const server of data.response) {
            serverStatus += `服务器名称: ${server.name}\n`;
            serverStatus += `当前玩家人数: ${server.players}/${server.maxplayers}，等待人数: ${server.queue}\n`;
            serverStatus += `是否限速: ${server.speedlimiter ? '是' : '否'}，是否碰撞: ${server.collisions ? '是' : '否'}\n\n`;
        }
        return serverStatus;
    }
}
