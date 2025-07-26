// Variables globales
let users = [];
let timeRecords = [];
let evidences = [];
let currentUser = null;
let currentSession = null;
let sessionTimer = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    try {
        // Cargar datos desde Firebase
        await loadDataFromFirebase();
        
        // Si no hay usuarios, crear el super admin por defecto
        if (users.length === 0) {
            await createDefaultUsers();
        }
        
        console.log('Datos cargados desde Firebase');
    } catch (error) {
        console.error('Error cargando datos:', error);
        // Fallback a datos locales si hay error
        loadLocalData();
    }
});

// Función para cargar datos desde Firebase
async function loadDataFromFirebase() {
    try {
        // Cargar usuarios
        const firebaseUsers = await getUsers();
        if (firebaseUsers.length > 0) {
            users = firebaseUsers;
        }
        
        // Cargar registros horarios
        const firebaseRecords = await getTimeRecords({ isActive: false });
        if (firebaseRecords.length > 0) {
            timeRecords = firebaseRecords;
        }
        
        // Cargar evidencias
        const firebaseEvidences = await getEvidences();
        if (firebaseEvidences.length > 0) {
            evidences = firebaseEvidences;
        }
    } catch (error) {
        console.error('Error cargando datos de Firebase:', error);
        throw error;
    }
}

// Función para cargar datos locales como fallback
function loadLocalData() {
    users = JSON.parse(localStorage.getItem('users')) || [];
    timeRecords = JSON.parse(localStorage.getItem('timeRecords')) || [];
    evidences = JSON.parse(localStorage.getItem('evidences')) || [];
}

// Función para crear usuarios por defecto
async function createDefaultUsers() {
    try {
        const defaultUsers = [
            {
                name: "Super Admin",
                document: "admin123",
                type: "super_admin"
            },
            {
                name: "Juan Pérez",
                document: "12345678",
                type: "empleado"
            },
            {
                name: "María García",
                document: "87654321",
                type: "empleado"
            },
            {
                name: "Carlos Admin",
                document: "admin456",
                type: "admin"
            }
        ];
        
        for (const userData of defaultUsers) {
            await createUser(userData);
        }
        
        console.log('Usuarios por defecto creados');
    } catch (error) {
        console.error('Error creando usuarios por defecto:', error);
    }
}

function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDateTime').textContent = 
        now.toLocaleDateString('es-CO') + ' - ' + now.toLocaleTimeString('es-CO');
}

// Función de respaldo para guardar en localStorage (ya no se usa principalmente)
function saveData() {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('timeRecords', JSON.stringify(timeRecords));
    localStorage.setItem('evidences', JSON.stringify(evidences));
}

// Funciones de autenticación
function showAdminLogin() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('adminLoginScreen').classList.add('active');
}

