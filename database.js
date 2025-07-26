// Funciones de base de datos usando Firebase Firestore

// ===== FUNCIONES DE USUARIOS =====

// Obtener todos los usuarios
async function getUsers() {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const users = [];
        snapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return users;
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        return [];
    }
}

// Crear nuevo usuario
async function createUser(userData) {
    try {
        const usersRef = collection(db, 'users');
        const docRef = await addDoc(usersRef, {
            ...userData,
            createdAt: getFirestoreTimestamp(),
            updatedAt: getFirestoreTimestamp()
        });
        return { id: docRef.id, ...userData };
    } catch (error) {
        console.error('Error creando usuario:', error);
        throw error;
    }
}

// Actualizar usuario
async function updateUser(userId, userData) {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            ...userData,
            updatedAt: getFirestoreTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        throw error;
    }
}

// Eliminar usuario
async function deleteUser(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
        return true;
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        throw error;
    }
}

// ===== FUNCIONES DE REGISTROS HORARIOS =====

// Obtener registros horarios
async function getTimeRecords(filters = {}) {
    try {
        let q = collection(db, 'timeRecords');
        
        // Aplicar filtros
        if (filters.userId) {
            q = query(q, where('userId', '==', filters.userId));
        }
        if (filters.isActive !== undefined) {
            q = query(q, where('isActive', '==', filters.isActive));
        }
        if (filters.startDate && filters.endDate) {
            q = query(q, where('startTime', '>=', filters.startDate),
                           where('startTime', '<=', filters.endDate));
        }
        
        q = query(q, orderBy('startTime', 'desc'));
        const snapshot = await getDocs(q);
        const records = [];
        snapshot.forEach(doc => {
            records.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return records;
    } catch (error) {
        console.error('Error obteniendo registros horarios:', error);
        return [];
    }
}

// Crear nuevo registro horario
async function createTimeRecord(recordData) {
    try {
        const timeRecordsRef = collection(db, 'timeRecords');
        const docRef = await addDoc(timeRecordsRef, {
            ...recordData,
            createdAt: getFirestoreTimestamp(),
            updatedAt: getFirestoreTimestamp()
        });
        return { id: docRef.id, ...recordData };
    } catch (error) {
        console.error('Error creando registro horario:', error);
        throw error;
    }
}

// Actualizar registro horario
async function updateTimeRecord(recordId, recordData) {
    try {
        const recordRef = doc(db, 'timeRecords', recordId);
        await updateDoc(recordRef, {
            ...recordData,
            updatedAt: getFirestoreTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error actualizando registro horario:', error);
        throw error;
    }
}

// ===== FUNCIONES DE EVIDENCIAS =====

// Obtener evidencias
async function getEvidences(filters = {}) {
    try {
        let q = collection(db, 'evidences');
        
        // Aplicar filtros
        if (filters.userId) {
            q = query(q, where('userId', '==', filters.userId));
        }
        if (filters.startDate && filters.endDate) {
            q = query(q, where('timestamp', '>=', filters.startDate),
                           where('timestamp', '<=', filters.endDate));
        }
        
        q = query(q, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const evidences = [];
        snapshot.forEach(doc => {
            evidences.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return evidences;
    } catch (error) {
        console.error('Error obteniendo evidencias:', error);
        return [];
    }
}

// Crear nueva evidencia
async function createEvidence(evidenceData) {
    try {
        const evidencesRef = collection(db, 'evidences');
        const docRef = await addDoc(evidencesRef, {
            ...evidenceData,
            createdAt: getFirestoreTimestamp(),
            updatedAt: getFirestoreTimestamp()
        });
        return { id: docRef.id, ...evidenceData };
    } catch (error) {
        console.error('Error creando evidencia:', error);
        throw error;
    }
}

// Eliminar evidencia
async function deleteEvidence(evidenceId) {
    try {
        const evidenceRef = doc(db, 'evidences', evidenceId);
        await deleteDoc(evidenceRef);
        return true;
    } catch (error) {
        console.error('Error eliminando evidencia:', error);
        throw error;
    }
}

// ===== FUNCIONES DE AUTENTICACIÓN =====

// Iniciar sesión con email/password
async function signInWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error iniciando sesión:', error);
        throw error;
    }
}

// Crear cuenta con email/password
async function createUserWithEmail(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error creando cuenta:', error);
        throw error;
    }
}

// Cerrar sesión
async function signOutUser() {
    try {
        await signOut(auth);
        return true;
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        throw error;
    }
}

// Obtener usuario actual
function getCurrentUser() {
    return auth.currentUser;
}

// Escuchar cambios en autenticación
function onAuthStateChangedListener(callback) {
    return onAuthStateChanged(auth, callback);
}

// ===== FUNCIONES DE SINCRONIZACIÓN =====

// Sincronizar datos locales con Firebase
async function syncLocalData() {
    try {
        // Sincronizar usuarios
        const firebaseUsers = await getUsers();
        if (firebaseUsers.length > 0) {
            users = firebaseUsers;
        }
        
        // Sincronizar registros horarios
        const firebaseRecords = await getTimeRecords({ isActive: false });
        if (firebaseRecords.length > 0) {
            timeRecords = firebaseRecords;
        }
        
        // Sincronizar evidencias
        const firebaseEvidences = await getEvidences();
        if (firebaseEvidences.length > 0) {
            evidences = firebaseEvidences;
        }
        
        console.log('Datos sincronizados exitosamente');
    } catch (error) {
        console.error('Error sincronizando datos:', error);
    }
}

// Migrar datos locales a Firebase
async function migrateLocalData() {
    try {
        // Migrar usuarios
        for (const user of users) {
            await createUser(user);
        }
        
        // Migrar registros horarios
        for (const record of timeRecords) {
            await createTimeRecord(record);
        }
        
        // Migrar evidencias
        for (const evidence of evidences) {
            await createEvidence(evidence);
        }
        
        console.log('Migración completada exitosamente');
    } catch (error) {
        console.error('Error en migración:', error);
    }
} 