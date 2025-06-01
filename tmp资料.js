import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export class TruckersMPPlugin extends plugin {
    constructor() {
        super({
            name: "TruckersMP查询",
            dsc: "查询玩家在TruckersMP的信息",
            event: "message.group",
            atme: true
        });

        // 初始化 INI 数据库
        this.dbFile = path.resolve(import.meta.url.replace(/^file:\/\/\//, '').replace(/\/[^/]+$/, ''), 'tmpdata.ini');
        this.db = this.loadDatabase();
    }

    loadDatabase() {
        try {
            if (!fs.existsSync(this.dbFile)) {
                fs.writeFileSync(this.dbFile, '{}');
            }
            const data = fs.readFileSync(this.dbFile, 'utf-8');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('无法加载数据库文件:', error);
            return {};
        }
    }

    saveDatabase() {
        try {
            fs.writeFileSync(this.dbFile, JSON.stringify(this.db));
        } catch (error) {
            console.error('无法保存数据库文件:', error);
        }
    }

    async accept() {
        if (this.e.user_id == this.e.self_id) return;

        const command = '查询';
        const message = this.e.raw_message.trim();
        const commandIndex = message.indexOf(command);
        
        if (commandIndex !== -1) {
            let playerName = message.substring(commandIndex + command.length).trim();
            if (!playerName) {
                playerName = this.db[this.e.user_id]?.playerName; // 检查是否已绑定玩家名称
            }

            if (playerName) {
                try {
                    const playerInfoResult = await this.getPlayerInfo(playerName);
                    if (playerInfoResult) {
                        await this.reply(playerInfoResult.playerInfo, { image: playerInfoResult.avatarData });
                    } else {
                        await this.reply("无法获取玩家信息，请稍后重试");
                    }
                } catch (error) {
                    console.error('处理查询时出错:', error);
                    await this.reply("处理查询时出错，请稍后重试");
                }
            } else {
                await this.reply("请输入要查询的玩家名称");
            }
        } else if (message.startsWith('绑定')) {
            const playerName = message.substring('绑定'.length).trim();
            if (playerName) {
                this.bindPlayer(this.e.user_id, playerName);
                await this.reply(`已将玩家${playerName}绑定到您的账号`);
                // 保存数据到本地文件
                this.saveDatabase();
            } else {
                await this.reply("请输入要绑定的玩家名称");
            }
        } else if (message === '解除绑定') {
            if (this.db[this.e.user_id]) {
                delete this.db[this.e.user_id];
                await this.reply("已解除绑定");
                // 保存数据到本地文件
                this.saveDatabase();
            } else {
                await this.reply("您尚未绑定任何玩家");
            }
        } else if (message === '删除个人数据') {
            delete this.db[this.e.user_id];
            await this.reply("您的个人数据已成功删除");
            // 保存数据到本地文件
            this.saveDatabase();
        }
    }

    async getPlayerInfo(playerName) {
        const url = `https://api.truckersmp.com/v2/player/${encodeURIComponent(playerName)}`;
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`TruckersMP API 请求失败: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.response) {
            return null;
        }
        const playerNameInfo = data.response.name;
        const playerId = data.response.id;
        const isGameAdmin = data.response.isGameAdmin ? '是' : '否'; // 是否管理员
        const avatarUrl = data.response.avatar;
        const avatarResponse = await fetch(avatarUrl);
        const avatarBuffer = await avatarResponse.arrayBuffer();
        const avatarData = Buffer.from(avatarBuffer);
        const joinDate = data.response.joinDate;
        const joinDays = Math.ceil((new Date() - new Date(joinDate)) / (1000 * 60 * 60 * 24)); // 计算加入天数
        const banned = data.response.banned ? '是' : '否';
        let playerInfo = `玩家昵称: ${playerNameInfo}\n玩家ID: ${playerId}\n是否管理员: ${isGameAdmin}\n加入时间: ${joinDate}\n加入天数: ${joinDays} 天\n是否封禁: ${banned}`;
        if (data.response.banned) {
            const banExpire = data.response.banExpire ? data.response.banExpire : ' ';
            const banCount = data.response.bansCount ? data.response.bansCount : ' ';
            playerInfo += `\n封禁时间: ${banExpire}\n封禁次数: ${banCount}`;
        }
        const onlineStatus = data.response.online ? '在线' : '离线'; // 在线状态
        const steamId64 = data.response.steamID64;
        const steamId = data.response.steamID;
        const vtcInfo = data.response.vtc;
        let vtcInfoText;
        if (vtcInfo && vtcInfo.id !== 0) {
            vtcInfoText = `VTC ID: ${vtcInfo.id}\nVTC 名称: ${vtcInfo.name}\nVTC 标签: ${vtcInfo.tag}`;
        } else {
            vtcInfoText = "VTC: 此玩家未加入 VTC";
        }
        const servers = data.response.servers;
        playerInfo += `\nSteam ID64: ${steamId64}\nSteam ID: ${steamId}\n${vtcInfoText}`;
        return { playerInfo, avatarData, online: data.response.online };
    }

    bindPlayer(userId, playerName) {
        this.db[userId] = { playerName };
    }
}