function showUserLogin() {
    document.getElementById('adminLoginScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
}

async function login() {
    const userDocument = document.getElementById('loginDocument').value.trim();
    const alertDiv = document.getElementById('loginAlert');
    
    if (!userDocument) {
        showAlert(alertDiv, 'Por favor ingrese su documento', 'error');
        return;
    }

    try {
        // Buscar usuario en Firebase
        const firebaseUsers = await getUsers();
        const user = firebaseUsers.find(u => u.document === userDocument && u.type === 'empleado');
        
        if (user) {
            currentUser = user;
            showUserDashboard();
            showAlert(alertDiv, '', '');
        } else {
            showAlert(alertDiv, 'Usuario no encontrado o no tiene permisos de empleado', 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showAlert(alertDiv, 'Error al iniciar sesión', 'error');
    }
}

async function adminLogin() {
    const adminDocument = document.getElementById('adminDocument').value.trim();
    const alertDiv = document.getElementById('adminLoginAlert');
    
    if (!adminDocument) {
        showAlert(alertDiv, 'Por favor ingrese su documento', 'error');
        return;
    }

    try {
        // Buscar usuario en Firebase
        const firebaseUsers = await getUsers();
        const user = firebaseUsers.find(u => u.document === adminDocument && (u.type === 'admin' || u.type === 'super_admin'));
        
        if (user) {
            currentUser = user;
            showAdminDashboard();
            showAlert(alertDiv, '', '');
        } else {
            showAlert(alertDiv, 'Usuario no encontrado o no tiene permisos administrativos', 'error');
        }
    } catch (error) {
        console.error('Error en admin login:', error);
        showAlert(alertDiv, 'Error al iniciar sesión', 'error');
    }
}

async function logout() {
    if (currentSession) {
        await endShift();
    }
    currentUser = null;
    currentSession = null;
    clearInterval(sessionTimer);
    
    // Limpiar formularios
    document.getElementById('loginDocument').value = '';
    document.getElementById('adminDocument').value = '';
    
    // Mostrar pantalla de login
    hideAllScreens();
    document.getElementById('loginScreen').classList.add('active');
}

// Funciones de pantalla
function hideAllScreens() {
    document.querySelectorAll('.tab-content').forEach(screen => {
        screen.classList.remove('active');
    });
}

function showUserDashboard() {
    hideAllScreens();
    document.getElementById('userDashboard').classList.add('active');
    
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userDocument').textContent = currentUser.document;
    
    updateUserStatus();
    checkActiveSession();
}

function showAdminDashboard() {
    hideAllScreens();
    document.getElementById('adminDashboard').classList.add('active');
    
    document.getElementById('adminName').textContent = currentUser.name;
    
    loadUserList();
    loadReports();
    loadEvidenceList();
    showAdminTab('users');
}

function showAdminTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.add('hidden'));
    
    // Encontrar el botón que fue clickeado y activarlo
    const clickedTab = document.querySelector(`[onclick="showAdminTab('${tabName}')"]`);
    if (clickedTab) {
        clickedTab.classList.add('active');
    }
    
    document.getElementById(tabName + 'Tab').classList.remove('hidden');
}

// Funciones de control de tiempo
async function startShift() {
    const now = new Date();
    currentSession = {
        userId: currentUser.id,
        userName: currentUser.name,
        userDocument: currentUser.document,
        startTime: now.toISOString(),
        endTime: null,
        breaks: [],
        totalBreakTime: 0,
        date: now.toDateString(),
        isActive: true
    };
    
    try {
        // Guardar en Firebase
        const savedRecord = await createTimeRecord(currentSession);
        currentSession.id = savedRecord.id;
        
        document.getElementById('startShiftBtn').disabled = true;
        document.getElementById('endShiftBtn').disabled = false;
        document.getElementById('startBreakBtn').disabled = false;
        
        document.getElementById('currentSession').style.display = 'block';
        document.getElementById('sessionStart').textContent = now.toLocaleString('es-CO');
        
        updateUserStatus();
        startSessionTimer();
        
        console.log('Turno iniciado y guardado en Firebase');
    } catch (error) {
        console.error('Error iniciando turno:', error);
        alert('Error al iniciar turno. Intente nuevamente.');
    }
}

async function endShift() {
    if (!currentSession) return;
    
    const now = new Date();
    currentSession.endTime = now.toISOString();
    currentSession.isActive = false;
    
    // Si hay un break activo, terminarlo
    if (currentSession.breaks.length > 0) {
        const lastBreak = currentSession.breaks[currentSession.breaks.length - 1];
        if (!lastBreak.endTime) {
            lastBreak.endTime = now.toISOString();
            const breakDuration = new Date(lastBreak.endTime) - new Date(lastBreak.startTime);
            currentSession.totalBreakTime += breakDuration;
        }
    }
    
    // Calcular tiempo total trabajado
    const totalTime = new Date(currentSession.endTime) - new Date(currentSession.startTime);
    const workedTime = totalTime - currentSession.totalBreakTime;
    currentSession.workedTime = workedTime;
    
    try {
        // Actualizar en Firebase
        await updateTimeRecord(currentSession.id, currentSession);
        
        // Agregar a la lista local
        timeRecords.push(currentSession);
        currentSession = null;
        
        document.getElementById('startShiftBtn').disabled = false;
        document.getElementById('endShiftBtn').disabled = true;
        document.getElementById('startBreakBtn').disabled = true;
        document.getElementById('endBreakBtn').disabled = true;
        
        document.getElementById('currentSession').style.display = 'none';
        
        clearInterval(sessionTimer);
        updateUserStatus();
        
        console.log('Turno terminado y guardado en Firebase');
    } catch (error) {
        console.error('Error terminando turno:', error);
        alert('Error al terminar turno. Intente nuevamente.');
    }
}

function startBreak() {
    if (!currentSession) return;
    
    const now = new Date();
    currentSession.breaks.push({
        startTime: now.toISOString(),
        endTime: null,
        type: 'break'
    });
    
    document.getElementById('startBreakBtn').disabled = true;
    document.getElementById('endBreakBtn').disabled = false;
    
    updateUserStatus();
    saveData();
}

function endBreak() {
    if (!currentSession || currentSession.breaks.length === 0) return;
    
    const now = new Date();
    const currentBreak = currentSession.breaks[currentSession.breaks.length - 1];
    
    if (!currentBreak.endTime) {
        currentBreak.endTime = now.toISOString();
        const breakDuration = new Date(currentBreak.endTime) - new Date(currentBreak.startTime);
        currentSession.totalBreakTime += breakDuration;
    }
    
    document.getElementById('startBreakBtn').disabled = false;
    document.getElementById('endBreakBtn').disabled = true;
    
    updateUserStatus();
    saveData();
}

function startSessionTimer() {
    sessionTimer = setInterval(() => {
        if (!currentSession) return;
        
        const now = new Date();
        const startTime = new Date(currentSession.startTime);
        const totalTime = now - startTime;
        
        // Calcular tiempo en break actual
        let currentBreakTime = 0;
        if (currentSession.breaks.length > 0) {
            const lastBreak = currentSession.breaks[currentSession.breaks.length - 1];
            if (!lastBreak.endTime) {
                currentBreakTime = now - new Date(lastBreak.startTime);
            }
        }
        
        const totalBreakTime = currentSession.totalBreakTime + currentBreakTime;
        const workedTime = totalTime - totalBreakTime;
        
        document.getElementById('workedTime').textContent = formatTime(workedTime);
        document.getElementById('breakTime').textContent = formatTime(totalBreakTime);
    }, 1000);
}

function checkActiveSession() {
    // Buscar sesión activa del usuario actual
    const activeSession = timeRecords.find(record => 
        record.userId === currentUser.id && record.isActive
    );
    
    if (activeSession) {
        currentSession = activeSession;
        document.getElementById('startShiftBtn').disabled = true;
        document.getElementById('endShiftBtn').disabled = false;
        document.getElementById('startBreakBtn').disabled = false;
        
        document.getElementById('currentSession').style.display = 'block';
        document.getElementById('sessionStart').textContent = 
            new Date(currentSession.startTime).toLocaleString('es-CO');
        
        // Verificar si hay un break activo
        if (currentSession.breaks.length > 0) {
            const lastBreak = currentSession.breaks[currentSession.breaks.length - 1];
            if (!lastBreak.endTime) {
                document.getElementById('startBreakBtn').disabled = true;
                document.getElementById('endBreakBtn').disabled = false;
            }
        }
        
        startSessionTimer();
    }
}

function updateUserStatus() {
    let status = 'Inactivo';
    let statusClass = 'status-inactive';
    
    if (currentSession) {
        if (currentSession.breaks.length > 0) {
            const lastBreak = currentSession.breaks[currentSession.breaks.length - 1];
            if (!lastBreak.endTime) {
                status = 'En break';
                statusClass = 'status-break';
            } else {
                status = 'Trabajando';
                statusClass = 'status-active';
            }
        } else {
            status = 'Trabajando';
            statusClass = 'status-active';
        }
    }
    
    document.getElementById('userStatus').innerHTML = 
        `<span class="status-indicator ${statusClass}"></span>${status}`;
}

// Funciones de evidencia
async function uploadEvidence() {
    const fileInput = document.getElementById('evidenceInput');
    const noteInput = document.getElementById('evidenceNote');
    
    if (fileInput.files.length === 0) {
        alert('Por favor seleccione al menos una imagen');
        return;
    }
    
    try {
        for (const file of Array.from(fileInput.files)) {
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                const evidence = {
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userDocument: currentUser.document,
                    filename: file.name,
                    data: e.target.result,
                    note: noteInput.value.trim(),
                    timestamp: new Date().toISOString(),
                    sessionDate: currentSession ? currentSession.date : new Date().toDateString()
                };
                
                try {
                    // Guardar en Firebase
                    const savedEvidence = await createEvidence(evidence);
                    evidence.id = savedEvidence.id;
                    
                    // Agregar a la lista local
                    evidences.push(evidence);
                    displayEvidencePreview();
                    
                    console.log('Evidencia guardada en Firebase');
                } catch (error) {
                    console.error('Error guardando evidencia:', error);
                    alert('Error al subir evidencia. Intente nuevamente.');
                }
            };
            
            reader.readAsDataURL(file);
        }
        
        fileInput.value = '';
        noteInput.value = '';
    } catch (error) {
        console.error('Error procesando archivos:', error);
        alert('Error al procesar archivos. Intente nuevamente.');
    }
}

