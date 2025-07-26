# 🗄️ Configuración de Backend con SQLite (Alternativa)

Si prefieres una base de datos local con más control, aquí tienes la opción de SQLite:

## 📦 Instalación del Backend

### 1. Crear carpeta del backend
```bash
mkdir backend
cd backend
npm init -y
```

### 2. Instalar dependencias
```bash
npm install express cors sqlite3 multer bcryptjs jsonwebtoken
npm install nodemon --save-dev
```

### 3. Estructura del proyecto
```
backend/
├── server.js
├── database.js
├── routes/
│   ├── users.js
│   ├── timeRecords.js
│   └── evidences.js
├── middleware/
│   └── auth.js
└── package.json
```

## 🗄️ Archivo `database.js`

```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Crear tablas
function initDatabase() {
    db.serialize(() => {
        // Tabla de usuarios
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            document TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL DEFAULT 'empleado',
            email TEXT,
            password TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla de registros horarios
        db.run(`CREATE TABLE IF NOT EXISTS time_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            user_document TEXT NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            total_break_time INTEGER DEFAULT 0,
            worked_time INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Tabla de breaks
        db.run(`CREATE TABLE IF NOT EXISTS breaks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id INTEGER NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            type TEXT DEFAULT 'break',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (record_id) REFERENCES time_records (id)
        )`);

        // Tabla de evidencias
        db.run(`CREATE TABLE IF NOT EXISTS evidences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            user_document TEXT NOT NULL,
            filename TEXT NOT NULL,
            data TEXT NOT NULL,
            note TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        console.log('Base de datos inicializada');
    });
}

module.exports = { db, initDatabase };
```

## 🚀 Archivo `server.js`

```javascript
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Inicializar base de datos
initDatabase();

// Rutas
app.use('/api/users', require('./routes/users'));
app.use('/api/time-records', require('./routes/timeRecords'));
app.use('/api/evidences', require('./routes/evidences'));

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
```

## 🔐 Middleware de autenticación

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-seguro';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

module.exports = { authenticateToken, JWT_SECRET };
```

## 📊 Rutas de usuarios

```javascript
// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Obtener todos los usuarios
router.get('/', authenticateToken, (req, res) => {
    db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Crear usuario
router.post('/', authenticateToken, async (req, res) => {
    const { name, document, type, email, password } = req.body;
    
    try {
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        
        db.run(
            'INSERT INTO users (name, document, type, email, password) VALUES (?, ?, ?, ?, ?)',
            [name, document, type, email, hashedPassword],
            function(err) {
                if (err) {
                    return res.status(400).json({ error: err.message });
                }
                res.json({ id: this.lastID, name, document, type });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', (req, res) => {
    const { document, password } = req.body;
    
    db.get('SELECT * FROM users WHERE document = ?', [document], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        if (password && !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        const token = jwt.sign(
            { id: user.id, name: user.name, type: user.type },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ token, user: { id: user.id, name: user.name, type: user.type } });
    });
});

module.exports = router;
```

## 🔄 Actualizar el frontend

Para usar el backend, actualiza las funciones en `script.js`:

```javascript
// Configuración del backend
const API_BASE_URL = 'http://localhost:3000/api';

// Función para hacer requests
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// Ejemplo de función actualizada
async function login() {
    const document = document.getElementById('loginDocument').value.trim();
    const alertDiv = document.getElementById('loginAlert');
    
    if (!document) {
        showAlert(alertDiv, 'Por favor ingrese su documento', 'error');
        return;
    }

    try {
        const response = await apiRequest('/users/login', {
            method: 'POST',
            body: JSON.stringify({ document })
        });
        
        localStorage.setItem('token', response.token);
        currentUser = response.user;
        showUserDashboard();
        showAlert(alertDiv, '', '');
    } catch (error) {
        showAlert(alertDiv, 'Error al iniciar sesión', 'error');
    }
}
```

## 🚀 Ejecutar el backend

```bash
# En la carpeta backend
npm start
```

## 📋 Ventajas del backend SQLite:

### ✅ **Control total**
- Base de datos local
- Sin dependencias externas
- Configuración personalizable

### ✅ **Seguridad**
- Autenticación JWT
- Contraseñas encriptadas
- Validación de datos

### ✅ **Escalabilidad**
- Fácil migración a MySQL/PostgreSQL
- APIs RESTful
- Separación clara de responsabilidades

### ✅ **Desarrollo**
- Debugging más fácil
- Logs detallados
- Testing simplificado

## 🔧 Configuración adicional

### Variables de entorno
Crea un archivo `.env`:
```
JWT_SECRET=tu-secreto-super-seguro
PORT=3000
NODE_ENV=development
```

### Scripts de package.json
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "init-db": "node database.js"
  }
}
```

¡Elige la opción que mejor se adapte a tus necesidades! 