#!/bin/bash
# Install Sequelize and restart the application

echo "📦 Installing Sequelize ORM..."
echo "================================"

# Check if we're in Docker or host
if [ -f /.dockerenv ]; then
    echo "✅ Running inside Docker container"
    cd /app && npm install sequelize
else
    echo "✅ Running on host"

    # Try to install inside Docker container
    if command -v docker &> /dev/null; then
        echo "🐳 Installing inside Docker container..."
        docker compose exec app npm install sequelize

        if [ $? -eq 0 ]; then
            echo "✅ Sequelize installed successfully in container"
            echo ""
            echo "🔄 Restarting application..."
            docker compose restart app

            echo ""
            echo "⏳ Waiting for application to start..."
            sleep 5

            echo ""
            echo "📋 Checking logs..."
            docker compose logs app --tail 20

            echo ""
            echo "✅ Installation complete!"
            echo ""
            echo "🧪 Test the application:"
            echo "   curl http://localhost:3000/api/csrf-token"
            exit 0
        else
            echo "❌ Failed to install in Docker container"
            echo "Trying host installation..."
        fi
    fi

    # Fallback to host installation
    echo "📦 Installing on host..."
    cd /home/gustavo/biblio-server/app
    npm install sequelize

    if [ $? -eq 0 ]; then
        echo "✅ Sequelize installed successfully on host"
        echo ""
        echo "⚠️  Please restart the Docker container manually:"
        echo "   docker compose restart app"
    else
        echo "❌ Installation failed"
        echo ""
        echo "Please install manually:"
        echo "   cd /home/gustavo/biblio-server/app"
        echo "   npm install sequelize"
        echo "   docker compose restart app"
        exit 1
    fi
fi

echo ""
echo "================================"
echo "✅ Sequelize migration complete!"
echo ""
echo "📖 Documentation: doc/SEQUELIZE_MIGRATION.md"
echo "🧪 Test endpoints to verify everything works"