function displayEvidencePreview() {
    const preview = document.getElementById('evidencePreview');
    const userEvidences = evidences.filter(e => e.userId === currentUser.id);
    
    preview.innerHTML = userEvidences.slice(-6).map(evidence => `
        <div class="evidence-item">
            <img src="${evidence.data}" alt="${evidence.filename}">
            <p style="padding: 5px; font-size: 12px;">${evidence.note || 'Sin nota'}</p>
        </div>
    `).join('');
}

// Funciones administrativas
async function createUser() {
    const name = document.getElementById('newUserName').value.trim();
    const newUserDocument = document.getElementById('newUserDocument').value.trim();
    const type = document.getElementById('newUserType').value;
    const alertDiv = document.getElementById('userAlert');
    
    if (!name || !newUserDocument) {
        showAlert(alertDiv, 'Por favor complete todos los campos', 'error');
        return;
    }
    
    try {
        // Verificar si el usuario ya existe en Firebase
        const firebaseUsers = await getUsers();
        if (firebaseUsers.find(u => u.document === newUserDocument)) {
            showAlert(alertDiv, 'Ya existe un usuario con ese documento', 'error');
            return;
        }
        
        // Solo super_admin puede crear super_admin
        if (type === 'super_admin' && currentUser.type !== 'super_admin') {
            showAlert(alertDiv, 'Solo el Super Administrador puede crear otros Super Administradores', 'error');
            return;
        }
        
        const newUser = {
            name: name,
            document: newUserDocument,
            type: type,
            createdBy: currentUser.id
        };
        
        // Crear en Firebase
        const savedUser = await createUserInFirebase(newUser);
        
        // Agregar a la lista local
        users.push(savedUser);
        
        document.getElementById('newUserName').value = '';
        document.getElementById('newUserDocument').value = '';
        
        showAlert(alertDiv, 'Usuario creado exitosamente', 'success');
        loadUserList();
        
        console.log('Usuario creado en Firebase');
    } catch (error) {
        console.error('Error creando usuario:', error);
        showAlert(alertDiv, 'Error al crear usuario', 'error');
    }
}

