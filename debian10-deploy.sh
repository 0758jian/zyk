#!/bin/bash

# Debian 10 一键部署脚本
# 使用方法：bash deploy.sh yourdomain.com

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 用户运行此脚本${NC}"
  echo "sudo bash $0"
  exit 1
fi

# 获取域名参数
DOMAIN=$1
if [ -z "$DOMAIN" ]; then
  echo -e "${YELLOW}使用方法：bash $0 yourdomain.com${NC}"
  echo -e "${YELLOW}如果不配置域名，将只安装环境，不配置 Nginx${NC}"
  read -p "是否继续安装环境？(y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}开始部署在线影院项目${NC}"
echo -e "${GREEN}======================================${NC}"

# 1. 更新系统
echo -e "${YELLOW}[1/8] 更新系统...${NC}"
apt update && apt upgrade -y

# 2. 安装必要工具
echo -e "${YELLOW}[2/8] 安装必要工具...${NC}"
apt install -y curl git wget build-essential

# 3. 安装 nvm 和 Node.js
echo -e "${YELLOW}[3/8] 安装 Node.js (LTS 版本)...${NC}"

# 检查是否已安装 nvm
if ! command -v nvm &> /dev/null; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  echo -e "${GREEN}nvm 安装完成${NC}"
else
  echo -e "${GREEN}nvm 已安装${NC}"
fi

# 安装 Node.js LTS
nvm install --lts
nvm use --lts

# 验证安装
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}Node.js ${NODE_VERSION} 安装完成${NC}"
echo -e "${GREEN}npm ${NPM_VERSION} 安装完成${NC}"

# 4. 安装 PM2
echo -e "${YELLOW}[4/8] 安装 PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}PM2 安装完成${NC}"

# 5. 安装 Nginx
if [ ! -z "$DOMAIN" ]; then
  echo -e "${YELLOW}[5/8] 安装 Nginx...${NC}"
  apt install -y nginx
  echo -e "${GREEN}Nginx 安装完成${NC}"
else
  echo -e "${YELLOW}[5/8] 跳过 Nginx 安装（未提供域名）${NC}"
fi

# 6. 配置防火墙
echo -e "${YELLOW}[6/8] 配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo -e "${GREEN}防火墙配置完成${NC}"
else
  echo -e "${YELLOW}UFW 未安装，跳过防火墙配置${NC}"
fi

# 7. 创建项目目录
echo -e "${YELLOW}[7/8] 创建项目目录...${NC}"
mkdir -p /var/www/movie-site
cd /var/www/movie-site

# 8. 配置 Nginx
if [ ! -z "$DOMAIN" ]; then
  echo -e "${YELLOW}[8/8] 配置 Nginx...${NC}"
  
  # 创建 Nginx 配置
  cat > /etc/nginx/sites-available/movie-site << 'NGINX_EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

  # 替换域名
  sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/movie-site
  
  # 启用配置
  ln -sf /etc/nginx/sites-available/movie-site /etc/nginx/sites-enabled/
  
  # 测试并重启 Nginx
  nginx -t
  systemctl restart nginx
  
  echo -e "${GREEN}Nginx 配置完成${NC}"
  echo -e "${GREEN}访问地址：http://$DOMAIN${NC}"
else
  echo -e "${YELLOW}[8/8] 跳过 Nginx 配置${NC}"
fi

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}环境安装完成！${NC}"
echo -e "${GREEN}======================================${NC}"

# 后续步骤提示
echo ""
echo -e "${YELLOW}后续步骤：${NC}"
echo "1. 上传项目代码到 /var/www/movie-site"
echo "2. 执行以下命令："
echo "   cd /var/www/movie-site"
echo "   npm install"
echo "   npm run build"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""

if [ ! -z "$DOMAIN" ]; then
  echo -e "${YELLOW}配置 SSL 证书（推荐）：${NC}"
  echo "apt install -y certbot python3-certbot-nginx"
  echo "certbot --nginx -d $DOMAIN"
  echo ""
fi

echo -e "${GREEN}部署完成！${NC}"
