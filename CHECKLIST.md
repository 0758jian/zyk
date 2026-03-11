# 部署检查清单 ✅

## 已完成的修改

- [x] 前端 API 地址改为相对路径 `/api`
- [x] Vite 构建配置优化
- [x] 后端支持环境变量配置端口
- [x] 静态资源目录改为 `dist` (生产环境)
- [x] 创建 `.env.example` 环境变量模板
- [x] 创建 `.gitignore` 文件
- [x] 创建 PM2 进程管理配置 `ecosystem.config.js`
- [x] 创建 Nginx 配置示例 `nginx.conf.example`
- [x] 创建部署文档 `DEPLOY.md`
- [x] 创建日志目录 `logs/`
- [x] 添加 npm 启动脚本

## 部署前必须完成

### 1. 域名和 SSL
- [ ] 购买域名
- [ ] 配置 DNS 解析到服务器 IP
- [ ] 准备 SSL 证书（推荐使用 Let's Encrypt 免费证书）

### 2. 服务器准备

#### Debian 10 专用
- [ ] 更新系统：`apt update && apt upgrade -y`
- [ ] 安装工具：`apt install -y curl git wget build-essential`
- [ ] 安装 nvm：`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`
- [ ] 安装 Node.js：`nvm install --lts`
- [ ] 验证版本：`node -v` (应 >= 18.x)
- [ ] 安装 Nginx：`apt install -y nginx`
- [ ] 安装 PM2：`npm install -g pm2`
- [ ] 配置防火墙（开放 80、443 端口）

#### Ubuntu 20.04+
- [ ] 安装 Node.js：`curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs`
- [ ] 验证版本：`node -v` (应 >= 18.x)
- [ ] 安装 Nginx：`apt install -y nginx`
- [ ] 安装 PM2：`npm install -g pm2`
- [ ] 配置防火墙（开放 80、443 端口）

### 3. 代码部署
- [ ] 上传代码到服务器 `/var/www/movie-site`
- [ ] 安装依赖：`npm install`
- [ ] 复制环境配置：`cp .env.example .env`
- [ ] 构建前端：`npm run build`
- [ ] 启动后端：`pm2 start ecosystem.config.js`
- [ ] 保存 PM2: `pm2 save`
- [ ] 配置开机自启：`pm2 startup`

### 4. Nginx 配置
- [ ] 复制配置：`cp nginx.conf.example /etc/nginx/sites-available/movie-site`
- [ ] 修改域名：编辑 `server_name` 为你的域名
- [ ] 启用配置：`ln -s /etc/nginx/sites-available/movie-site /etc/nginx/sites-enabled/`
- [ ] 测试配置：`nginx -t`
- [ ] 重载 Nginx：`systemctl reload nginx`

### 5. SSL 证书（推荐）
- [ ] 安装 Certbot: `apt install certbot python3-certbot-nginx`
- [ ] 获取证书：`certbot --nginx -d yourdomain.com`
- [ ] 测试自动续期：`certbot renew --dry-run`

### 6. 测试验证
- [ ] 访问首页是否正常
- [ ] 视频分类导航是否正常
- [ ] 搜索功能是否正常
- [ ] 视频播放是否正常
- [ ] 移动端适配是否正常
- [ ] HTTPS 是否正常跳转

## 文件清单

```
movie-site/
├── dist/                      # 构建后的前端文件（部署时生成）
├── logs/                      # 日志目录
├── public/                    # 前端源码
│   ├── app.js
│   ├── index.html
│   └── style.css
├── src/                       # 后端源码
│   └── server.js
├── .env                       # 环境配置（需创建）
├── .env.example              # 环境配置模板 ✅
├── .gitignore                # Git 忽略文件 ✅
├── ecosystem.config.js       # PM2 配置 ✅
├── nginx.conf.example        # Nginx 配置示例 ✅
├── DEPLOY.md                 # 部署文档 ✅
├── package.json              # 项目配置 ✅
└── vite.config.js            # Vite 配置 ✅
```

## 快速部署命令

```bash
# 1. 上传代码后执行
cd /var/www/movie-site
npm install
npm run build
cp .env.example .env

# 2. 启动后端
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 3. 配置 Nginx
cp nginx.conf.example /etc/nginx/sites-available/movie-site
# 编辑域名配置...
ln -s /etc/nginx/sites-available/movie-site /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 4. 配置 SSL
certbot --nginx -d yourdomain.com
```

## 注意事项

⚠️ **视频播放问题**
- 视频源有防盗链保护，可能需要配置正确的 Referer
- 如无法播放，考虑使用官方 iframe 嵌入方式

⚠️ **安全配置**
- 生产环境建议关闭 DEBUG 模式
- 定期更新依赖包
- 配置防火墙规则
- 启用 Fail2Ban 防止暴力破解

⚠️ **性能优化**
- 启用 Gzip 压缩
- 配置静态资源缓存
- 使用 CDN 加速静态资源
- 配置数据库连接池（如有）

⚠️ **监控告警**
- 配置 PM2 监控
- 设置日志轮转
- 配置服务监控和告警
- 定期检查 SSL 证书有效期

## 常用维护命令

```bash
# 查看服务状态
pm2 status
pm2 logs movie-site

# 重启服务
pm2 restart movie-site
npm run pm2:restart

# 查看日志
tail -f logs/error.log
tail -f /var/log/nginx/error.log

# 更新部署
git pull
npm install
npm run build
pm2 restart movie-site
```