async function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    
    if (!user) return;
    
    // No se puede eliminar al super admin
    if (user.type === 'super_admin' && currentUser.type !== 'super_admin') {
        alert('No tiene permisos para eliminar este usuario');
        return;
    }
    
    if (user.type === 'super_admin' && currentUser.id === userId) {
        alert('No puede eliminarse a sí mismo');
        return;
    }
    
    if (confirm(`¿Está seguro de eliminar al usuario ${user.name}?`)) {
        try {
            // Eliminar de Firebase
            await deleteUserFromFirebase(userId);
            
            // Eliminar de la lista local
            users = users.filter(u => u.id !== userId);
            loadUserList();
            
            console.log('Usuario eliminado de Firebase');
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            alert('Error al eliminar usuario');
        }
    }
}

// Función auxiliar para crear usuario en Firebase
async function createUserInFirebase(userData) {
    return await createUser(userData);
}

// Función auxiliar para eliminar usuario de Firebase
async function deleteUserFromFirebase(userId) {
    return await deleteUser(userId);
}

async function loadUserList() {
    const userList = document.getElementById('userList');
    const filterSelect = document.getElementById('filterUser');
    
    try {
        // Cargar usuarios desde Firebase
        const firebaseUsers = await getUsers();
        users = firebaseUsers;
        
        userList.innerHTML = users.map(user => `
            <div class="user-card">
                <div>
                    <h4>${user.name}</h4>
                    <p><strong>Documento:</strong> ${user.document}</p>
                    <p><strong>Tipo:</strong> ${user.type}</p>
                    <p><strong>Creado:</strong> ${firestoreTimestampToDate(user.createdAt).toLocaleDateString('es-CO')}</p>
                </div>
                <div>
                    ${(currentUser.type === 'super_admin' || (currentUser.type === 'admin' && user.type !== 'super_admin')) ? 
                        `<button onclick="deleteUser('${user.id}')" style="background: #dc3545;">Eliminar</button>` : 
                        '<span style="color: #666;">Sin permisos</span>'
                    }
                </div>
            </div>
        `).join('');
        
        // Actualizar select de filtro
        filterSelect.innerHTML = '<option value="">Todos los usuarios</option>' +
            users.filter(u => u.type === 'empleado').map(u => 
                `<option value="${u.id}">${u.name} (${u.document})</option>`
            ).join('');
    } catch (error) {
        console.error('Error cargando lista de usuarios:', error);
        userList.innerHTML = '<p style="color: red;">Error cargando usuarios</p>';
    }
}

