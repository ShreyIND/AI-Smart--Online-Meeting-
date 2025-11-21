const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins (adjust for production)
app.use(cors());

const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Store room information
const rooms = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle joining a room
    socket.on('join-room', (roomId) => {
        console.log(`User ${socket.id} joining room: ${roomId}`);

        // Check if room exists
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }

        const room = rooms.get(roomId);

        // Limit room to 2 users
        if (room.size >= 2) {
            socket.emit('room-full');
            console.log(`Room ${roomId} is full`);
            return;
        }

        // Add user to room
        room.add(socket.id);
        socket.join(roomId);
        socket.roomId = roomId;

        console.log(`User ${socket.id} joined room ${roomId}. Room size: ${room.size}`);

        // If this is the second user, notify both users
        if (room.size === 2) {
            const users = Array.from(room);
            const otherUser = users.find(id => id !== socket.id);

            // Notify the other user that someone joined
            socket.to(otherUser).emit('user-connected', socket.id);
            console.log(`Notified ${otherUser} that ${socket.id} connected`);
        }

        socket.emit('joined-room', roomId);
    });

    // Handle WebRTC offer
    socket.on('offer', (data) => {
        console.log(`Offer from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('offer', {
            offer: data.offer,
            from: socket.id
        });
    });

    // Handle WebRTC answer
    socket.on('answer', (data) => {
        console.log(`Answer from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('answer', {
            answer: data.answer,
            from: socket.id
        });
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        console.log(`ICE candidate from ${socket.id} to ${data.to}`);
        socket.to(data.to).emit('ice-candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        if (socket.roomId) {
            const room = rooms.get(socket.roomId);
            if (room) {
                room.delete(socket.id);

                // Notify other user in the room
                socket.to(socket.roomId).emit('user-disconnected', socket.id);

                // Clean up empty rooms
                if (room.size === 0) {
                    rooms.delete(socket.roomId);
                    console.log(`Room ${socket.roomId} deleted (empty)`);
                } else {
                    console.log(`Room ${socket.roomId} now has ${room.size} user(s)`);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
    console.log(`🚀 Signaling server running on port ${PORT}`);
});
