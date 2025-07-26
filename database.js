// database.js - Funciones para interactuar con Firebase

// Función para convertir timestamp de Firestore a Date
function firestoreTimestampToDate(timestamp) {
  if (timestamp && timestamp.toDate) {
      return timestamp.toDate();
  }
  if (timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
}

// Función para crear usuario
async function createUser(userData) {
  try {
      const userWithTimestamp = {
          ...userData,
          createdAt: window.Timestamp.now(),
          id: null // Se generará automáticamente
      };
      
      const docRef = await window.addDoc(window.collection(window.db, 'users'), userWithTimestamp);
      
      return {
          ...userWithTimestamp,
          id: docRef.id
      };
  } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
  }
}

// Función para obtener usuarios
async function getUsers() {
  try {
      const usersCollection = window.collection(window.db, 'users');
      const querySnapshot = await window.getDocs(usersCollection);
      
      const users = [];
      querySnapshot.forEach((doc) => {
          users.push({
              id: doc.id,
              ...doc.data()
          });
      });
      
      return users;
  } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
  }
}

// Función para eliminar usuario
async function deleteUser(userId) {
  try {
      await window.deleteDoc(window.doc(window.db, 'users', userId));
      console.log('Usuario eliminado exitosamente');
  } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
  }
}

// Función para crear registro de tiempo
async function createTimeRecord(recordData) {
  try {
      const recordWithTimestamp = {
          ...recordData,
          createdAt: window.Timestamp.now()
      };
      
      const docRef = await window.addDoc(window.collection(window.db, 'timeRecords'), recordWithTimestamp);
      
      return {
          ...recordWithTimestamp,
          id: docRef.id
      };
  } catch (error) {
      console.error('Error creando registro de tiempo:', error);
      throw error;
  }
}

// Función para obtener registros de tiempo
async function getTimeRecords(filters = {}) {
  try {
      let q = window.collection(window.db, 'timeRecords');
      
      // Aplicar filtros
      if (filters.userId) {
          q = window.query(q, window.where('userId', '==', filters.userId));
      }
      
      if (filters.hasOwnProperty('isActive')) {
          q = window.query(q, window.where('isActive', '==', filters.isActive));
      }
      
      if (filters.startDate && filters.endDate) {
          q = window.query(q, 
              window.where('startTime', '>=', filters.startDate.toISOString()),
              window.where('startTime', '<=', filters.endDate.toISOString())
          );
      }
      
      q = window.query(q, window.orderBy('startTime', 'desc'));
      
      const querySnapshot = await window.getDocs(q);
      
      const records = [];
      querySnapshot.forEach((doc) => {
          records.push({
              id: doc.id,
              ...doc.data()
          });
      });
      
      return records;
  } catch (error) {
      console.error('Error obteniendo registros de tiempo:', error);
      throw error;
  }
}

// Función para actualizar registro de tiempo
async function updateTimeRecord(recordId, updateData) {
  try {
      const recordRef = window.doc(window.db, 'timeRecords', recordId);
      await window.updateDoc(recordRef, {
          ...updateData,
          updatedAt: window.Timestamp.now()
      });
      
      console.log('Registro actualizado exitosamente');
  } catch (error) {
      console.error('Error actualizando registro:', error);
      throw error;
  }
}

// Función para crear evidencia
async function createEvidence(evidenceData) {
  try {
      const evidenceWithTimestamp = {
          ...evidenceData,
          createdAt: window.Timestamp.now()
      };
      
      const docRef = await window.addDoc(window.collection(window.db, 'evidences'), evidenceWithTimestamp);
      
      return {
          ...evidenceWithTimestamp,
          id: docRef.id
      };
  } catch (error) {
      console.error('Error creando evidencia:', error);
      throw error;
  }
}

// Función para obtener evidencias
async function getEvidences() {
  try {
      const evidencesCollection = window.collection(window.db, 'evidences');
      const q = window.query(evidencesCollection, window.orderBy('timestamp', 'desc'));
      const querySnapshot = await window.getDocs(q);
      
      const evidences = [];
      querySnapshot.forEach((doc) => {
          evidences.push({
              id: doc.id,
              ...doc.data()
          });
      });
      
      return evidences;
  } catch (error) {
      console.error('Error obteniendo evidencias:', error);
      throw error;
  }
}