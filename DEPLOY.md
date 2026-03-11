# 部署文档

## 快速部署指南

### 1. 准备服务器

推荐使用 Ubuntu 20.04+ 或 CentOS 7+

### 2. 安装依赖

```bash
# 安装 Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装 Nginx
apt install -y nginx

# 安装 PM2
npm install -g pm2
```

### 3. 上传代码

```bash
# 克隆或上传代码到服务器
cd /var/www/movie-site

# 安装依赖
npm install

# 构建前端
npm run build
```

### 4. 配置环境变量

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置（按需修改）
vim .env
```

### 5. 启动后端服务

```bash
# 使用 PM2 启动
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

### 6. 配置 Nginx

```bash
# 复制配置文件
cp nginx.conf.example /etc/nginx/sites-available/movie-site

# 编辑域名配置
vim /etc/nginx/sites-available/movie-site
# 修改 server_name 为你的域名

# 启用配置
ln -s /etc/nginx/sites-available/movie-site /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

### 7. 配置 SSL（可选但推荐）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期测试
certbot renew --dry-run
```

## 目录结构

```
/var/www/movie-site/
├── dist/              # 构建后的前端文件
├── src/               # 后端源代码
├── logs/              # 日志目录
├── .env               # 环境配置
├── ecosystem.config.js # PM2 配置
└── nginx.conf.example  # Nginx 配置示例
```

## 常用命令

### PM2 管理
```bash
pm2 status              # 查看状态
pm2 logs movie-site     # 查看日志
pm2 restart movie-site  # 重启服务
pm2 stop movie-site     # 停止服务
pm2 delete movie-site   # 删除服务
```

### Nginx 管理
```bash
systemctl status nginx   # 查看状态
systemctl restart nginx  # 重启
systemctl stop nginx     # 停止
nginx -t                 # 测试配置
```

## 注意事项

1. **防火墙**: 确保开放 80 (HTTP) 和 443 (HTTPS) 端口
2. **日志轮转**: 配置 logrotate 防止日志文件过大
3. **监控**: 建议使用 PM2 Monitor 或其他监控工具
4. **备份**: 定期备份 .env 文件和重要配置
5. **更新**: 更新时先 `npm run build` 再重启服务

## 故障排查

### 后端无法启动
```bash
# 查看 PM2 日志
pm2 logs movie-site

# 检查端口占用
lsof -i :3001

# 检查 Node.js 版本
node -v
```

### 前端无法访问
```bash
# 检查 Nginx 配置
nginx -t

# 检查 dist 目录是否存在
ls -la dist/

# 查看 Nginx 日志
tail -f /var/log/nginx/error.log
```

### 视频无法播放
- 检查视频源是否有效
- 检查代理端点是否正常工作
- 查看浏览器控制台错误信息
