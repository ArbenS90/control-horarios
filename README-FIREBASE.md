# 🔥 Configuración de Firebase para el Sistema de Control Horario

## 📋 Pasos para configurar Firebase:

### 1. Crear proyecto en Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear proyecto"
3. Dale un nombre como "control-horario-panaderia"
4. Sigue los pasos de configuración

### 2. Habilitar Firestore Database
1. En el panel de Firebase, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Comenzar en modo de prueba"
4. Elige la ubicación más cercana a tu región

### 3. Habilitar Authentication (Opcional)
1. Ve a "Authentication" en el panel
2. Haz clic en "Comenzar"
3. En "Sign-in method", habilita "Email/Password"

### 4. Obtener configuración
1. Ve a "Configuración del proyecto" (ícono de engranaje)
2. Selecciona "Configuración del SDK"
3. Copia la configuración que aparece

### 5. Actualizar archivo de configuración
Reemplaza los valores en `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "tu-api-key-real",
    authDomain: "tu-proyecto-real.firebaseapp.com",
    projectId: "tu-proyecto-real-id",
    storageBucket: "tu-proyecto-real.appspot.com",
    messagingSenderId: "tu-sender-id-real",
    appId: "tu-app-id-real"
};
```

## 🗄️ Estructura de la Base de Datos

### Colección: `users`
```javascript
{
    id: "auto-generated",
    name: "Nombre del usuario",
    document: "12345678",
    type: "empleado|admin|super_admin",
    email: "usuario@email.com", // opcional
    createdAt: timestamp,
    updatedAt: timestamp
}
```

### Colección: `timeRecords`
```javascript
{
    id: "auto-generated",
    userId: "user-id",
    userName: "Nombre del usuario",
    userDocument: "12345678",
    startTime: timestamp,
    endTime: timestamp,
    breaks: [
        {
            startTime: timestamp,
            endTime: timestamp,
            type: "break"
        }
    ],
    totalBreakTime: 3600000, // en milisegundos
    workedTime: 28800000, // en milisegundos
    date: "Mon Dec 25 2023",
    isActive: false,
    createdAt: timestamp,
    updatedAt: timestamp
}
```

### Colección: `evidences`
```javascript
{
    id: "auto-generated",
    userId: "user-id",
    userName: "Nombre del usuario",
    userDocument: "12345678",
    filename: "imagen.jpg",
    data: "data:image/jpeg;base64,...",
    note: "Nota opcional",
    timestamp: timestamp,
    sessionDate: "Mon Dec 25 2023",
    createdAt: timestamp,
    updatedAt: timestamp
}
```

## 🔧 Reglas de Seguridad de Firestore

En Firebase Console > Firestore Database > Reglas, usa estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura a usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // O reglas más específicas:
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.type in ['admin', 'super_admin']);
    }
    
    match /timeRecords/{recordId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.type in ['admin', 'super_admin']);
    }
    
    match /evidences/{evidenceId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.type in ['admin', 'super_admin']);
    }
  }
}
```

## 🚀 Ventajas de usar Firebase:

### ✅ **Persistencia de datos**
- Los datos se guardan en la nube
- No se pierden al cerrar el navegador
- Acceso desde cualquier dispositivo

### ✅ **Tiempo real**
- Los cambios se sincronizan automáticamente
- Múltiples usuarios pueden usar el sistema simultáneamente

### ✅ **Escalabilidad**
- Firebase maneja automáticamente el crecimiento
- No necesitas configurar servidores

### ✅ **Seguridad**
- Autenticación integrada
- Reglas de seguridad configurables
- HTTPS automático

### ✅ **Gratis para proyectos pequeños**
- 1GB de almacenamiento
- 50,000 lecturas/día
- 20,000 escrituras/día

## 🔄 Migración de datos locales

Para migrar tus datos actuales a Firebase:

1. Abre la consola del navegador (F12)
2. Ejecuta: `migrateLocalData()`
3. Esto subirá todos los datos locales a Firebase

## 📊 Monitoreo

En Firebase Console puedes:
- Ver estadísticas de uso
- Monitorear errores
- Ver logs de autenticación
- Configurar alertas

## 🔧 Solución de problemas

### Error de configuración
- Verifica que los valores en `firebase-config.js` sean correctos
- Asegúrate de que el proyecto esté creado en Firebase

### Error de permisos
- Revisa las reglas de seguridad en Firestore
- Verifica que la autenticación esté habilitada

### Error de red
- Verifica tu conexión a internet
- Revisa la consola del navegador para errores específicos

## 📞 Soporte

Si tienes problemas:
1. Revisa la [documentación de Firebase](https://firebase.google.com/docs)
2. Consulta los logs en la consola del navegador
3. Verifica las reglas de seguridad en Firebase Console 