async function loadReports() {
    await filterRecords();
}

async function filterRecords() {
    const filterUser = document.getElementById('filterUser').value;
    const filterDate = document.getElementById('filterDate').value;
    const filterStartDate = document.getElementById('filterStartDate').value;
    const filterEndDate = document.getElementById('filterEndDate').value;
    
    try {
        // Construir filtros para Firebase
        const filters = { isActive: false };
        
        if (filterUser) {
            filters.userId = filterUser;
        }
        
        if (filterStartDate && filterEndDate) {
            filters.startDate = new Date(filterStartDate);
            filters.endDate = new Date(filterEndDate);
            filters.endDate.setHours(23, 59, 59, 999);
        }
        
        // Obtener registros desde Firebase
        const firebaseRecords = await getTimeRecords(filters);
        timeRecords = firebaseRecords;
        
        let filteredRecords = firebaseRecords;
        
        // Aplicar filtros adicionales en el cliente
        if (filterDate) {
            const filterDateObj = new Date(filterDate);
            filteredRecords = filteredRecords.filter(record => {
                const recordDate = new Date(record.startTime);
                return recordDate.toDateString() === filterDateObj.toDateString();
            });
        }
        
        displayRecords(filteredRecords);
    } catch (error) {
        console.error('Error filtrando registros:', error);
        displayRecords([]);
    }
}

function displayRecords(records) {
    const tbody = document.getElementById('recordsTableBody');
    
    tbody.innerHTML = records.map(record => {
        const startTime = new Date(record.startTime);
        const endTime = record.endTime ? new Date(record.endTime) : null;
        const workedHours = record.workedTime ? formatTime(record.workedTime) : 'En progreso';
        const breakTime = formatTime(record.totalBreakTime || 0);
        
        return `
            <tr>
                <td>${record.userName}</td>
                <td>${record.userDocument}</td>
                <td>${startTime.toLocaleDateString('es-CO')}</td>
                <td>${startTime.toLocaleTimeString('es-CO')}</td>
                <td>${endTime ? endTime.toLocaleTimeString('es-CO') : 'En progreso'}</td>
                <td>${workedHours}</td>
                <td>${breakTime}</td>
                                        <td>
                            <button onclick="viewRecordDetails(${record.userId}, '${record.startTime}')" 
                                    style="background: #17a2b8; font-size: 12px; padding: 5px 10px;">
                                Ver Detalles
                            </button>
                            <button onclick="exportUserRecords(${record.userId})" 
                                    style="background: #28a745; font-size: 12px; padding: 5px 10px; margin-left: 5px;">
                                Exportar
                            </button>
                        </td>
            </tr>
        `;
    }).join('');
}

function viewRecordDetails(userId, startTime) {
    const record = timeRecords.find(r => r.userId === userId && r.startTime === startTime);
    if (!record) return;
    
    let details = `Detalles del registro de ${record.userName}:\n\n`;
    details += `Fecha: ${new Date(record.startTime).toLocaleDateString('es-CO')}\n`;
    details += `Inicio: ${new Date(record.startTime).toLocaleTimeString('es-CO')}\n`;
    details += `Fin: ${record.endTime ? new Date(record.endTime).toLocaleTimeString('es-CO') : 'En progreso'}\n\n`;
    
    if (record.breaks && record.breaks.length > 0) {
        details += `Breaks tomados:\n`;
        record.breaks.forEach((breakItem, index) => {
            const breakStart = new Date(breakItem.startTime).toLocaleTimeString('es-CO');
            const breakEnd = breakItem.endTime ? new Date(breakItem.endTime).toLocaleTimeString('es-CO') : 'En progreso';
            const breakDuration = breakItem.endTime ? 
                formatTime(new Date(breakItem.endTime) - new Date(breakItem.startTime)) : 'En progreso';
            details += `  ${index + 1}. ${breakStart} - ${breakEnd} (${breakDuration})\n`;
        });
    }
    
    alert(details);
}

