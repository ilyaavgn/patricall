[file name]: server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Для Netlify - обработка всех маршрутов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка сигналов WebRTC
io.on('connection', (socket) => {
  console.log('Подключился пользователь:', socket.id);

  // Присоединение к комнате
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);
    console.log(`Пользователь ${socket.id} вошёл в комнату ${roomId}`);
  });

  // Отправка предложения
  socket.on('offer', (data) => {
    socket.to(data.room).emit('offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  // Отправка ответа
  socket.on('answer', (data) => {
    socket.to(data.room).emit('answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  // Обмен ICE-кандидатами
  socket.on('ice-candidate', (data) => {
    socket.to(data.room).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  // Отключение пользователя
  socket.on('disconnect', () => {
    console.log('Отключился пользователь:', socket.id);
    socket.broadcast.emit('user-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📱 Откройте http://localhost:${PORT} для просмотра`);
});