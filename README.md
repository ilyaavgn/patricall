[file name]: README.md
# Душевные Звонки 🎪❤️

P2P видеозвонки с русской душой! Просто, надёжно и с душой.

## Особенности

- 🚀 P2P соединение (прямое между пользователями)
- 🔐 Безопасно (шифрование WebRTC)
- 📱 Адаптивный дизайн
- 🎨 Русский колорит в интерфейсе
- ⚡ Быстрое подключение
- 🎭 Смена камеры и управление медиа

## Деплой на Netlify

1. Запуши код в GitHub репозиторий
2. Зайди на [Netlify](https://netlify.com)
3. Нажми "New site from Git"
4. Выбери репозиторий
5. Настройки:
   - Build command: `npm install`
   - Publish directory: `.`
   - Добавь переменную: `NODE_VERSION = 18`

Или через Netlify CLI:
```bash
npm install -g netlify-cli
ntl init
ntl deploy