async function loadEvidenceList() {
    const evidenceList = document.getElementById('evidenceList');
    
    try {
        // Cargar evidencias desde Firebase
        const firebaseEvidences = await getEvidences();
        evidences = firebaseEvidences;
        
        const groupedEvidences = evidences.reduce((groups, evidence) => {
            const date = firestoreTimestampToDate(evidence.timestamp).toLocaleDateString('es-CO');
            if (!groups[date]) groups[date] = [];
            groups[date].push(evidence);
            return groups;
        }, {});
        
        evidenceList.innerHTML = Object.keys(groupedEvidences)
            .sort((a, b) => new Date(b) - new Date(a))
            .map(date => `
                <div style="margin-bottom: 30px;">
                    <h4 style="margin-bottom: 15px; color: #666;">📅 ${date}</h4>
                    <div class="evidence-preview">
                        ${groupedEvidences[date].map(evidence => `
                            <div class="evidence-item">
                                <img src="${evidence.data}" alt="${evidence.filename}" 
                                     onclick="showEvidenceModal('${evidence.id}')">
                                <div style="padding: 10px;">
                                    <p style="font-size: 12px; font-weight: bold;">${evidence.userName}</p>
                                    <p style="font-size: 11px; color: #666;">${evidence.note || 'Sin nota'}</p>
                                    <p style="font-size: 10px; color: #999;">
                                        ${firestoreTimestampToDate(evidence.timestamp).toLocaleTimeString('es-CO')}
                                    </p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
    } catch (error) {
        console.error('Error cargando evidencias:', error);
        evidenceList.innerHTML = '<p style="color: red;">Error cargando evidencias</p>';
    }
}

function showEvidenceModal(evidenceId) {
    const evidence = evidences.find(e => e.id == evidenceId);
    if (!evidence) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; align-items: center; 
        justify-content: center; z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; max-width: 90%; max-height: 90%; overflow: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3>Evidencia de ${evidence.userName}</h3>
                <button onclick="this.closest('div').remove()" 
                        style="background: #dc3545; padding: 5px 10px;">Cerrar</button>
            </div>
            <img src="${evidence.data}" alt="${evidence.filename}" 
                 style="max-width: 100%; height: auto; margin-bottom: 15px;">
            <p><strong>Archivo:</strong> ${evidence.filename}</p>
            <p><strong>Usuario:</strong> ${evidence.userName} (${evidence.userDocument})</p>
            <p><strong>Fecha:</strong> ${new Date(evidence.timestamp).toLocaleString('es-CO')}</p>
            <p><strong>Nota:</strong> ${evidence.note || 'Sin nota'}</p>
        </div>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
}

function exportToExcel() {
    const filterUser = document.getElementById('filterUser').value;
    const filterDate = document.getElementById('filterDate').value;
    const filterStartDate = document.getElementById('filterStartDate').value;
    const filterEndDate = document.getElementById('filterEndDate').value;
    
    let filteredRecords = timeRecords.filter(record => !record.isActive);
    
    if (filterUser) {
        filteredRecords = filteredRecords.filter(record => record.userId == filterUser);
    }
    
    if (filterDate) {
        const filterDateObj = new Date(filterDate);
        filteredRecords = filteredRecords.filter(record => {
            const recordDate = new Date(record.startTime);
            return recordDate.toDateString() === filterDateObj.toDateString();
        });
    }
    
    if (filterStartDate && filterEndDate) {
        const startDate = new Date(filterStartDate);
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        
        filteredRecords = filteredRecords.filter(record => {
            const recordDate = new Date(record.startTime);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }
    
    if (filteredRecords.length === 0) {
        alert('No hay registros para exportar con los filtros aplicados');
        return;
    }

    // Crear datos para Excel
    const excelData = [];
    
    // Encabezados
    excelData.push([
        'Usuario',
        'Documento',
        'Fecha',
        'Inicio Turno',
        'Fin Turno',
        'Horas Trabajadas',
        'Tiempo Break',
        'Total Breaks',
        'Detalle Breaks'
    ]);
    
    // Datos de registros
    filteredRecords.forEach(record => {
        const startTime = new Date(record.startTime);
        const endTime = record.endTime ? new Date(record.endTime) : null;
        const workedHours = record.workedTime ? formatTime(record.workedTime) : 'En progreso';
        const breakTime = formatTime(record.totalBreakTime || 0);
        
        let breaksDetail = '';
        let totalBreaks = 0;
        if (record.breaks && record.breaks.length > 0) {
            totalBreaks = record.breaks.length;
            breaksDetail = record.breaks.map((breakItem, index) => {
                const breakStart = new Date(breakItem.startTime).toLocaleTimeString('es-CO');
                const breakEnd = breakItem.endTime ? new Date(breakItem.endTime).toLocaleTimeString('es-CO') : 'En progreso';
                const breakDuration = breakItem.endTime ? 
                    formatTime(new Date(breakItem.endTime) - new Date(breakItem.startTime)) : 'En progreso';
                return `Break ${index + 1}: ${breakStart}-${breakEnd} (${breakDuration})`;
            }).join('; ');
        }
        
        excelData.push([
            record.userName,
            record.userDocument,
            startTime.toLocaleDateString('es-CO'),
            startTime.toLocaleTimeString('es-CO'),
            endTime ? endTime.toLocaleTimeString('es-CO') : 'En progreso',
            workedHours,
            breakTime,
            totalBreaks,
            breaksDetail
        ]);
    });

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Aplicar estilos a los encabezados
    ws['!cols'] = [
        { width: 20 }, // Usuario
        { width: 15 }, // Documento
        { width: 12 }, // Fecha
        { width: 12 }, // Inicio Turno
        { width: 12 }, // Fin Turno
        { width: 15 }, // Horas Trabajadas
        { width: 12 }, // Tiempo Break
        { width: 12 }, // Total Breaks
        { width: 50 }  // Detalle Breaks
    ];
    
    // Agregar el worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Registros Horarios');
    
    // Crear hoja de resumen
    const summaryData = createSummarySheet(filteredRecords);
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
    
    // Generar nombre del archivo con fecha
    const fileName = `reporte_panaderia_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Descargar el archivo Excel
    XLSX.writeFile(wb, fileName);
}

function createSummarySheet(records) {
    const summary = [];
    
    // Encabezados del resumen
    summary.push(['Resumen de Registros Horarios']);
    summary.push([]);
    summary.push(['Usuario', 'Total Horas', 'Total Breaks', 'Promedio por Día', 'Último Registro']);
    
    // Agrupar por usuario
    const userStats = {};
    
    records.forEach(record => {
        if (!userStats[record.userId]) {
            userStats[record.userId] = {
                name: record.userName,
                totalHours: 0,
                totalBreaks: 0,
                records: 0,
                lastRecord: null
            };
        }
        
        if (record.workedTime) {
            userStats[record.userId].totalHours += record.workedTime;
        }
        
        if (record.breaks) {
            userStats[record.userId].totalBreaks += record.breaks.length;
        }
        
        userStats[record.userId].records++;
        
        const recordDate = new Date(record.startTime);
        if (!userStats[record.userId].lastRecord || recordDate > new Date(userStats[record.userId].lastRecord)) {
            userStats[record.userId].lastRecord = record.startTime;
        }
    });
    
    // Agregar datos al resumen
    Object.values(userStats).forEach(stats => {
        const avgHours = stats.records > 0 ? formatTime(stats.totalHours / stats.records) : '00:00:00';
        const lastRecord = stats.lastRecord ? new Date(stats.lastRecord).toLocaleDateString('es-CO') : 'N/A';
        
        summary.push([
            stats.name,
            formatTime(stats.totalHours),
            stats.totalBreaks,
            avgHours,
            lastRecord
        ]);
    });
    
    return summary;
}

function exportUserRecords(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        alert('Usuario no encontrado');
        return;
    }
    
    const userRecords = timeRecords.filter(record => 
        record.userId === userId && !record.isActive
    );
    
    if (userRecords.length === 0) {
        alert('No hay registros para este usuario');
        return;
    }
    
    // Crear datos para Excel
    const excelData = [];
    
    // Encabezados
    excelData.push([
        'Fecha',
        'Inicio Turno',
        'Fin Turno',
        'Horas Trabajadas',
        'Tiempo Break',
        'Total Breaks',
        'Detalle Breaks'
    ]);
    
    // Datos de registros
    userRecords.forEach(record => {
        const startTime = new Date(record.startTime);
        const endTime = record.endTime ? new Date(record.endTime) : null;
        const workedHours = record.workedTime ? formatTime(record.workedTime) : 'En progreso';
        const breakTime = formatTime(record.totalBreakTime || 0);
        
        let breaksDetail = '';
        let totalBreaks = 0;
        if (record.breaks && record.breaks.length > 0) {
            totalBreaks = record.breaks.length;
            breaksDetail = record.breaks.map((breakItem, index) => {
                const breakStart = new Date(breakItem.startTime).toLocaleTimeString('es-CO');
                const breakEnd = breakItem.endTime ? new Date(breakItem.endTime).toLocaleTimeString('es-CO') : 'En progreso';
                const breakDuration = breakItem.endTime ? 
                    formatTime(new Date(breakItem.endTime) - new Date(breakItem.startTime)) : 'En progreso';
                return `Break ${index + 1}: ${breakStart}-${breakEnd} (${breakDuration})`;
            }).join('; ');
        }
        
        excelData.push([
            startTime.toLocaleDateString('es-CO'),
            startTime.toLocaleTimeString('es-CO'),
            endTime ? endTime.toLocaleTimeString('es-CO') : 'En progreso',
            workedHours,
            breakTime,
            totalBreaks,
            breaksDetail
        ]);
    });

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Aplicar estilos
    ws['!cols'] = [
        { width: 12 }, // Fecha
        { width: 12 }, // Inicio Turno
        { width: 12 }, // Fin Turno
        { width: 15 }, // Horas Trabajadas
        { width: 12 }, // Tiempo Break
        { width: 12 }, // Total Breaks
        { width: 50 }  // Detalle Breaks
    ];
    
    // Agregar el worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, `Registros ${user.name}`);
    
    // Crear hoja de resumen personal
    const summaryData = createUserSummarySheet(userRecords, user);
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen Personal');
    
    // Generar nombre del archivo
    const fileName = `registros_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Descargar el archivo Excel
    XLSX.writeFile(wb, fileName);
}

function createUserSummarySheet(records, user) {
    const summary = [];
    
    // Encabezados del resumen
    summary.push([`Resumen de Registros - ${user.name}`]);
    summary.push([]);
    summary.push(['Período', 'Total Horas', 'Total Breaks', 'Promedio por Día']);
    
    // Calcular estadísticas
    let totalHours = 0;
    let totalBreaks = 0;
    let totalDays = 0;
    
    records.forEach(record => {
        if (record.workedTime) {
            totalHours += record.workedTime;
        }
        if (record.breaks) {
            totalBreaks += record.breaks.length;
        }
        totalDays++;
    });
    
    const avgHours = totalDays > 0 ? formatTime(totalHours / totalDays) : '00:00:00';
    
    // Agregar datos al resumen
    summary.push([
        'Total General',
        formatTime(totalHours),
        totalBreaks,
        avgHours
    ]);
    
    // Agregar estadísticas por mes
    const monthlyStats = {};
    records.forEach(record => {
        const month = new Date(record.startTime).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });
        if (!monthlyStats[month]) {
            monthlyStats[month] = { hours: 0, breaks: 0, days: 0 };
        }
        
        if (record.workedTime) {
            monthlyStats[month].hours += record.workedTime;
        }
        if (record.breaks) {
            monthlyStats[month].breaks += record.breaks.length;
        }
        monthlyStats[month].days++;
    });
    
    Object.entries(monthlyStats).forEach(([month, stats]) => {
        const avgHours = stats.days > 0 ? formatTime(stats.hours / stats.days) : '00:00:00';
        summary.push([month, formatTime(stats.hours), stats.breaks, avgHours]);
    });
    
    return summary;
}

// Funciones de utilidad
function formatTime(milliseconds) {
    if (!milliseconds || milliseconds < 0) return '00:00:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showAlert(element, message, type) {
    if (!message) {
        element.innerHTML = '';
        return;
    }
    
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    element.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    
    setTimeout(() => {
        element.innerHTML = '';
    }, 5000);
}

// Event listeners adicionales
document.getElementById('loginDocument').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') login();
});

document.getElementById('adminDocument').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') adminLogin();
});

// Los datos de ejemplo ahora se crean automáticamente en Firebase
// cuando no hay usuarios en la base de datos 