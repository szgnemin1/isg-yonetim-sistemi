
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Ensure Data Directory Exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Helper: Read/Write JSON
const readJson = (file, defaultData = []) => {
    const filePath = path.join(DATA_DIR, `${file}.json`);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeJson = (file, data) => {
    fs.writeFileSync(path.join(DATA_DIR, `${file}.json`), JSON.stringify(data, null, 2));
};

// --- INITIAL ADMIN SETUP ---
const initUsers = () => {
    const users = readJson('users', []);
    if (users.length === 0) {
        // Default Admin: admin / admin123
        users.push({ 
            id: '1', 
            username: 'admin', 
            password: 'admin123', 
            role: 'ADMIN', 
            adSoyad: 'Sistem Yöneticisi' 
        });
        writeJson('users', users);
        console.log("Varsayılan Admin oluşturuldu: admin / admin123");
    }
};
initUsers();

// --- API ENDPOINTS ---

// 1. AUTH
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJson('users');
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Basit token simülasyonu (Production için JWT önerilir)
        const token = Buffer.from(`${user.username}:${Date.now()}`).toString('base64');
        const { password, ...safeUser } = user;
        res.json({ success: true, token, user: safeUser });
    } else {
        res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
    }
});

// CHANGE PASSWORD
app.post('/api/change-password', (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    const users = readJson('users');
    const userIdx = users.findIndex(u => u.id === userId);

    if (userIdx === -1) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    if (users[userIdx].password !== currentPassword) {
        return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı.' });
    }

    users[userIdx].password = newPassword;
    writeJson('users', users);
    
    res.json({ success: true, message: 'Şifre başarıyla güncellendi.' });
});

// 2. DATA GETTERS
app.get('/api/data', (req, res) => {
    const data = {
        firms: readJson('firms'),
        employees: readJson('employees'),
        equipments: readJson('equipments'),
        risks: readJson('risks'),
        events: readJson('events')
    };
    res.json(data);
});

// 3. DATA SETTERS
app.post('/api/save/:type', (req, res) => {
    const { type } = req.params; // firms, employees, etc.
    const allowedTypes = ['firms', 'employees', 'equipments', 'risks', 'events'];
    
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ success: false, message: 'Geçersiz veri tipi.' });
    }

    try {
        writeJson(type, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kaydetme hatası.' });
    }
});

// 4. USER MANAGEMENT (ADMIN ONLY)
app.get('/api/users', (req, res) => {
    // Gerçek uygulamada token kontrolü yapılmalı
    const users = readJson('users').map(u => {
        const { password, ...rest } = u; 
        return rest; 
    });
    res.json(users);
});

app.post('/api/users', (req, res) => {
    const { id, username, password, role, adSoyad } = req.body;
    const users = readJson('users');
    
    if (id) {
        // Edit
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], username, role, adSoyad };
            if (password) users[index].password = password; // Sadece şifre girildiyse güncelle
            writeJson('users', users);
        }
    } else {
        // Create
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ success: false, message: 'Kullanıcı adı zaten var.' });
        }
        users.push({ 
            id: Date.now().toString(), 
            username, 
            password, 
            role, 
            adSoyad 
        });
        writeJson('users', users);
    }
    res.json({ success: true });
});

app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    let users = readJson('users');
    users = users.filter(u => u.id !== id);
    writeJson('users', users);
    res.json({ success: true });
});

// Serve React App for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Listen on all interfaces (0.0.0.0) for Raspberry Pi network access
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu çalışıyor: http://0.0.0.0:${PORT}`);
    console.log(`Veri Klasörü: ${DATA_DIR}`);
});
