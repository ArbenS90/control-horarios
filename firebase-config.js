// Configuración de Firebase - Versión Modular
// Las funciones se importan desde el script module en el HTML

// Función para obtener timestamp de Firestore
function getFirestoreTimestamp() {
    return Timestamp.now();
}

// Función para convertir timestamp de Firestore a Date
function firestoreTimestampToDate(timestamp) {
    if (timestamp && timestamp.toDate) {
        return timestamp.toDate();
    }
    return new Date(timestamp);
}

// Configuración de Firestore
const settings = {
    timestampsInSnapshots: true
};
// db.settings(settings); // Ya no es necesario en la versión modular 