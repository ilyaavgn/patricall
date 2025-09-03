[file name]: public/app.js
class ДушевныйЗвонок {
    constructor() {
        this.socket = io();
        this.localStream = null;
        this.peerConnection = null;
        this.roomId = null;
        this.isAudioMuted = false;
        this.isVideoMuted = false;
        this.currentCamera = 'front';
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.checkCompatibility();
    }

    initializeElements() {
        // Экраны
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.callScreen = document.getElementById('call-screen');
        
        // Кнопки
        this.createCallBtn = document.getElementById('create-call-btn');
        this.joinCallBtn = document.getElementById('join-call-btn');
        this.copyRoomIdBtn = document.getElementById('copy-room-id');
        this.shareRoomBtn = document.getElementById('share-room');
        this.endCallBtn = document.getElementById('end-call');
        this.muteAudioBtn = document.getElementById('mute-audio');
        this.muteVideoBtn = document.getElementById('mute-video');
        this.switchCameraBtn = document.getElementById('switch-camera');
        this.fullscreenBtn = document.getElementById('fullscreen');
        
        // Видео элементы
        this.localVideo = document.getElementById('local-video');
        this.remoteVideo = document.getElementById('remote-video');
        this.remoteLoading = document.getElementById('remote-loading');
        
        // Информация
        this.roomIdInput = document.getElementById('room-id-input');
        this.currentRoomId = document.getElementById('current-room-id');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        
        // Уведомления и модалки
        this.notification = document.getElementById('notification');
        this.notificationText = document.getElementById('notification-text');
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalClose = document.getElementById('modal-close');
    }

