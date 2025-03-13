#!/bin/bash

# 磁力链接在线播放器部署脚本

echo "===== 磁力链接在线播放器部署脚本 ====="
echo ""

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装。请先安装Docker。"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose未安装。请先安装Docker Compose。"
    exit 1
fi

# 显示菜单
show_menu() {
    echo "请选择操作:"
    echo "1) 构建并启动服务"
    echo "2) 停止服务"
    echo "3) 重启服务"
    echo "4) 查看日志"
    echo "5) 查看状态"
    echo "6) 清理所有缓存"
    echo "0) 退出"
    echo ""
}

# 主循环
while true; do
    show_menu
    read -p "输入选项 [0-6]: " choice
    
    case $choice in
        1)
            echo "构建并启动服务..."
            docker-compose build
            docker-compose up -d
            echo "服务已启动，访问 http://$(hostname -I | awk '{print $1}'):3000"
            ;;
        2)
            echo "停止服务..."
            docker-compose down
            echo "服务已停止"
            ;;
        3)
            echo "重启服务..."
            docker-compose restart
            echo "服务已重启"
            ;;
        4)
            echo "显示日志 (按Ctrl+C退出)..."
            docker-compose logs -f
            ;;
        5)
            echo "服务状态:"
            docker-compose ps
            ;;
        6)
            echo "清理所有缓存..."
            docker exec magnet-player curl -X DELETE http://localhost:3000/api/cleanup-all
            echo "缓存已清理"
            ;;
        0)
            echo "退出"
            exit 0
            ;;
        *)
            echo "无效选项，请重试"
            ;;
    esac
    
    echo ""
    read -p "按Enter键继续..."
    clear
done 