    setupEventListeners() {
        this.createCallBtn.addEventListener('click', () => this.создатьКомнату());
        this.joinCallBtn.addEventListener('click', () => this.присоединиться());
        this.copyRoomIdBtn.addEventListener('click', () => this.скопироватьКод());
        this.shareRoomBtn.addEventListener('click', () => this.поделиться());
        this.endCallBtn.addEventListener('click', () => this.завершитьЗвонок());
        this.muteAudioBtn.addEventListener('click', () => this.переключитьЗвук());
        this.muteVideoBtn.addEventListener('click', () => this.переключитьВидео());
        this.switchCameraBtn.addEventListener('click', () => this.переключитьКамеру());
        this.fullscreenBtn.addEventListener('click', () => this.полныйЭкран());
        this.modalClose.addEventListener('click', () => this.скрытьМодалку());
        
        this.roomIdInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
        
        this.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.присоединиться();
        });
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            this.показатьУведомление('Подключено к серверу');
            this.обновитьСтатус('Готов к звонку', true);
        });

        this.socket.on('disconnect', () => {
            this.показатьУведомление('Потеряно соединение с сервером');
            this.обновитьСтатус('Отключено', false);
        });

        this.socket.on('user-connected', (userId) => {
            this.показатьУведомление('Кто-то подключается...');
            this.создатьPeerConnection();
        });

        this.socket.on('offer', async (data) => {
            if (this.peerConnection) {
                try {
                    await this.peerConnection.setRemoteDescription(data.offer);
                    const answer = await this.peerConnection.createAnswer();
                    await this.peerConnection.setLocalDescription(answer);
                    
                    this.socket.emit('answer', { 
                        answer: answer, 
                        room: this.roomId 
                    });
                    
                    this.показатьУведомление('Соединение установлено!');
                } catch (error) {
                    console.error('Ошибка при обработке offer:', error);
                }
            }
        });

        this.socket.on('answer', async (data) => {
            if (this.peerConnection) {
                try {
                    await this.peerConnection.setRemoteDescription(data.answer);
                } catch (error) {
                    console.error('Ошибка при обработке answer:', error);
                }
            }
        });

        this.socket.on('ice-candidate', async (data) => {
            if (this.peerConnection && data.candidate) {
                try {
                    await this.peerConnection.addIceCandidate(data.candidate);
                } catch (error) {
                    console.error('Ошибка при добавлении ICE candidate:', error);
                }
            }
        });

        this.socket.on('user-disconnected', () => {
            this.показатьУведомление('Собеседник покинул звонок');
            this.remoteLoading.style.display = 'flex';
            this.remoteVideo.srcObject = null;
            this.обновитьСтатус('Ожидание подключения...', false);
        });
    }

    async checkCompatibility() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.показатьМодалку(
                'Не поддерживается', 
                'Ваш браузер не поддерживает видеозвонки. Попробуйте современный браузер.'
            );
            return false;
        }

        if (!navigator.clipboard) {
            this.copyRoomIdBtn.style.display = 'none';
        }

        return true;
    }

    async создатьКомнату() {
        if (!await this.checkCompatibility()) return;

        this.roomId = this.генерироватьКод();
        try {
            await this.инициализироватьМедиа();
            this.показатьЭкранЗвонка();
            this.socket.emit('join-room', this.roomId);
            this.показатьУведомление('Комната создана!');
        } catch (error) {
            this.показатьМодалку('Ошибка', 'Не удалось получить доступ к камере и микрофону');
        }
    }

    async присоединиться() {
        if (!await this.checkCompatibility()) return;

        this.roomId = this.roomIdInput.value.trim();
        if (!this.roomId) {
            this.показатьУведомление('Введите код комнаты');
            return;
        }

        if (this.roomId.length < 4) {
            this.показатьУведомление('Код слишком короткий');
            return;
        }

        try {
            await this.инициализироватьМедиа();
            this.показатьЭкранЗвонка();
            this.socket.emit('join-room', this.roomId);
            this.создатьPeerConnection();
        } catch (error) {
            this.показатьМодалку('Ошибка', 'Не удалось подключиться к комнате');
        }
    }

    генерироватьКод() {
        const chars = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    async инициализироватьМедиа() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            
            this.localVideo.srcObject = this.localStream;
            this.обновитьСтатус('Подключаемся...', false);
            
        } catch (error) {
            console.error('Ошибка доступа к медиа:', error);
            throw error;
        }
    }

    создатьPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Добавляем локальный поток
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Обработка удалённого потока
        this.peerConnection.ontrack = (event) => {
            this.remoteVideo.srcObject = event.streams[0];
            this.remoteLoading.style.display = 'none';
            this.обновитьСтатус('Соединение установлено!', true);
        };

        // Обмен ICE кандидатами
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    room: this.roomId
                });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.обновитьСтатус('Соединение установлено', true);
                    break;
                case 'disconnected':
                case 'failed':
                    this.обновитьСтатус('Проблемы с соединением', false);
                    break;
            }
        };
    }

    показатьЭкранЗвонка() {
        this.welcomeScreen.classList.remove('active');
        this.callScreen.classList.add('active');
        this.currentRoomId.textContent = this.roomId;
    }

    показатьУведомление(message) {
        this.notificationText.textContent = message;
        this.notification.classList.add('show');
        
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }

    показатьМодалку(title, message) {
        this.modalTitle.textContent = title;
        this.modalMessage.textContent = message;
        this.modal.classList.add('show');
    }

    скрытьМодалку() {
        this.modal.classList.remove('show');
    }

    обновитьСтатус(message, isConnected) {
        this.statusText.textContent = message;
        this.statusIndicator.className = isConnected ? 
            'fas fa-circle connected' : 'fas fa-circle';
    }

    async скопироватьКод() {
        try {
            await navigator.clipboard.writeText(this.roomId);
            this.показатьУведомление('Код скопирован в буфер!');
        } catch (error) {
            this.показатьУведомление('Не удалось скопировать код');
        }
    }

    поделиться() {
        if (navigator.share) {
            navigator.share({
                title: 'Присоединяйтесь к звонку!',
                text: 'Присоединяйтесь к моему душевному видеозвонку',
                url: window.location.href + '?room=' + this.roomId
            });
        } else {
            this.скопироватьКод();
        }
    }

    завершитьЗвонок() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.socket.emit('leave-room', this.roomId);
        
        this.callScreen.classList.remove('active');
        this.welcomeScreen.classList.add('active');
        
        this.roomId = null;
        this.localVideo.srcObject = null;
        this.remoteVideo.srcObject = null;
        
        this.показатьУведомление('Звонок завершён');
    }

    переключитьЗвук() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isAudioMuted = !audioTrack.enabled;
                
                this.muteAudioBtn.innerHTML = this.isAudioMuted ? 
                    '<i class="fas fa-microphone-slash"></i>' : 
                    '<i class="fas fa-microphone"></i>';
                
                this.показатьУведомление(this.isAudioMuted ? 'Микрофон выключен' : 'Микрофон включен');
            }
        }
    }

    переключитьВидео() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.isVideoMuted = !videoTrack.enabled;
                
                this.muteVideoBtn.innerHTML = this.isVideoMuted ? 
                    '<i class="fas fa-video-slash"></i>' : 
                    '<i class="fas fa-video"></i>';
                
                this.показатьУведомление(this.isVideoMuted ? 'Камера выключена' : 'Камера включена');
            }
        }
    }

    async переключитьКамеру() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.currentCamera = this.currentCamera === 'front' ? 'environment' : 'user';
                
                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: this.currentCamera
                        },
                        audio: true
                    });
                    
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    const sender = this.peerConnection.getSenders().find(s => 
                        s.track && s.track.kind === 'video'
                    );
                    
                    if (sender) {
                        await sender.replaceTrack(newVideoTrack);
                    }
                    
                    // Обновляем локальный поток
                    videoTrack.stop();
                    this.localStream.removeTrack(videoTrack);
                    this.localStream.addTrack(newVideoTrack);
                    this.localVideo.srcObject = this.localStream;
                    
                    this.показатьУведомление('Камера переключена');
                    
                } catch (error) {
                    console.error('Ошибка переключения камеры:', error);
                }
            }
        }
    }

    полныйЭкран() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.душевныйЗвонок = new ДушевныйЗвонок();
    
    // Проверка параметров URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
        document.getElementById('room-id-input').value = roomId;
    }
});